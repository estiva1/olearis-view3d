import * as THREE from "three";
import View3D from "../View3D";
declare class Skybox {
    static createDefaultEnv(renderer: THREE.WebGLRenderer): THREE.Texture;
    static createBlurredHDR(view3D: View3D, texture: THREE.Texture): THREE.CubeTexture;
    private static _createRectAreaLightSource;
}
export default Skybox;
