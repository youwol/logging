/** @format */

import { getRouting, setBackend, setPath, setRouteLevel } from "./routing";

export { LogFactory, logFactory } from "./factory";
export { setRouteLevel, setBackend, setPath, getRouting } from "./routing";
export { Logger } from "./logging";

window["LogRouting"] = { setRouteLevel, setBackend, setPath, getRouting };
