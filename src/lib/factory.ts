/** @format */
import { backendConsole } from "./backends";
import { Level, Logger, MessageArg } from "./logging";
import { BackendWithLevel, getRouting, Path } from "./routing";

class ConcreteLogger implements Logger {
  private backends: BackendWithLevel[];
  private delegate: Map<
    Level,
    (message: string, messageArgs: MessageArg[]) => void
  > = new Map<Level, (message: string, messageArg: MessageArg[]) => void>();
  private readonly loggerContext: LoggerContext;

  constructor(loggerContext: LoggerContext, backends: BackendWithLevel[]) {
    this.loggerContext = loggerContext;
    this.backends = backends;
    this.setupDelegate();
  }

  setupDelegate() {
    for (const level of Object.values(Level)) {
      const logFns = this.backends
        .filter((backendLevel) => backendLevel.level <= level)
        .map((backendLevel) => backendLevel.backend);
      this.delegate.set(
        level as Level,
        logFns.length != 0
          ? (message, messageArgs) =>
              logFns.forEach((backend) =>
                backend.logFn(
                  level as Level,
                  message,
                  messageArgs,
                  this.loggerContext
                )
              )
          : (_m, _cb) => {
              /* NOOP */
            }
      );
    }
  }

  removeBackend(id: string) {
    this.backends = this.backends.filter(
      (backendLevel) => backendLevel.backend.id !== id
    );
    this.setupDelegate();
  }

  setBackend(backendLevel: BackendWithLevel) {
    if (
      this.backends.find(
        (currentBackendLevel) =>
          backendLevel.backend === currentBackendLevel.backend
      )
    ) {
      this.setLevel(backendLevel);
    } else {
      this.backends.push(backendLevel);
      this.setupDelegate();
    }
  }

  setLevel(backendLevel: BackendWithLevel) {
    this.backends.find(
      (currentBackendLevel) =>
        backendLevel.backend === currentBackendLevel.backend
    ).level = backendLevel.level;
    this.setupDelegate();
  }

  debug(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.DEBUG)(message, messageArgs);
  }

  info(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.INFO)(message, messageArgs);
  }

  notice(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.NOTICE)(message, messageArgs);
  }

  warning(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.WARNING)(message, messageArgs);
  }

  error(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.ERROR)(message, messageArgs);
  }

  fatal(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.FATAL)(message, messageArgs);
  }

  alert(message: string, ...messageArgs: MessageArg[]): void {
    this.delegate.get(Level.ALERT)(message, messageArgs);
  }

  getChildLogger(childName: string): Logger {
    return factoryLogger({
      ...this.loggerContext,
      path: `${this.loggerContext.path}/${childName}`,
    });
  }
}

const loggers: Map<string, Logger> = new Map<string, Logger>();

const thisModuleLog: Logger = new ConcreteLogger({ path: "/logging/factory" }, [
  { backend: backendConsole, level: Level.NOTICE },
]);

thisModuleLog.debug(document.documentURI);

loggers.set("/logging/factory", thisModuleLog);

function factoryLogger(loggerContext: LoggerContext): Logger {
  const path = loggerContext.path;
  if (loggers.has(path)) {
    thisModuleLog.debug(`Found logger for ${path}`);
    return loggers.get(path);
  }

  thisModuleLog.debug(`constructing logger for ${path}`);

  const backendsLevels: BackendWithLevel[] = [];
  for (const route of getRouting()) {
    thisModuleLog.debug(
      `logger:${path} route:${route.id} level:${route.level}`
    );

    const routePath: Path = route.paths
      .filter((candidate) => path.startsWith(candidate.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    thisModuleLog.debug(
      `logger:${path} route:${route.id} path:${routePath.path} level:${routePath.level}`
    );

    const routeLevel =
      routePath.level > route.level ? routePath.level : route.level;
    thisModuleLog.debug(
      `logger:${path} route:${route.id} routeLevel:${routeLevel}`
    );

    backendsLevels.push(
      ...route.backendsLevels.map((backend): BackendWithLevel => {
        thisModuleLog.debug(
          `logger:${path} route:${route.id} backend:${backend.backend.id} level:${backend.level}`
        );
        const backendLevel =
          routeLevel > backend.level ? routeLevel : backend.level;
        thisModuleLog.debug(
          `logger:${path} add backend ${backend.backend.id} with level:${backendLevel}`
        );
        return {
          backend: backend.backend,
          level: backendLevel,
        };
      })
    );
  }

  const concreteLogger = new ConcreteLogger(loggerContext, backendsLevels);
  loggers.set(path, concreteLogger);
  return concreteLogger;
}

export interface LogFactory {
  getChildLogger(name: string): Logger;

  getChildFactory(name: string): LogFactory;
}

class Factory implements LogFactory {
  private readonly loggerContext: LoggerContext;

  constructor(loggerContext: string | LoggerContext) {
    if (typeof loggerContext === "string") {
      this.loggerContext = { path: loggerContext };
    } else {
      this.loggerContext = loggerContext;
    }
  }

  getChildLogger(childName: string): Logger {
    return factoryLogger(this.getFullChildName(childName));
  }

  getChildFactory(childName: string): LogFactory {
    return new Factory(this.getFullChildName(childName));
  }

  private getFullChildName(childName: string): LoggerContext {
    return {
      ...this.loggerContext,
      path: `${this.loggerContext.path}/${childName}`,
    };
  }
}

// TODO: take a look at Go concepts for logging : withValue, withDeadline, etc …
export function logFactory(): LogFactory {
  return new Factory("");
}

export type LoggerContext = { path: string; [key: string]: string };
