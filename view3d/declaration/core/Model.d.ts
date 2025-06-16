import * as THREE from "three";
import { GLTFParser } from "three/examples/jsm/loaders/GLTFLoader";
import { Annotation } from "../annotation";
import { AUTO } from "../const/external";
declare class Model {
    private _src;
    private _scene;
    private _parser;
    private _bbox;
    private _center;
    private _animations;
    private _annotations;
    private _variants;
    private _fixSkinnedBbox;
    get src(): string;
    get scene(): THREE.Group;
    get animations(): THREE.AnimationClip[];
    get annotations(): Annotation[];
    get meshes(): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>[];
    get bbox(): THREE.Box3;
    get center(): THREE.Vector3;
    set castShadow(val: boolean);
    set receiveShadow(val: boolean);
    constructor({ src, scenes, center, parser, animations, annotations, variants, fixSkinnedBbox, castShadow, receiveShadow }: {
        src: string;
        scenes: THREE.Object3D[];
        center?: typeof AUTO | Array<number | string>;
        parser?: GLTFParser | null;
        animations?: THREE.AnimationClip[];
        annotations?: Annotation[];
        variants?: Array<{
            name: string;
        }>;
        fixSkinnedBbox?: boolean;
        castShadow?: boolean;
        receiveShadow?: boolean;
    });
    selectVariant(variant: number | string | null): Promise<any[]>;
    reduceVertices<T>(callbackfn: (previousVal: T, currentVal: THREE.Vector3) => T, initialVal: T): T;
    private _getInitialBbox;
    private _getSkeletonBbox;
    private _getAllMeshes;
    private _hasSkinnedMesh;
    private _forEachSkinnedVertices;
}
export default Model;
