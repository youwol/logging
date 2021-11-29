/** @format */
import {
  Backend,
  isMessageArgCallback,
  Level,
  MessageArg,
  MessageArgValue,
} from "./logging";

export const backendConsole: Backend = {
  id: "CONSOLE",
  logFn: (level, messageWithPlaceHolders, messageArgs, context) => {
    const { message, dumpValues } = prepareMessage(
      messageWithPlaceHolders,
      messageArgs
    );
    const date = new Date().toISOString();
    const finalLine = `[${date}][${Level[level]}] ${context.path} : ${message}`;

    switch (level) {
      case Level.DEBUG:
      case Level.INFO:
      case Level.NOTICE:
        console.log(finalLine, ...dumpValues);
        break;
      case Level.WARNING:
        console.warn(finalLine, ...dumpValues);
        break;
      default:
        console.error(finalLine, ...dumpValues);
    }
  },
};

export function prepareMessage(
  message: string,
  messageArgs: MessageArg[]
): { message: string; dumpValues: unknown[] } {
  const messageArgsValues: MessageArgValue<unknown>[] = messageArgs.map(
    (messageArg) => ({
      placeHolder: messageArg.placeHolder,
      dump: messageArg.dump,
      value: messageArgToValue(messageArg),
    })
  );
  const finalMessage = replacePlaceHolders(message, messageArgsValues);
  return {
    message: finalMessage,
    dumpValues: messageArgsValues
      .filter((candidate) => candidate.dump ?? false)
      .map((messageArgValue) => messageArgValue.value),
  };
}

function replacePlaceHolders(
  message: string,
  messageArgs: MessageArgValue<unknown>[]
): string {
  let result = message;

  messageArgs
    .filter((messageArg) => messageArg.placeHolder ?? true)
    .map((messageArg) => messageArgToString(messageArg))
    .forEach(
      (target, placeholder) =>
        (result = result.replace(`{${placeholder}}`, target))
    );

  return result;
}

function messageArgToString(messageArg: MessageArgValue<unknown>): string {
  if (messageArg.value === undefined) {
    return undefined;
  }
  return messageArg.aString
    ? messageArg.aString(messageArg.value)
    : messageArg.value.toString();
}

function messageArgToValue(messageArg: MessageArg): unknown {
  if (isMessageArgCallback(messageArg)) {
    return messageArg.cb();
  } else {
    return messageArg.value;
  }
}
