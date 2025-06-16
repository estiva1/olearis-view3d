import View3D from "../View3D";
declare abstract class Loader {
    protected _view3D: View3D;
    constructor(view3D: View3D);
    protected _onLoadingProgress: (evt: ProgressEvent<EventTarget>, src: string, context: import("..").LoadingItem) => void;
}
export default Loader;
