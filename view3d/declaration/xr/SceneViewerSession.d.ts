import View3D from "../View3D";
import { AUTO } from "../const/external";
import { SCENE_VIEWER_MODE } from "../const/external";
import { LiteralUnion, OptionGetters, ValueOf } from "../type/utils";
import ARSession from "./ARSession";
export interface SceneViewerSessionOptions {
    file: string | null;
    fallbackURL: string | null;
    mode: LiteralUnion<ValueOf<typeof SCENE_VIEWER_MODE>, string>;
    title: string | null;
    link: string | null;
    sound: string | null;
    resizable: boolean;
    vertical: boolean;
    disableOcclusion: boolean;
    initialScale: LiteralUnion<typeof AUTO, string> | null;
    shareText: string | null;
    [key: string]: any;
}
declare class SceneViewerSession implements ARSession, OptionGetters<SceneViewerSessionOptions> {
    static isAvailable(): Promise<boolean>;
    static readonly type: "sceneViewer";
    file: SceneViewerSessionOptions["file"];
    mode: SceneViewerSessionOptions["mode"];
    fallbackURL: SceneViewerSessionOptions["fallbackURL"];
    title: SceneViewerSessionOptions["title"];
    link: SceneViewerSessionOptions["link"];
    sound: SceneViewerSessionOptions["sound"];
    resizable: SceneViewerSessionOptions["resizable"];
    vertical: SceneViewerSessionOptions["vertical"];
    disableOcclusion: SceneViewerSessionOptions["disableOcclusion"];
    initialScale: SceneViewerSessionOptions["initialScale"];
    shareText: SceneViewerSessionOptions["shareText"];
    otherParams: Record<string, any>;
    private _view3D;
    constructor(view3D: View3D, { file, mode, fallbackURL, title, link, sound, resizable, vertical, disableOcclusion, initialScale, shareText, ...otherParams }?: Partial<SceneViewerSessionOptions>);
    enter(): Promise<never>;
    exit(): Promise<void>;
}
export default SceneViewerSession;
