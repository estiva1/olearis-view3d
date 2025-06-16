import Component from "@egjs/component";
declare class Animation extends Component<{
    progress: (event: {
        progress: number;
        easedProgress: number;
    }) => any;
    loop: (event: {
        progress: number;
        easedProgress: number;
        loopIndex: number;
    }) => any;
    finish: void;
}> {
    private _ctx;
    private _repeat;
    private _duration;
    private _easing;
    private _rafId;
    private _loopCount;
    private _time;
    private _clock;
    constructor({ context, repeat, duration, easing }?: Partial<{
        context: any;
        repeat: number;
        duration: number;
        easing: (x: number) => number;
    }>);
    start(): void;
    stop(): void;
    pause(): void;
    private _loop;
    private _stopLoop;
    private _getDeltaTime;
    private _updateClock;
}
export default Animation;
