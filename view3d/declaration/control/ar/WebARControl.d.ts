import * as THREE from "three";
import View3D from "../../View3D";
import Model from "../../core/Model";
import ARScene from "../../xr/ARScene";
import { AUTO } from "../../const/external";
import { XRRenderContext } from "../../type/xr";
import ARSwirlControl, { ARSwirlControlOptions } from "./ARSwirlControl";
import ARTranslateControl, { ARTranslateControlOptions } from "./ARTranslateControl";
import ARScaleControl, { ARScaleControlOptions } from "./ARScaleControl";
import { FloorIndicatorOptions } from "./FloorIndicator";
import { DeadzoneCheckerOptions } from "./DeadzoneChecker";
export interface WebARControlOptions {
    rotate: boolean | Partial<ARSwirlControlOptions>;
    translate: boolean | Partial<ARTranslateControlOptions>;
    scale: boolean | Partial<ARScaleControlOptions>;
    ring: Partial<FloorIndicatorOptions>;
    deadzone: Partial<DeadzoneCheckerOptions>;
    initialScale: typeof AUTO | number;
}
declare class WebARControl {
    private _rotate;
    private _translate;
    private _scale;
    private _initialScale;
    private _view3D;
    private _arScene;
    private _initialized;
    private _modelHit;
    private _vertical;
    private _hitTestSource;
    private _deadzoneChecker;
    private _rotateControl;
    private _translateControl;
    private _scaleControl;
    private _floorIndicator;
    get rotate(): ARSwirlControl;
    get translate(): ARTranslateControl;
    get scale(): ARScaleControl;
    constructor(view3D: View3D, arScene: ARScene, { rotate, translate, scale, ring, deadzone, initialScale }: WebARControlOptions);
    init({ model, session, size, vertical, hitPosition, hitRotation }: {
        model: Model;
        session: THREE.XRSession;
        vertical: boolean;
        size: {
            width: number;
            height: number;
        };
        hitPosition: THREE.Vector3;
        hitRotation: THREE.Quaternion;
    }): Promise<void>;
    destroy(session: THREE.XRSession): void;
    enable(session: THREE.XRSession): void;
    disable(session: THREE.XRSession): void;
    update(ctx: XRRenderContext): void;
    syncTargetModel(model: Model): void;
    private _deactivate;
    private _onSelectStart;
    private _onSelectEnd;
    private _checkDeadzone;
    private _processInput;
    private _updateControls;
    private _hitResultToVector;
}
export default WebARControl;
