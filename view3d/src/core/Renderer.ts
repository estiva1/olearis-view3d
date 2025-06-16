/*
 * Copyright (c) 2020 NAVER Corp.
 * egjs projects are licensed under the MIT license
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SavePass } from "three/examples/jsm/postprocessing/SavePass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BlendShader } from "three/examples/jsm/shaders/BlendShader";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";




// import { MotionBlurPass } from '../shader/MotionBlurPass';


import View3D from "../View3D";
import { checkHalfFloatAvailable, findCanvas } from "../utils";
import * as BROWSER from "../const/browser";
import { DEFAULT_CLASS, EVENTS } from "../const/external";

/**
 * Renderer that renders View3D's Scene
 */
class Renderer {
  private _view3D: View3D;
  private _renderer: THREE.WebGLRenderer;
  private _canvas: HTMLCanvasElement;
  private _clock: THREE.Clock;
  private _halfFloatAvailable: boolean;
  private _renderQueued: boolean;
  private _canvasSize: THREE.Vector2;

  private composer: EffectComposer;
  private renderPass: RenderPass;
  private blendPass: ShaderPass;
  private _effectsOn: boolean;
  // private motionPass: MotionBlurPass;


  /**
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement HTMLCanvasElement} given when creating View3D instance
   * @type HTMLCanvasElement
   * @readonly
   */
  public get canvas() { return this._canvas; }
  /**
   * Current {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext WebGLRenderingContext}
   * @type WebGLRenderingContext
   * @readonly
   */
  public get context() { return this._renderer.getContext(); }
  /**
   * Three.js {@link https://threejs.org/docs/#api/en/renderers/WebGLRenderer WebGLRenderer} instance
   * @type THREE.WebGLRenderer
   * @readonly
   */
  public get threeRenderer() { return this._renderer; }
  /**
   * Default render loop of View3D
   * @type {function}
   * @readonly
   */
  public get defaultRenderLoop() { return this._defaultRenderLoop; }
  /**
   * The rendering width and height of the canvas
   * @type {object}
   * @param {number} width Width of the canvas
   * @param {number} height Height of the canvas
   * @readonly
   */
  public get size() {
    const renderingSize = this._renderer.getSize(new THREE.Vector2());

    return { width: renderingSize.width, height: renderingSize.y };
  }

  /**
   * Canvas element's actual size
   * @type THREE.Vector2
   * @readonly
   */
  public get canvasSize() { return this._canvasSize; }

  /**
   * An object containing details about the capabilities of the current RenderingContext.
   * Merged with three.js WebGLRenderer's capabilities.
   */
  public get capabilities() {
    const renderer = this._renderer;

    return {
      ...renderer.capabilities,
      halfFloat: this._halfFloatAvailable
    };
  }

  public effectsOn(effects: boolean) {
    this._effectsOn = effects;
  }

  public setBlenMixRatio(mixRatio: number) {
    this.blendPass.uniforms["mixRatio"].value = mixRatio;
  }

  /**
   * Create new Renderer instance
   * @param {View3D} view3D An instance of View3D
   */
  public constructor(view3D: View3D) {
    const canvas = findCanvas(view3D.rootEl, view3D.canvasSelector);

    this._canvas = canvas;
    this._view3D = view3D;
    this._renderQueued = false;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });

    renderer.toneMapping = view3D.toneMapping as THREE.ToneMapping;
    renderer.toneMappingExposure = view3D.exposure;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);

    this._halfFloatAvailable = checkHalfFloatAvailable(renderer);
    this._renderer = renderer;
    this._clock = new THREE.Clock(false);
    this._canvasSize = new THREE.Vector2();

    canvas.addEventListener(BROWSER.EVENTS.CONTEXT_LOST, this._onContextLost);
    canvas.addEventListener(BROWSER.EVENTS.CONTEXT_RESTORED, this._onContextRestore);
  }

  /**
   * Destroy the renderer and stop active animation loop
   */
  public destroy() {
    const canvas = this._canvas;

    this.stopAnimationLoop();
    this._renderer.dispose();

    canvas.removeEventListener(BROWSER.EVENTS.CONTEXT_LOST, this._onContextLost);
    canvas.removeEventListener(BROWSER.EVENTS.CONTEXT_RESTORED, this._onContextRestore);
  }

  /**
   * Resize the renderer based on current canvas width / height
   * @returns {void}
   */
  public resize(): void {
    const renderer = this._renderer;
    const canvas = this._canvas;

    if (renderer.xr.isPresenting) return;

    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    this._canvasSize.set(width, height);
  }

  public setAnimationLoop(callback: (delta: number, frame?: THREE.XRFrame) => void): void {
    const view3D = this._view3D;
    const clock = this._clock;
    const canvas = this._canvas;

    // Render Pass Setup
    this.renderPass = new RenderPass( view3D.scene.root, view3D.camera.threeCamera );

    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);

    const renderTargetParameters = {
      colorSpace: "srgb",
      stencilBuffer: false
    };
    const renderTarget = new THREE.WebGLRenderTarget(
      (canvas.clientWidth || 1) * window.devicePixelRatio,
      (canvas.clientHeight || 1) * window.devicePixelRatio,
      renderTargetParameters
    )

    // save pass
    const savePass = new SavePass(renderTarget);

    // blend pass
    this.blendPass = new ShaderPass(BlendShader, "tDiffuse1");
    this.blendPass.uniforms["tDiffuse2"].value = savePass.renderTarget.texture;
    this.blendPass.uniforms["mixRatio"].value = 0.0;

    // output pass
    const outputPass = new ShaderPass(CopyShader);
    outputPass.renderToScreen = true;


    this.composer = new EffectComposer( this._renderer );
    this.composer.setSize( window.innerWidth, window.innerHeight );
    this.composer.setPixelRatio( window.devicePixelRatio );
    this.composer.addPass( this.renderPass );
    this.composer.addPass( gammaCorrectionPass );
    
    this.composer.addPass(this.blendPass);
    this.composer.addPass(savePass);
    this.composer.addPass(outputPass);

    clock.start();
    this._renderer.setAnimationLoop((timestamp: number, frame?: THREE.XRFrame) => {
      const delta = Math.min(clock.getDelta(), view3D.maxDeltaTime);
      callback(delta, frame);
    });
  }

  public stopAnimationLoop(): void {
    this._clock.stop();
    // See https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop
    this._renderer.setAnimationLoop(null);
  }

  public renderSingleFrame(immediate = false): void {
    const renderer = this._renderer;
    if (!renderer.xr.isPresenting) {
      if (immediate) {
        this._renderFrame(0);
      } else if (!this._renderQueued) {
        requestAnimationFrame(() => {
          this._renderFrame(0);
        });
        this._renderQueued = true;
      }
    }
  }

  private _defaultRenderLoop = (delta: number) => {
    const view3D = this._view3D;
    const {
      control,
      autoPlayer,
      animator
    } = view3D;

    if (
      !animator.animating
      && !control.animating
      && !autoPlayer.animating
    ) return;

    this._renderFrame(delta);
  };

  private _renderFrame(delta: number) {

    const view3D = this._view3D;
    const threeRenderer = this._renderer;
    const {
      scene,
      camera,
      control,
      autoPlayer,
      animator,
      annotation
    } = view3D;

    if (threeRenderer.getContext().isContextLost()) return;

    const deltaMiliSec = delta * 1000;
    this._renderQueued = false;

    animator.update(delta);
    control.update(deltaMiliSec);
    autoPlayer.update(deltaMiliSec);

    view3D.trigger(EVENTS.BEFORE_RENDER, {
      type: EVENTS.BEFORE_RENDER,
      target: view3D,
      delta: deltaMiliSec
    });

    camera.updatePosition();

    scene.shadowPlane.render();
    if (this._effectsOn) {
      this.composer.render();  
    } else {
      threeRenderer.render(scene.root, camera.threeCamera);  
    }
    
    

    // Render annotations
    annotation.render();

    view3D.trigger(EVENTS.RENDER, {
      type: EVENTS.RENDER,
      target: view3D,
      delta: deltaMiliSec
    });
  }

  private _onContextLost = () => {
    const canvas = this._canvas;
    canvas.classList.add(DEFAULT_CLASS.CTX_LOST);
  };

  private _onContextRestore = () => {
    const canvas = this._canvas;
    const scene = this._view3D.scene;

    canvas.classList.remove(DEFAULT_CLASS.CTX_LOST);
    scene.initTextures();
    this.renderSingleFrame();
  };
}

export default Renderer;
