import * as THREE from "three";
import View3D from "../View3D";
import Loader from "./Loader";
declare class TextureLoader extends Loader {
    constructor(view3D: View3D);
    load(url: string): Promise<THREE.Texture>;
    loadHDRTexture(url: string): Promise<THREE.Texture>;
}
export default TextureLoader;
