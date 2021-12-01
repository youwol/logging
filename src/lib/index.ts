import { getRouting, setBackend, setPath, setRouteLevel } from './routing'

export { LogFactory, logFactory } from './factory'
export { setRouteLevel, setBackend, setPath, getRouting } from './routing'
export { Logger } from './logging'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Dirty hack
// @ts-ignore
window['LogRouting'] = { setRouteLevel, setBackend, setPath, getRouting }
