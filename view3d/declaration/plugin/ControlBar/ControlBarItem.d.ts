interface ControlBarItem {
    position?: "top" | "left" | "right";
    order?: number;
    element: HTMLElement;
    enabled: boolean;
    enable(): void;
    disable(): void;
}
export default ControlBarItem;
