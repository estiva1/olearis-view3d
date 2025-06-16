import View3D from "../View3D";
import Model from "../core/Model";
import Pose from "../core/Pose";
import Annotation from "../annotation/Annotation";
import { INPUT_TYPE } from "../const/external";
import WebARSession from "../xr/WebARSession";
import { ValueOf } from "./utils";
export interface ReadyEvent {
    type: string;
    target: View3D;
}
export interface LoadStartEvent {
    type: string;
    target: View3D;
    src: string;
    level: number;
    maxLevel: number;
}
export interface LoadEvent {
    type: string;
    target: View3D;
    model: Model;
    level: number;
    maxLevel: number;
}
export interface LoadErrorEvent {
    type: string;
    target: View3D;
    level: number;
    maxLevel: number;
    error: Error;
}
export interface LoadFinishEvent {
    type: string;
    target: View3D;
}
export interface ModelChangeEvent {
    type: string;
    target: View3D;
    model: Model;
}
export interface ResizeEvent {
    type: string;
    target: View3D;
    width: number;
    height: number;
}
export interface BeforeRenderEvent {
    type: string;
    target: View3D;
    delta: number;
}
export interface RenderEvent {
    type: string;
    target: View3D;
    delta: number;
}
export interface LoadProgressEvent {
    type: string;
    target: View3D;
    src: string;
    lengthComputable: boolean;
    loaded: number;
    total: number;
}
export interface InputStartEvent {
    type: string;
    target: View3D;
    inputType: ValueOf<typeof INPUT_TYPE>;
}
export interface InputEndEvent {
    type: string;
    target: View3D;
    inputType: ValueOf<typeof INPUT_TYPE>;
}
export interface CameraChangeEvent {
    type: string;
    target: View3D;
    pose: Pose;
    prevPose: Pose;
}
export interface AnimationStartEvent {
    type: string;
    target: View3D;
    index: number;
    clip: THREE.AnimationClip;
    action: THREE.AnimationAction;
}
export interface AnimationLoopEvent {
    type: string;
    target: View3D;
    index: number;
    clip: THREE.AnimationClip;
    action: THREE.AnimationAction;
}
export interface AnimationFinishedEvent {
    type: string;
    target: View3D;
    index: number;
    clip: THREE.AnimationClip;
    action: THREE.AnimationAction;
}
export interface AnnotationFocusEvent {
    type: string;
    target: View3D;
    annotation: Annotation;
}
export interface AnnotationUnfocusEvent {
    type: string;
    target: View3D;
    annotation: Annotation;
}
export interface ARStartEvent {
    type: string;
    target: View3D;
    session: WebARSession;
}
export interface AREndEvent {
    type: string;
    target: View3D;
    session: WebARSession;
}
export interface ARModelPlacedEvent {
    type: string;
    target: View3D;
    session: WebARSession;
    model: Model;
}
export interface QuickLookTapEvent extends Omit<Event, "target"> {
    type: string;
    target: View3D;
}
