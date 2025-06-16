declare const isAvailable: ({ webGL, fetch, stream, wasm }?: Partial<{
    webGL: boolean;
    fetch: boolean;
    stream: boolean;
    wasm: boolean;
}>) => boolean;
export default isAvailable;
