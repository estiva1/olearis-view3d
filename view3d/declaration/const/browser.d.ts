export declare const IS_IOS: () => boolean;
export declare const IS_ANDROID: () => boolean;
export declare const EVENTS: {
    readonly MOUSE_DOWN: "mousedown";
    readonly MOUSE_MOVE: "mousemove";
    readonly MOUSE_UP: "mouseup";
    readonly TOUCH_START: "touchstart";
    readonly TOUCH_MOVE: "touchmove";
    readonly TOUCH_END: "touchend";
    readonly WHEEL: "wheel";
    readonly RESIZE: "resize";
    readonly CONTEXT_MENU: "contextmenu";
    readonly MOUSE_ENTER: "mouseenter";
    readonly MOUSE_LEAVE: "mouseleave";
    readonly POINTER_DOWN: "pointerdown";
    readonly POINTER_MOVE: "pointermove";
    readonly POINTER_UP: "pointerup";
    readonly POINTER_ENTER: "pointerenter";
    readonly POINTER_LEAVE: "pointerleave";
    readonly LOAD: "load";
    readonly ERROR: "error";
    readonly CLICK: "click";
    readonly DOUBLE_CLICK: "dblclick";
    readonly CONTEXT_LOST: "webglcontextlost";
    readonly CONTEXT_RESTORED: "webglcontextrestored";
};
export declare const CURSOR: {
    readonly GRAB: "grab";
    readonly GRABBING: "grabbing";
    readonly NONE: "";
};
export declare enum MOUSE_BUTTON {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2
}
export declare const MAX_SAFE_INTEGER: number;
export declare const ANONYMOUS = "anonymous";
export declare const EL_DIV = "div";
export declare const EL_BUTTON = "button";
