import { child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, from } from 'rxjs'
import { ImmutableTree, ObjectJs } from '@youwol/fv-tree'
import { Context, ContextStatus, uuidv4, Log } from '../context'
import {
    DataViewsFactory,
    OptionsContextView,
    Journal,
    OptionsJournalView,
    Page,
} from './types'

export class JournalState {
    public readonly journal: Journal

    constructor(params: { journal: Journal }) {
        Object.assign(this, params)
    }
}

export class JournalView implements VirtualDOM {
    static defaultOptions: OptionsJournalView = {
        containerClass: 'd-flex flex-column p-3',
        containerStyle: { 'min-height': '0px' },
    }

    public readonly state: JournalState
    public readonly dataViewsFactory: DataViewsFactory
    public readonly class: string
    public readonly style: { [key: string]: string }
    public readonly children: Array<VirtualDOM>

    connectedCallback: (elem) => void

    constructor({
        state,
        dataViewsFactory,
        ...rest
    }: {
        state: JournalState
        dataViewsFactory?: DataViewsFactory
    }) {
        Object.assign(this, rest)
        this.state = state
        this.dataViewsFactory = dataViewsFactory || []
        this.class = this.class || JournalView.defaultOptions.containerClass
        this.style = this.style || JournalView.defaultOptions.containerStyle
        if (this.state.journal.pages.length == 0) {
            this.children = [this.noJournalsAvailableView()]
            return
        }
        if (this.state.journal.pages.length == 1) {
            this.children = [this.pageView(this.state.journal.pages[0])]
            return
        }

        const pageSelected$ = new BehaviorSubject<Page>(
            this.state.journal.pages[0],
        )
        this.children = [
            this.selectJournalView(pageSelected$),
            child$(pageSelected$, (page: Page) => {
                return this.pageView(page)
            }),
        ]
    }

    noJournalsAvailableView(): VirtualDOM {
        return {
            innerText:
                'The module does not contains journals yet, it is likely that it did not run already.',
        }
    }

    selectJournalView(journalSelected$: BehaviorSubject<Page>): VirtualDOM {
        const items = this.state.journal.pages

        return {
            class: 'd-flex align-items-center py-2',
            children: [
                { innerText: 'Available pages:', class: 'px-2' },
                {
                    tag: 'select',
                    children: items.map((page, i) => ({
                        tag: 'option',
                        innerText: page.title,
                        value: i,
                    })),
                    onchange: (ev) =>
                        journalSelected$.next(items[ev.target.value]),
                },
            ],
        }
    }

    pageView(page: Page): VirtualDOM {
        const state = new ContextState({
            context: page.entryPoint,
            expandedNodes: [page.entryPoint.id],
        })
        return {
            class: 'h-100 d-flex flex-column',
            children: [
                {
                    class: 'd-flex align-items-center justify-content-center',
                    children: [
                        {
                            tag: 'i',
                            class: 'fas fa-newspaper fa-2x px-3',
                        },
                        {
                            class: 'text-center py-2',
                            style: {
                                'font-family': 'fantasy',
                                'font-size': 'larger',
                            },
                            innerText: page.title,
                        },
                    ],
                },
                new ContextView({
                    state,
                    dataViewsFactory: this.dataViewsFactory,
                    options: {
                        containerClass: 'p-4 flex-grow-1 overflow-auto',
                    },
                }),
            ],
        }
    }
}

function nodeFactory(node: Context | Log): NodeBase {
    if (node.type == 'Context') {
        return new ContextNode({ context: node })
    }
    if (node.type == 'ErrorLog') {
        return new LogNodeError({ log: node })
    }
    if (node.type == 'WarningLog') {
        return new LogNodeWarning({ log: node })
    }
    if (node.type == 'InfoLog') {
        return new LogNodeInfo({ log: node })
    }
}

class NodeBase extends ImmutableTree.Node {
    constructor({
        id,
        children,
    }: {
        id: string
        children?: Array<NodeBase> | undefined
    }) {
        super({ id, children })
    }
}

class ContextNode extends NodeBase {
    public readonly context: Context
    constructor({ context }: { context: Context }) {
        super({
            id: context.id,
            children: context.children.map((node) => nodeFactory(node)),
        })
        this.context = context
    }
}

class DataNodeBase extends NodeBase {
    public readonly data: unknown

    constructor({ data }: { data: unknown }) {
        super({ id: uuidv4() })
        this.data = data
    }
}

class LogNodeBase extends NodeBase {
    public readonly log: Log

    constructor({ log }: { log: Log }) {
        super({
            id: log.id,
            children:
                log.data != undefined
                    ? [new DataNodeBase({ data: log.data })]
                    : undefined,
        })
        this.log = log
    }
}

class LogNodeInfo extends LogNodeBase {
    constructor(d) {
        super(d)
    }
}

class LogNodeWarning extends LogNodeBase {
    constructor(d) {
        super(d)
    }
}

class LogNodeError extends LogNodeBase {
    constructor(d) {
        super(d)
    }
}

export class ContextState extends ImmutableTree.State<NodeBase> {
    public readonly tStart: number
    public readonly tEnd: number
    public readonly context: Context
    public readonly rootCtx: Context

    constructor({
        context,
        expandedNodes,
        selectedNode,
    }: {
        context: Context
        expandedNodes: Array<string>
        selectedNode?: string
    }) {
        super({
            rootNode: nodeFactory(context.root()),
            expandedNodes,
        })
        this.rootCtx = context.root()
        this.context = context
        this.tStart = this.rootCtx.startTimestamp
        this.tEnd = this.rootCtx.startTimestamp + this.rootCtx.elapsed()
        selectedNode && this.selectedNode$.next(this.getNode(selectedNode))
    }
}

export class ContextView implements VirtualDOM {
    static defaultOptions = {
        containerClass: 'p-4 fv-bg-background fv-text-primary',
        containerStyle: { width: '100%', height: '100%' },
        treeViewClass: 'h-100 overflow-auto',
        treeViewStyle: {},
    }
    public readonly domId: string = 'contextView-view'
    public readonly state: ContextState
    public readonly children: Array<VirtualDOM>
    public readonly dataViewsFactory: DataViewsFactory
    public readonly class: string
    public readonly style: { [key: string]: string }

    constructor({
        state,
        dataViewsFactory,
        options,
        ...rest
    }: {
        state: ContextState
        dataViewsFactory?: DataViewsFactory
        options?: OptionsContextView
    }) {
        Object.assign(this, rest)
        this.state = state
        this.dataViewsFactory = dataViewsFactory || []
        const styling: OptionsContextView = {
            ...ContextView.defaultOptions,
            ...(options ? options : {}),
        }
        this.class = styling.containerClass
        this.style = styling.containerStyle

        const treeView = new ImmutableTree.View({
            state,
            headerView: (state: ContextState, node) =>
                headerView(state, node, this.dataViewsFactory),
            class: styling.treeViewClass,
            style: styling.treeViewStyle,
            options: {
                classes: {
                    header: 'd-flex align-items-baseline fv-tree-header fv-hover-bg-background-alt ',
                },
            },
        })

        this.children = [treeView]
    }
}

function headerView(
    state: ContextState,
    node: NodeBase,
    dataViewsFactory: DataViewsFactory,
) {
    const heightBar = '3px'
    const sizePoint = '5px'
    if (node instanceof ContextNode) {
        const tStart =
            node.context.startTimestamp - state.rootCtx.startTimestamp
        const left = (100 * tStart) / (state.tEnd - state.tStart)
        const width =
            (100 * node.context.elapsed()) / (state.tEnd - state.tStart)
        const elapsed = Math.floor(100 * node.context.elapsed()) / 100
        const classes = {
            [ContextStatus.FAILED]: 'fas fa-times fv-text-error',
            [ContextStatus.SUCCESS]: 'fas fa-check fv-text-success',
            [ContextStatus.RUNNING]: 'fas fa-cog fa-spin',
        }
        return {
            class: 'w-100 pb-2',
            children: [
                {
                    class: 'd-flex align-items-center',
                    children: [
                        {
                            tag: 'i',
                            class: classes[node.context.status()],
                        },
                        {
                            innerText: node.context.title + `  - ${elapsed} ms`,
                            class: 'fv-pointer px-2',
                            style: { 'font-family': 'fantasy' },
                        },
                    ],
                },
                {
                    class: 'fv-bg-success',
                    style: {
                        top: '0px',
                        height: heightBar,
                        width: width + '%',
                        position: 'absolute',
                        left: left + '%',
                    },
                },
            ],
        }
    }
    if (node instanceof LogNodeBase) {
        const tStart = node.log.timestamp - state.rootCtx.startTimestamp
        const left = (100 * tStart) / (state.tEnd - state.tStart)

        let classes = 'fv-text-primary fas fa-info'

        if (node instanceof LogNodeError) {
            classes = 'fv-text-error fas fa-times'
        }
        if (node instanceof LogNodeWarning) {
            classes = 'fv-text-focus fas fa-exclamation'
        }
        return {
            class: 'pb-1 fv-pointer w-100',
            children: [
                {
                    class: 'd-flex align-items-center',
                    children: [
                        { class: classes },
                        { innerText: node.log.text, class: 'px-2' },
                    ],
                },
                {
                    class: 'fv-bg-success rounded',
                    style: {
                        height: sizePoint,
                        width: sizePoint,
                        top: '0px',
                        position: 'absolute',
                        left: `calc( ${left}% - 5px)`,
                    },
                },
            ],
        }
    }
    if (node instanceof DataNodeBase) {
        const views = dataViewsFactory
            .filter((factory) => factory.isCompatible(node.data))
            .map((factory) => factory.view(node.data))

        if (views.length > 0) {
            return {
                class: 'd-flex flex-grow-1',
                style: { 'white-space': 'nowrap', 'min-width': '0px' },
                children: views.map((view) => {
                    view instanceof Promise
                        ? child$(from(view), (v) => v)
                        : view
                }),
            }
        }

        const dataState = new ObjectJs.State({
            title: '',
            data: node.data,
            expandedNodes: ['_0'],
        })
        return {
            children: [new ObjectJs.View({ state: dataState })],
        }
    }
    return { innerText: 'unknown type' }
}
