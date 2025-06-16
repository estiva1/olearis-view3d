import View3D from "../View3D";
import { QUICK_LOOK_APPLE_PAY_BUTTON_TYPE, QUICK_LOOK_CUSTOM_BANNER_SIZE } from "../const/external";
import { LiteralUnion, OptionGetters, ValueOf } from "../type/utils";
import ARSession from "./ARSession";
export interface QuickLookSessionOptions {
    allowsContentScaling: boolean;
    canonicalWebPageURL: string | null;
    applePayButtonType: LiteralUnion<ValueOf<typeof QUICK_LOOK_APPLE_PAY_BUTTON_TYPE>, string> | null;
    callToAction: string | null;
    checkoutTitle: string | null;
    checkoutSubtitle: string | null;
    price: string | null;
    custom: string | null;
    customHeight: LiteralUnion<ValueOf<typeof QUICK_LOOK_CUSTOM_BANNER_SIZE>, string> | null;
}
declare class QuickLookSession implements ARSession, OptionGetters<QuickLookSessionOptions> {
    static isAvailable(): Promise<boolean>;
    static readonly type: "quickLook";
    allowsContentScaling: QuickLookSessionOptions["allowsContentScaling"];
    canonicalWebPageURL: QuickLookSessionOptions["canonicalWebPageURL"];
    applePayButtonType: QuickLookSessionOptions["applePayButtonType"];
    callToAction: QuickLookSessionOptions["callToAction"];
    checkoutTitle: QuickLookSessionOptions["checkoutTitle"];
    checkoutSubtitle: QuickLookSessionOptions["checkoutSubtitle"];
    price: QuickLookSessionOptions["price"];
    custom: QuickLookSessionOptions["custom"];
    customHeight: QuickLookSessionOptions["customHeight"];
    private _view3D;
    constructor(view3D: View3D, { allowsContentScaling, canonicalWebPageURL, applePayButtonType, callToAction, checkoutTitle, checkoutSubtitle, price, custom, customHeight }?: Partial<QuickLookSessionOptions>);
    enter(): Promise<void>;
    exit(): Promise<void>;
}
export default QuickLookSession;
