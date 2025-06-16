import View3D from "../View3D";
import Model from "../core/Model";
import Loader from "./Loader";
declare class GLTFLoader extends Loader {
    static setMeshoptDecoder(meshoptPath: string): Promise<void>;
    static meshoptDecoder: any;
    private _loader;
    constructor(view3D: View3D);
    load(url: string): Promise<Model>;
    loadFromFiles(files: File[]): Promise<Model>;
    private _parseToModel;
}
export default GLTFLoader;
