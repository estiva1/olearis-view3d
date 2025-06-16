interface ARSession {
    enter: () => Promise<any>;
    exit: () => Promise<any>;
}
export default ARSession;
