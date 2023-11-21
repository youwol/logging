type AllTags = keyof HTMLElementTagNameMap
export type Configuration = {
    TypeCheck: 'strict'
    SupportedHTMLTags: 'Prod' extends 'Prod' ? AllTags : DevTags
    WithFluxView: false
}

type DevTags = 'div' | 'i' | 'select' | 'option' | 'h3' | 'h5'
