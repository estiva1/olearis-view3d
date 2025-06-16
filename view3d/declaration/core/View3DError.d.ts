declare class View3DError extends Error {
    code: number;
    constructor(message: string, code: number);
}
export default View3DError;
