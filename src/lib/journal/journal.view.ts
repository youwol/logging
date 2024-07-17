import { VirtualDOM, ChildrenLike, AnyVirtualDOM } from '@youwol/rx-vdom'
import { BehaviorSubject, from } from 'rxjs'
import { ImmutableTree, ObjectJs } from '@youwol/rx-tree-views'
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

export class JournalView implements VirtualDOM<'div'> {
    static defaultOptions: OptionsJournalView = {
        containerClass: 'd-flex flex-column',
        containerStyle: { 'min-height': '0px' },
    }
    public readonly tag = 'div'
    public readonly state: JournalState
    public readonly dataViewsFactory: DataViewsFactory
    public readonly class: string
    public readonly style: { [key: string]: string }
    public readonly children: ChildrenLike

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
            {
                source$: pageSelected$,
                vdomMap: (page: Page) => {
                    return this.pageView(page)
                },
            },
        ]
    }

    noJournalsAvailableView(): VirtualDOM<'div'> {
        return {
            tag: 'div',
            innerText:
                'The module does not contains journals yet, it is likely that it did not run already.',
        }
    }

    selectJournalView(
        journalSelected$: BehaviorSubject<Page>,
    ): VirtualDOM<'div'> {
        const items = this.state.journal.pages

        return {
            tag: 'div',
            class: 'd-flex align-items-center py-2',
            children: [
                {
                    tag: 'div',
                    innerText: 'Available pages:',
                },
                { tag: 'div', class: 'mx-1' },
                {
                    tag: 'select',
                    children: items.map((page, i) => ({
                        tag: 'option' as const,
                        innerText: page.title,
                        value: `${i}`,
                    })),
                    onchange: (ev: MouseEvent) =>
                        journalSelected$.next(items[ev.target['value']]),
                } as VirtualDOM<'select'>,
            ],
        }
    }

    pageView(page: Page): VirtualDOM<'div'> {
        const state = new ContextState({
            context: page.entryPoint,
            expandedNodes: [page.entryPoint.id],
        })
        return {
            tag: 'div',
            class: 'h-100 d-flex flex-column',
            children: [
                {
                    tag: 'div',
                    class: 'd-flex align-items-center justify-content-center',
                    children: [
                        {
                            tag: 'i',
                            class: 'fas fa-newspaper fa-2x px-3',
                        },
                        {
                            tag: 'div',
                            class: 'text-center py-2',
                            style: {
                                fontFamily: 'fantasy' as const,
                                fontSize: 'larger',
                            },
                            innerText: page.title,
                        },
                    ],
                },
                new ContextView({
                    state,
                    dataViewsFactory: this.dataViewsFactory,
                    options: {
                        containerClass: 'flex-grow-1 overflow-auto',
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

class LogNodeInfo extends LogNodeBase {}

class LogNodeWarning extends LogNodeBase {}

class LogNodeError extends LogNodeBase {}

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
            rootNode: nodeFactory(context),
            expandedNodes,
        })
        this.rootCtx = context
        this.context = context
        this.tStart = this.rootCtx.startTimestamp
        this.tEnd = this.rootCtx.startTimestamp + this.rootCtx.elapsed()
        selectedNode && this.selectedNode$.next(this.getNode(selectedNode))
    }
}

export class ContextView implements VirtualDOM<'div'> {
    static defaultOptions = {
        containerClass: 'p-2',
        containerStyle: { width: '100%', height: '100%' },
        treeViewClass: 'h-100 overflow-auto',
        treeViewStyle: {},
    }
    public readonly tag = 'div'
    public readonly domId: string = 'contextView-view'
    public readonly state: ContextState
    public readonly children: ChildrenLike
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
            ...(options || {}),
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
                    header: 'd-flex align-items-baseline fv-tree-header',
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
): VirtualDOM<'div'> {
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
            [ContextStatus.FAILED]: 'fas fa-times text-danger',
            [ContextStatus.SUCCESS]: 'fas fa-check text-success',
            [ContextStatus.RUNNING]: 'fas fa-cog fa-spin',
        }
        return {
            tag: 'div',
            class: 'w-100 pb-2',
            children: [
                {
                    tag: 'div',
                    class: 'd-flex align-items-center',
                    children: [
                        {
                            tag: 'i',
                            class: classes[node.context.status()],
                        },
                        {
                            tag: 'div',
                            innerText: node.context.title + `  - ${elapsed} ms`,
                            class: 'fv-pointer px-2',
                            style: { fontFamily: 'fantasy' as const },
                        },
                    ],
                },
                {
                    tag: 'div',
                    class: 'bg-success',
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

        let classes = 'fas fa-info     '

        if (node instanceof LogNodeError) {
            classes = 'text-danger fas fa-times'
        }
        if (node instanceof LogNodeWarning) {
            classes = 'text-warning fas fa-exclamation'
        }
        return {
            tag: 'div',
            class: 'pb-1 fv-pointer w-100',
            children: [
                {
                    tag: 'div',
                    class: 'd-flex align-items-center',
                    children: [
                        {
                            tag: 'div',
                            class: classes,
                        },
                        {
                            tag: 'div',
                            innerText: node.log.text,
                            class: 'px-2',
                        },
                    ],
                },
                {
                    tag: 'div',
                    class: 'bg-success rounded',
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
                tag: 'div',
                class: 'd-flex flex-grow-1',
                style: { whiteSpace: 'nowrap', minWidth: '0px' },
                children: views.map((view: AnyVirtualDOM) => {
                    return view instanceof Promise
                        ? {
                              source$: from(view),
                              vdomMap: (v: AnyVirtualDOM) => v,
                          }
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
            tag: 'div',
            children: [new ObjectJs.View({ state: dataState })],
        }
    }
    return {
        tag: 'div',
        innerText: 'unknown type',
    }
}
