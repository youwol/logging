import { Context } from '../context'
import { VirtualDOM } from '@youwol/flux-view'

export type Page = {
    title: string
    abstract?: string
    entryPoint: Context
}

export type Journal = {
    title: string
    abstract?: string
    pages: Page[]
}

export type DataViewsFactory = {
    name: string
    description?: string
    isCompatible: (data: unknown) => boolean
    view: (data: unknown) => VirtualDOM | Promise<VirtualDOM>
}[]

export type OptionsJournalView = {
    containerClass?: string
    containerStyle?: { [key: string]: string }
}

export type OptionsContextView = {
    containerClass?: string
    containerStyle?: { [key: string]: string }
    treeViewClass?: string
    treeViewStyle?: { [key: string]: string }
}
