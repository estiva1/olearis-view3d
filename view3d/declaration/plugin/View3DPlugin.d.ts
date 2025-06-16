import View3D from "../View3D";
interface View3DPlugin {
    init(view3D: View3D): Promise<void>;
    teardown(view3D: View3D): void;
}
export default View3DPlugin;
