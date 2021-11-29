/** @format */

import { backendConsole } from "./backends";
import { Backend, Level } from "./logging";

export type BackendWithLevel = { backend: Backend; level: Level };

export type Route = {
  id: string;
  level: Level;
  backendsLevels: BackendWithLevel[];
  paths: Path[];
};

export type Path = {
  path: string;
  level: Level;
};

export type Routing = Route[];

export const defaultRoutingId = "default_route";

export function setPath(
  path: string,
  level: Level = Level.DEBUG,
  route: string = defaultRoutingId
) {
  routing
    .find((candidate) => candidate.id === route)
    .paths.push({ path, level });
}

export function setBackend(
  backend: Backend,
  level: Level = Level.DEBUG,
  route: string = defaultRoutingId
) {
  routing
    .find((candidate) => candidate.id === route)
    .backendsLevels.push({ backend, level });
}

export function setRouteLevel(level: Level, route: string = defaultRoutingId) {
  routing.find((candidate) => candidate.id === route).level = level;
}

const routing: Routing = [
  {
    id: defaultRoutingId,
    level: Level.DEBUG,
    backendsLevels: [{ backend: backendConsole, level: Level.DEBUG }],
    paths: [
      { path: "/", level: Level.DEBUG },
      { path: "/layout-editor", level: Level.INFO },
    ],
  },
];

export function getRouting(): Routing {
  return clone(routing);
}

/**
 * Taken from https://stackoverflow.com/a/28152032 « Option 4: Deep Copy Function »
 *
 * @param ref
 */
function clone(ref) {
  let result;

  // Handle the 3 simple types, and null or undefined
  if (null == ref || "object" != typeof ref) {
    return ref;
  }

  // Handle Array
  if (Array.isArray(ref)) {
    result = [];
    for (let i = 0, len = ref.length; i < len; i++) {
      result[i] = clone(ref[i]);
    }
    return result;
  }

  // Handle Object
  if (ref instanceof Object) {
    result = {};
    for (const attr in ref) {
      // eslint-disable-next-line no-prototype-builtins -- Dirty hack
      if (ref.hasOwnProperty(attr)) {
        result[attr] = clone(ref[attr]);
      }
    }
    return result;
  }
}
