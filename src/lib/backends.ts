import {
    Backend,
    isMessageArgCallback,
    isMessageArgValue,
    isMessageArgWrapped,
    MessageArg,
    MessageArgValue,
} from './logging'

export const backendConsole: Backend = {
    id: 'CONSOLE',
    logFn: (level, messageWithPlaceHolders, messageArgs, context) => {
        const { message, dumpValues } = prepareMessage(
            messageWithPlaceHolders,
            messageArgs,
        )
        const date = new Date().toISOString()
        const finalLine = `[${date}][${level}] ${context.path} : ${message}`

        switch (level) {
            case 'debug':
            case 'info':
            case 'notice':
                console.log(finalLine, ...dumpValues)
                break
            case 'warning':
                console.warn(finalLine, ...dumpValues)
                break
            default:
                console.error(finalLine, ...dumpValues)
        }
    },
}

export function prepareMessage(
    message: string,
    messageArgs: MessageArg<unknown>[],
): { message: string; dumpValues: unknown[] } {
    const messageArgsValues: MessageArgValue<unknown>[] = messageArgs.map(
        (messageArg) => ({
            dump: isMessageArgWrapped(messageArg)
                ? (messageArg.dump ?? false)
                : false,
            value: messageArgToValue(messageArg),
        }),
    )
    const finalMessage = replacePlaceHolders(message, messageArgsValues)
    return {
        message: finalMessage,
        dumpValues: messageArgsValues
            .filter((candidate) => candidate.dump)
            .map((messageArgValue) => messageArgValue.value),
    }
}

function replacePlaceHolders<TypeValue>(
    message: string,
    messageArgs: MessageArgValue<TypeValue>[],
): string {
    let result = message

    messageArgs
        .map((messageArg) => messageArgToString(messageArg))
        .forEach(
            (target, placeholder) =>
                (result = result.replace(
                    `{${placeholder}}`,
                    target ?? 'undefined',
                )),
        )

    return result
}

function messageArgToString<TypeValue extends { toString(): string }>(
    messageArg: MessageArgValue<TypeValue>,
): string | undefined {
    if (messageArg.value === undefined) {
        return undefined
    }
    return messageArg.asString
        ? messageArg.asString(messageArg.value)
        : messageArg.value.toString()
}

function messageArgToValue<TypeValue>(messageArg: MessageArg<TypeValue>) {
    if (Array.isArray(messageArg)) {
        return messageArg
    } else if (isMessageArgCallback(messageArg)) {
        return messageArg.cb()
    } else if (isMessageArgValue(messageArg)) {
        return messageArg.value
    } else if (typeof messageArg === 'function') {
        return messageArg()
    } else {
        return messageArg
    }
}
