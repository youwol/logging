import { LoggerContext } from './factory'

export const levels = [
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'fatal',
    'alert',
] as const

export type Level = typeof levels[number]

export interface Logger {
    debug(message: string, ...messageArgs: MessageArg<unknown>[]): void

    info(message: string, ...messageArgs: MessageArg<unknown>[]): void

    notice(message: string, ...messageArgs: MessageArg<unknown>[]): void

    warning(message: string, ...messageArgs: MessageArg<unknown>[]): void

    error(message: string, ...messageArgs: MessageArg<unknown>[]): void

    fatal(message: string, ...messageArgs: MessageArg<unknown>[]): void

    alert(message: string, ...messageArgs: MessageArg<unknown>[]): void

    getChildLogger(name: string): Logger
}

type LogFn = (
    level: Level,
    message: string,
    messageArgs: MessageArg<unknown>[],
    context: LoggerContext,
) => void

export type Backend = {
    id: string
    logFn: LogFn
}

export type MessageArg<TypeValue> =
    | string
    | boolean
    | number
    | string[]
    | boolean[]
    | number[]
    | (() => string)
    | (() => boolean)
    | (() => number)
    | (() => string[])
    | (() => boolean[])
    | (() => number[])
    | (() => TypeValue)
    | MessageArgWrapped<TypeValue>

export type MessageArgWrapped<TypeValue> =
    | MessageArgCallback<TypeValue>
    | MessageArgValue<TypeValue>

export interface IMessageArgWrapped<TypeValue> {
    dump?: boolean
    asString?: (v: TypeValue) => string
}

export interface MessageArgValue<TypeValue>
    extends IMessageArgWrapped<TypeValue> {
    value: TypeValue
}

export interface MessageArgCallback<TypeValue>
    extends IMessageArgWrapped<TypeValue> {
    cb: () => TypeValue
}

export function isMessageArgCallback<TypeValue>(
    messageArg: MessageArg<TypeValue>,
): messageArg is MessageArgCallback<TypeValue> {
    return (
        typeof messageArg === 'object' &&
        Object.getOwnPropertyNames(messageArg).includes('cb')
    )
}

export function isMessageArgValue<TypeValue>(
    messageArg: MessageArg<TypeValue>,
): messageArg is MessageArgValue<TypeValue> {
    return (
        typeof messageArg === 'object' &&
        Object.getOwnPropertyNames(messageArg).includes('value')
    )
}

export function isMessageArgWrapped<TypeValue>(
    messageArg: MessageArg<TypeValue>,
): messageArg is MessageArgWrapped<TypeValue> {
    return isMessageArgValue(messageArg) || isMessageArgCallback(messageArg)
}
