interface CameraControl {
    readonly enabled: boolean;
    readonly animating: boolean;
    destroy(): void;
    resize(size: {
        width: number;
        height: number;
    }): void;
    sync(): void;
    update(delta: number): void;
    enable(): void;
    disable(): void;
}
export default CameraControl;
