/// <reference types="vite/client" />

declare module '.vs' {
    const value: string
    export default value
}

declare module '.fs' {
    const value: string
    export default value
}

declare module '.vert' {
    const value: string
    export default value
}

declare module '.frag' {
    const value: string
    export default value
}

declare module '.glsl' {
    const value: string
    export default value
}

declare module '.shader' {
    const value: string
    export default value
}


interface ImportMetaEnv {

    readonly CLIENT_VERSION: string
    readonly CLIENT_DEVELOPMENT?: boolean
    
}

interface ImportMeta {

    // this type may be augmented via interface merging
    readonly env: ImportMetaEnv

}