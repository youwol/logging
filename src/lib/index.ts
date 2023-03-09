import { getRouting, setBackend, setPath, setRouteLevel } from './routing'
import { setup } from '../auto-generated'
export { LogFactory, logFactory } from './factory'
export { setRouteLevel, setBackend, setPath, getRouting } from './routing'
export { Logger } from './logging'
export * from './context'
export * as Journal from './journal/types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Dirty hack
// @ts-ignore
window['LogRouting'] = { setRouteLevel, setBackend, setPath, getRouting }
export type CdnClient = typeof import('@youwol/cdn-client')

export type JournalModule = typeof import('./journal')

export async function installJournalModule(
    cdnClient: CdnClient,
): Promise<JournalModule> {
    return await setup.installAuxiliaryModule({
        name: 'journal',
        cdnClient,
    })
}
