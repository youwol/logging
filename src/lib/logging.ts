/** @format */

import { LoggerContext } from "./factory";

export enum Level {
  DEBUG,
  INFO,
  NOTICE,
  WARNING,
  ERROR,
  FATAL,
  ALERT,
  MUTED,
}

export interface Logger {
  debug(message: string, ...messageArgs: MessageArg[]): void;

  info(message: string, ...messageArgs: MessageArg[]): void;

  notice(message: string, ...messageArgs: MessageArg[]): void;

  warning(message: string, ...messageArgs: MessageArg[]): void;

  error(message: string, ...messageArgs: MessageArg[]): void;

  fatal(message: string, ...messageArgs: MessageArg[]): void;

  alert(message: string, ...messageArgs: MessageArg[]): void;

  getChildLogger(name: string): Logger;
}

type LogFn = (
  level: Level,
  message: string,
  messageArgs: MessageArg[],
  context: LoggerContext
) => void;

export type Backend = {
  id: string;
  logFn: LogFn;
};

export type MessageArg = MessageArgValue<unknown> | MessageArgCallback<unknown>;

interface IMessageArg {
  placeHolder?: boolean;
  dump?: boolean;
}

export interface MessageArgValue<TypeValue> extends IMessageArg {
  value: TypeValue;
  aString?: (v: TypeValue) => string;
}

export interface MessageArgCallback<TypeValue> extends IMessageArg {
  cb: () => TypeValue;
  aString?: (v: TypeValue) => string;
}

export function isMessageArgCallback<TypeValue>(
  messageArg: MessageArg
): messageArg is MessageArgCallback<TypeValue> {
  return messageArg["cb"] !== undefined;
}
