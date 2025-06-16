import View3D from "../View3D";
import WebARSession from "../xr/WebARSession";
declare class ARManager {
    private _view3D;
    private _activeSession;
    get activeSession(): WebARSession;
    constructor(view3D: View3D);
    isAvailable(): Promise<boolean>;
    enter(): Promise<void>;
    exit(): Promise<void>;
    private _getSesssionClasses;
    private _getUsingSessionTypes;
}
export default ARManager;
