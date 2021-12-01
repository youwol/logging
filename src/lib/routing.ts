import { backendConsole } from './backends'
import { Backend, Level } from './logging'

export type BackendWithLevel = { backend: Backend; level: Level }

export type Route = {
    id: string
    level: Level
    backendsLevels: BackendWithLevel[]
    paths: Path[]
}

export type Path = {
    path: string
    level: Level
}

export type Routing = Route[]

export const defaultRoutingId = 'default_route'

export function setPath(
    path: string,
    level: Level = 'debug',
    route: string = defaultRoutingId,
) {
    routing
        .find((candidate) => candidate.id === route)
        ?.paths.push({ path, level })
}

export function setBackend(
    backend: Backend,
    level: Level = 'debug',
    route: string = defaultRoutingId,
) {
    routing
        .find((candidate) => candidate.id === route)
        ?.backendsLevels.push({ backend, level })
}

export function setRouteLevel(
    level: Level,
    routeId: string = defaultRoutingId,
) {
    const route = routing.find((candidate) => candidate.id === routeId)
    if (route !== undefined) {
        route.level = level
    }
}

const routing: Routing = [
    {
        id: defaultRoutingId,
        level: 'debug',
        backendsLevels: [{ backend: backendConsole, level: 'debug' }],
        paths: [
            { path: '/', level: 'info' },
            { path: '/@youwol/flux-builder', level: 'debug' },
            { path: '/@youwol/flux-core/Modules', level: 'debug' },
        ],
    },
]

export function getRouting(): Routing {
    return clone(routing)
}

/**
 * Taken from https://stackoverflow.com/a/28152032 « Option 4: Deep Copy Function »
 *
 * @param ref
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Low level stuff */
function clone(ref: any): any {
    // Handle the 3 simple types, and null or undefined
    if (null == ref || 'object' != typeof ref) {
        return ref
    }

    // Handle Array
    if (Array.isArray(ref)) {
        const result = []
        for (let i = 0, len = ref.length; i < len; i++) {
            result[i] = clone(ref[i])
        }
        return result
    }

    // Handle Object
    if (ref instanceof Object) {
        const result: any = {}
        for (const attr in ref) {
            result[attr] = clone(ref[attr])
        }
        return result
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Low level stuff */
