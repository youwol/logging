import { Subject } from 'rxjs'

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0,
                v = c == 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        },
    )
}

/**
 * ## Log
 *
 * Base class for the concrete types (e.g. [[ErrorLog]], [[WarningLog]] and [[InfoLog]]).
 *
 */
export class Log {
    public readonly type: 'Log' | 'ErrorLog' | 'WarningLog' | 'InfoLog' = 'Log'

    /**
     * timestamp corresponding to the instance construction
     */
    public readonly timestamp = performance.now()

    /**
     * uuid
     */
    public readonly id = uuidv4()

    /**
     *
     * @param context parent context
     * @param text description of the log
     * @param data associated data
     */
    constructor(
        public readonly context: Context,
        public readonly text: string,
        public readonly data?: unknown,
    ) {}

    /**
     *
     * @param from reference timestamp
     * @returns [[timestamp]] - from
     */
    elapsed(from) {
        return this.timestamp - from
    }
}

/**
 * ## ErrorLog
 *
 * Class specialization of  [[Log]] for errors.
 */
export class ErrorLog<TError extends Error, TData = unknown> extends Log {
    public readonly type = 'ErrorLog'

    constructor(
        context: Context,
        public readonly error: TError,
        data: TData,
    ) {
        super(context, error.message, data)
    }
}

/**
 * ## WarningLog
 *
 * Class specialization of [[Log]] for warnings.
 */
export class WarningLog extends Log {
    public readonly type = 'WarningLog'

    constructor(
        context: Context,
        public readonly text: string,
        data: unknown,
    ) {
        super(context, text, data)
    }
}

/**
 * ## InfoLog
 *
 * Class specialization of [[Log]] for info.
 */
export class InfoLog extends Log {
    public readonly type = 'InfoLog'

    constructor(
        context: Context,
        public readonly text: string,
        data: unknown,
    ) {
        super(context, text, data)
    }
}

/**
 * ## LogChannel
 *
 * The class LogChannel allows to broadcast Log to multiple
 * destinations using a user defined filtering (selection of logs)
 * and mapping (transformation of selected logs before emission).
 *
 * This class is a companion of [[Context]].
 */
export class LogChannel<T = unknown> {
    /**
     * User defined function that return whether a [[Log]] should be broad-casted
     */
    filter: (data: Log) => boolean

    /**
     * User defined function that, if provided, transform the selected logs into
     * a target type of message. If not provided at construction the function
     * identity is used.
     */
    map: (data: Log) => T

    /**
     * A list of consumers of the messages as RxJs subjects
     */
    pipes: Array<Subject<T>>

    /**
     *
     * @param filter  see [[filter]]
     * @param map  see [[map]]
     * @param pipes  see [[pipes]]
     */
    constructor({
        filter,
        map,
        pipes,
    }: {
        filter: (data: Log) => boolean
        map?: (data: Log) => T
        pipes: Array<Subject<T>>
    }) {
        this.filter = filter
        this.map = map == undefined ? (d) => d as unknown as T : map
        this.pipes = pipes
    }

    /**
     * If *this.filter(log)* -> dispatches *this.map(log)* to all subjects
     * @param log candidate log
     */
    dispatch(log: Log) {
        if (this.filter(log)) {
            this.pipes.forEach((pipe) => {
                pipe.next(this.map(log))
            })
        }
    }
}

export enum ContextStatus {
    SUCCESS = 'success',
    RUNNING = 'running',
    FAILED = 'failed',
}

/**
 * Trait for logging using context.
 */
export interface ContextLoggerTrait {
    error(error: Error, data?: unknown)

    warning(text: string, data?: unknown)

    info(text: string, data?: unknown)

    withChild<T>(
        title: string,
        callback: (context: ContextLoggerTrait) => T,
        withUserInfo?: { [key: string]: unknown },
    ): T

    withChildAsync<T>(
        title: string,
        callback: (context: Context) => Promise<T>,
        withUserInfo?: { [key: string]: unknown },
    ): Promise<T>

    startChild: (
        title: string,
        withUserInfo?: { [key: string]: unknown },
    ) => ContextLoggerTrait

    end(): void
    terminate(): void
}

/**
 * Trait for reporting using context.
 */
export interface ContextReportedTrait {
    children: (Context | Log)[]
    id: string
    startTimestamp: number
    elapsed(from?: number): number | undefined
}

/**
 * ## Context
 *
 * Context objects are used to essentially track the execution flow of some processing
 * functions, essentially to:
 * -    enable meaningful reporting of execution (see also [[Journal]])
 * -    understand the bottleneck in terms of performances
 * -    enable [[Log]] broadcasting to multiple destinations
 *
 * Context can be used in synchronous or asynchronous scenarios.
 *
 * The difference between sync. and async. scenario is whether it is needed to call
 * *context.close*:
 * -    for synchronous cases, the Context class provide the method [[withChild]], the developer is not
 * in charge to *start* or *end* the child context as it is automatically managed.
 * If an error is thrown and not caught during the callback execution, the child context end (along with its parents),
 * the error is reported in the child context, and finally the error is re-thrown.
 * -    for asynchronous cases, the Context class provides the method [[startChild]],
 * it is then the developer responsibility to call the method [[end]] at the right time, and
 * to deal with eventual exceptions.
 *
 * The natural representation of a context,  is a tree view
 * representing the chain of function calls. The children of a context can be of two types:
 * -    [[Log]] : an element of log, either [[InfoLog]], [[WarningLog]] or [[ErrorLog]]
 * -    [[Context]] : a child context
 *
 */
export class Context implements ContextLoggerTrait, ContextReportedTrait {
    public readonly type = 'Context'

    /**
     * Context's children
     */
    children = new Array<Context | Log>()

    /**
     * [[uuidv4]]
     */
    id = uuidv4()

    /**
     * timestamp corresponding to the instance creation
     */
    public readonly startTimestamp = performance.now()

    private endTimestamp: number

    /**
     *
     * @param title title of the context
     * @param userContext user-context
     * @param channels$ broadcasting channels
     * @param parent parent context if not root
     */
    constructor(
        public readonly title: string,
        public userContext: { [key: string]: unknown },
        public readonly channels$: Array<LogChannel> = [],
        public readonly parent = undefined,
    ) {}

    /**
     * Start a new child context, supposed to be used in asynchronous scenarios.
     *
     * The attribute *userContext* of the child context  is a clone of the parent's user-context, eventually
     * merged with provided *withUserContext*. *withUserContext* is needed for very specific cases, usually
     * there is no need to provide one.
     *
     * @param title title of the child context
     * @param withUserContext user context entries to add
     * @returns the child context
     */
    startChild(
        title: string,
        withUserContext: { [key: string]: unknown } = {},
    ): Context {
        const childCtx = new Context(
            title,
            { ...this.userContext, ...withUserContext },
            this.channels$,
            this,
        )
        this.children.push(childCtx)
        return childCtx
    }

    /**
     * Wrap a new child context around a callback, supposed to be used in synchronous scenarios.
     * In this case the developer does not need to handle *start* or *end* of the child context.
     *
     * The attribute *userContext* of the child context is a clone of the parent's user-context, eventually
     * merged with provided *withUserInfo*.
     *
     * If an error is thrown and not caught during the callback execution, the child context end (along with its parents),
     * the error is reported in the child context, and finally the error is re-thrown.
     *
     * @param title title of the child context
     * @param callback the callback, the child context is provided as argument of the callback
     * @param withUserInfo user context entries to add
     * @returns the child context
     */
    withChild<T>(
        title: string,
        callback: (context: Context) => T,
        withUserInfo: { [key: string]: unknown } = {},
    ): T {
        const childContext = this.appendChildContext(title, withUserInfo)
        try {
            const result = callback(childContext)
            childContext.end()
            return result
        } catch (error) {
            this.onScopeError(error, childContext)
        }
    }

    /**
     * Async version of {@link withChild}
     */
    async withChildAsync<T>(
        title: string,
        callback: (context: Context) => Promise<T>,
        withUserInfo: { [key: string]: unknown } = {},
    ): Promise<T> {
        const childContext = this.appendChildContext(title, withUserInfo)
        try {
            const result = await callback(childContext)
            childContext.end()
            return result
        } catch (error) {
            this.onScopeError(error, childContext)
        }
    }

    /**
     *
     * @returns the root context of the tree
     */
    root(): Context {
        return this.parent ? this.parent.root() : this
    }

    /**
     * Log an [[ErrorLog]].
     *
     * @param error the error
     * @param data some data to log with the error
     */
    error(error: Error, data?: unknown) {
        this.addLog(new ErrorLog(this, error, data))
    }

    /**
     * Log a [[WarningLog]].
     *
     * @param text description of the warning
     * @param data some data to log with the warning
     */
    warning(text: string, data?: unknown) {
        this.addLog(new WarningLog(this, text, data))
    }

    /**
     * Log an [[InfoLog]].
     *
     * @param text info
     * @param data some data to log with the info
     */
    info(text: string, data?: unknown) {
        this.addLog(new InfoLog(this, text, data))
    }

    /**
     * End the context manually when [[startChild]] has been
     * used to create it (in contrast to [[withChild]]).
     *
     * Used for asynchronous scenarios.
     */
    end() {
        this.endTimestamp = performance.now()
    }

    /**
     * Call [[end]] on this context, and call [[terminate]] on the parent
     */
    terminate() {
        this.end()
        this.parent?.terminate()
    }

    /**
     * @param from a reference timestamp, use this.[[startTimestamp]] if not provided
     * @returns Either the 'true' elapsed time of this context if it has ended or the maximum
     * [[elapsed]](this.startTimestamp) of the children (recursive lookup)
     */
    elapsed(from?: number): number | undefined {
        from = from || this.startTimestamp

        const getElapsedRec = (from: number, current: Context) => {
            if (current.endTimestamp) {
                return current.endTimestamp - from
            }
            const maxi = current.children
                .map((child: Context | Log) => child.elapsed(from))
                .filter((elapsed) => elapsed != undefined)
                .reduce((acc, e) => (e > acc ? e : acc), -1)
            return maxi == -1 ? undefined : maxi
        }
        return getElapsedRec(from, this)
    }

    /**
     *
     * @returns whether the context is [[ContextStatus.RUNNING]], [[ContextStatus.SUCCESS]]
     * or [[ContextStatus.FAILED]]
     */
    status(): ContextStatus {
        const isErrorRec = (ctx: Context) => {
            return (
                ctx.children.find((child) => child instanceof ErrorLog) !=
                    undefined ||
                ctx.children
                    .filter((child) => child instanceof Context)
                    .find((child: Context) => isErrorRec(child)) != undefined
            )
        }

        if (isErrorRec(this)) {
            return ContextStatus.FAILED
        }

        if (this.endTimestamp != undefined) {
            return ContextStatus.SUCCESS
        }

        return ContextStatus.RUNNING
    }

    private addLog(log: Log) {
        this.children.push(log)
        this.channels$.forEach((channel) => channel.dispatch(log))
    }

    private onScopeError(error, context: Context) {
        context.error(error, error.data || error.status)
        context.end()
        throw error
    }

    private appendChildContext(
        title: string,
        withUserInfo: { [key: string]: unknown },
    ) {
        const childContext = new Context(
            title,
            { ...this.userContext, ...withUserInfo },
            this.channels$,
            this,
        )
        this.children.push(childContext)
        return childContext
    }
}

export const NoContext: ContextLoggerTrait = {
    error: (_error: Error, _data?: unknown) => {
        /**No op*/
    },
    warning: (_text: string, _data?: unknown) => {
        /**No op*/
    },
    info: (_text: string, _data?: unknown) => {
        /**No op*/
    },

    withChild: <T>(
        _title: string,
        callback: (context) => T,
        _withUserInfo?: { [key: string]: unknown },
    ) => {
        return callback(NoContext)
    },

    withChildAsync: <T>(
        _title: string,
        callback: (context) => T,
        _withUserInfo?: { [key: string]: unknown },
    ) => {
        return callback(NoContext)
    },

    startChild: (_title: string, _withUserInfo: { [key: string]: unknown }) =>
        NoContext,

    end: () => {
        /*no op*/
    },
    terminate: () => {
        /*no op*/
    },
}
