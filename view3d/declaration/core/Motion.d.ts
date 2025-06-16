import { Range } from "../type/utils";
declare class Motion {
    private _duration;
    private _loop;
    private _range;
    private _easing;
    private _progress;
    private _val;
    private _start;
    private _end;
    private _activated;
    get val(): number;
    get start(): number;
    get end(): number;
    get progress(): number;
    get duration(): number;
    get loop(): boolean;
    get range(): Range;
    get easing(): (x: number) => number;
    get activated(): boolean;
    set duration(val: number);
    set loop(val: boolean);
    set range(val: Range);
    set easing(val: (x: number) => number);
    constructor({ duration, loop, range, easing }?: {
        duration?: number;
        loop?: boolean;
        range?: Readonly<Range>;
        easing?: (x: number) => number;
    });
    update(deltaTime: number): number;
    reset(defaultVal: number): void;
    setEndDelta(delta: number): void;
}
export default Motion;
