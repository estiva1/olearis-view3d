/*
Copyright (c) NAVER Corp.
name: @olearis/view3d
license: MIT
author: NAVER Corp.
repository: https://github.com/naver/egjs-view3d
version: 2.10.2
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('@egjs/component')) :
  typeof define === 'function' && define.amd ? define(['three', '@egjs/component'], factory) :
  (global = global || self, global.View3D = factory(global.THREE, global.Component));
}(this, (function (THREE, Component) { 'use strict';

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Error thrown by View3D
   */
  class View3DError extends Error {
    /**
     * Create new instance of View3DError
     * @param {string} message Error message
     * @param {number} code Error code, see {@link ERROR_CODES}
     */
    constructor(message, code) {
      super(message);
      Object.setPrototypeOf(this, View3DError.prototype);
      this.name = "View3DError";
      this.code = code;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Error codes of {@link View3DError}
   * @type object
   * @property {0} WRONG_TYPE The given value's type is not expected
   * @property {1} ELEMENT_NOT_FOUND The element with given CSS selector does not exist
   * @property {2} CANVAS_NOT_FOUND The element given is not a \<canvas\> element
   * @property {3} WEBGL_NOT_SUPPORTED The browser does not support WebGL
   * @property {4} PROVIDE_SRC_FIRST `init()` is called before setting `src`
   * @property {5} FILE_NOT_SUPPORTED The given file is not supported
   * @property {6} NOT_INITIALIZED The action is called before the component is initialized
   * @property {7} MODEL_FAIL_TO_LOAD The 3D model failed to load
   */
  const ERROR_CODES = {
    WRONG_TYPE: 0,
    ELEMENT_NOT_FOUND: 1,
    CANVAS_NOT_FOUND: 2,
    WEBGL_NOT_SUPPORTED: 3,
    PROVIDE_SRC_FIRST: 4,
    FILE_NOT_SUPPORTED: 5,
    NOT_INITIALIZED: 6,
    MODEL_FAIL_TO_LOAD: 7
  };
  const MESSAGES = {
    WRONG_TYPE: (val, types) => `${typeof val} is not a ${types.map(type => `"${type}"`).join(" or ")}.`,
    ELEMENT_NOT_FOUND: query => `Element with selector "${query}" not found.`,
    CANVAS_NOT_FOUND: "The canvas element was not found inside the given root element.",
    WEBGL_NOT_SUPPORTED: "WebGL is not supported on this browser.",
    PROVIDE_SRC_FIRST: "\"src\" should be provided before initialization.",
    FILE_NOT_SUPPORTED: src => `Given file "${src}" is not supported.`,
    NOT_INITIALIZED: "View3D is not initialized yet.",
    MODEL_FAIL_TO_LOAD: url => `Failed to load/parse the 3D model with the given url: "${url}". Check "loadError" event for actual error instance.`
  };
  var ERROR = {
    CODES: ERROR_CODES,
    MESSAGES
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  const isNumber = val => typeof val === "number";
  const isString = val => typeof val === "string";
  const isElement = val => !!val && val.nodeType === Node.ELEMENT_NODE;
  const getNullableElement = (el, parent) => {
    let targetEl = null;
    if (isString(el)) {
      const parentEl = parent ? parent : document;
      const queryResult = parentEl.querySelector(el);
      if (!queryResult) {
        return null;
      }
      targetEl = queryResult;
    } else if (isElement(el)) {
      targetEl = el;
    }
    return targetEl;
  };
  const getElement = (el, parent) => {
    const targetEl = getNullableElement(el, parent);
    if (!targetEl) {
      if (isString(el)) {
        throw new View3DError(ERROR.MESSAGES.ELEMENT_NOT_FOUND(el), ERROR.CODES.ELEMENT_NOT_FOUND);
      } else {
        throw new View3DError(ERROR.MESSAGES.WRONG_TYPE(el, ["HTMLElement", "string"]), ERROR.CODES.WRONG_TYPE);
      }
    }
    return targetEl;
  };
  const findCanvas = (root, selector) => {
    const canvas = root.querySelector(selector);
    if (!canvas) {
      throw new View3DError(ERROR.MESSAGES.CANVAS_NOT_FOUND, ERROR.CODES.CANVAS_NOT_FOUND);
    }
    return canvas;
  };
  const isCSSSelector = val => {
    if (!isString(val)) return false;
    const dummyEl = document.createDocumentFragment();
    try {
      dummyEl.querySelector(val);
    } catch (_a) {
      return false;
    }
    return true;
  };
  const range = end => {
    if (!end || end <= 0) {
      return [];
    }
    return Array.apply(0, Array(end)).map((undef, idx) => idx);
  };
  const toRadian = x => x * Math.PI / 180;
  const toDegree = x => x * 180 / Math.PI;
  const clamp = (x, min, max) => Math.max(Math.min(x, max), min);
  // Linear interpolation between a and b
  const lerp = (a, b, t) => {
    return a * (1 - t) + b * t;
  };
  const circulate = (val, min, max) => {
    const size = Math.abs(max - min);
    if (val < min) {
      const offset = (min - val) % size;
      val = max - offset;
    } else if (val > max) {
      const offset = (val - max) % size;
      val = min + offset;
    }
    return val;
  };
  // eslint-disable-next-line @typescript-eslint/ban-types
  const merge = (target, ...srcs) => {
    srcs.forEach(source => {
      Object.keys(source).forEach(key => {
        const value = source[key];
        if (Array.isArray(target[key]) && Array.isArray(value)) {
          target[key] = [...target[key], ...value];
        } else {
          target[key] = value;
        }
      });
    });
    return target;
  };
  const getBoxPoints = box => {
    return [box.min.clone(), new THREE.Vector3(box.min.x, box.min.y, box.max.z), new THREE.Vector3(box.min.x, box.max.y, box.min.z), new THREE.Vector3(box.min.x, box.max.y, box.max.z), new THREE.Vector3(box.max.x, box.min.y, box.min.z), new THREE.Vector3(box.max.x, box.min.y, box.max.z), new THREE.Vector3(box.max.x, box.max.y, box.min.z), box.max.clone()];
  };
  const toPowerOfTwo = val => {
    let result = 1;
    while (result < val) {
      result *= 2;
    }
    return result;
  };
  const getPrimaryAxisIndex = (basis, viewDir) => {
    let primaryIdx = 0;
    let maxDot = 0;
    basis.forEach((axes, axesIdx) => {
      const dotProduct = Math.abs(viewDir.dot(axes));
      if (dotProduct > maxDot) {
        primaryIdx = axesIdx;
        maxDot = dotProduct;
      }
    });
    return primaryIdx;
  };
  // In radian
  const getRotationAngle = (center, v1, v2) => {
    const centerToV1 = new THREE.Vector2().subVectors(v1, center).normalize();
    const centerToV2 = new THREE.Vector2().subVectors(v2, center).normalize();
    // Get the rotation angle with the model's NDC coordinates as the center.
    const deg = centerToV2.angle() - centerToV1.angle();
    const compDeg = -Math.sign(deg) * (2 * Math.PI - Math.abs(deg));
    // Take the smaller deg
    const rotationAngle = Math.abs(deg) < Math.abs(compDeg) ? deg : compDeg;
    return rotationAngle;
  };
  const getObjectOption = val => typeof val === "object" ? val : {};
  const toBooleanString = val => val ? "true" : "false";
  const getRotatedPosition = (distance, yawDeg, pitchDeg) => {
    const yaw = toRadian(yawDeg);
    const pitch = toRadian(pitchDeg);
    const newPos = new THREE.Vector3(0, 0, 0);
    newPos.y = distance * Math.sin(pitch);
    newPos.z = distance * Math.cos(pitch);
    newPos.x = newPos.z * Math.sin(-yaw);
    newPos.z = newPos.z * Math.cos(-yaw);
    return newPos;
  };
  // In Radians
  const directionToYawPitch = direction => {
    const xz = new THREE.Vector2(direction.x, direction.z);
    const origin = new THREE.Vector2();
    const yaw = Math.abs(direction.y) <= 0.99 ? getRotationAngle(origin, new THREE.Vector2(0, 1), xz) : 0;
    const pitch = Math.atan2(direction.y, xz.distanceTo(origin));
    return {
      yaw,
      pitch
    };
  };
  const createLoadingContext = (view3D, src) => {
    const context = {
      src,
      loaded: 0,
      total: 0,
      lengthComputable: false,
      initialized: false
    };
    view3D.loadingContext.push(context);
    return context;
  };
  const getAttributeScale = attrib => {
    if (attrib.normalized && ArrayBuffer.isView(attrib.array)) {
      const buffer = attrib.array;
      const isSigned = isSignedArrayBuffer(buffer);
      const scale = 1 / (Math.pow(2, 8 * buffer.BYTES_PER_ELEMENT) - 1);
      return isSigned ? scale * 2 : scale;
    } else {
      return 1;
    }
  };
  const getSkinnedVertex = (posIdx, mesh, positionScale, skinWeightScale) => {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const skinIndicies = geometry.attributes.skinIndex;
    const skinWeights = geometry.attributes.skinWeight;
    const skeleton = mesh.skeleton;
    const boneMatricies = skeleton.boneMatrices;
    const pos = new THREE.Vector3().fromBufferAttribute(positions, posIdx).multiplyScalar(positionScale);
    const skinned = new THREE.Vector4(0, 0, 0, 0);
    const skinVertex = new THREE.Vector4(pos.x, pos.y, pos.z).applyMatrix4(mesh.bindMatrix);
    const weights = [skinWeights.getX(posIdx), skinWeights.getY(posIdx), skinWeights.getZ(posIdx), skinWeights.getW(posIdx)].map(weight => weight * skinWeightScale);
    const indicies = [skinIndicies.getX(posIdx), skinIndicies.getY(posIdx), skinIndicies.getZ(posIdx), skinIndicies.getW(posIdx)];
    weights.forEach((weight, index) => {
      const boneMatrix = new THREE.Matrix4().fromArray(boneMatricies, indicies[index] * 16);
      skinned.add(skinVertex.clone().applyMatrix4(boneMatrix).multiplyScalar(weight));
    });
    const transformed = new THREE.Vector3().fromArray(skinned.applyMatrix4(mesh.bindMatrixInverse).toArray());
    transformed.applyMatrix4(mesh.matrixWorld);
    return transformed;
  };
  const isSignedArrayBuffer = buffer => {
    const testBuffer = new buffer.constructor(1);
    testBuffer[0] = -1;
    return testBuffer[0] < 0;
  };
  const checkHalfFloatAvailable = renderer => {
    if (renderer.capabilities.isWebGL2) {
      return true;
    } else {
      const gl = renderer.getContext();
      const texture = gl.createTexture();
      let available = true;
      try {
        const data = new Uint16Array(4);
        const ext = gl.getExtension("OES_texture_half_float");
        if (!ext) {
          available = false;
        } else {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, ext.HALF_FLOAT_OES, data);
          const err = gl.getError();
          available = err === gl.NO_ERROR;
        }
      } catch (err) {
        available = false;
      }
      gl.deleteTexture(texture);
      return available;
    }
  };
  const getFaceVertices = (model, meshIndex, faceIndex) => {
    var _a;
    if (!model || meshIndex < 0 || faceIndex < 0) return null;
    const mesh = model.meshes[meshIndex];
    const indexes = (_a = mesh === null || mesh === void 0 ? void 0 : mesh.geometry.index) === null || _a === void 0 ? void 0 : _a.array;
    const face = indexes ? range(3).map(idx => indexes[3 * faceIndex + idx]) : null;
    if (!mesh || !indexes || !face || face.some(val => val == null)) return null;
    const position = mesh.geometry.getAttribute("position");
    const vertices = face.map(index => {
      return new THREE.Vector3().fromBufferAttribute(position, index);
    });
    return vertices;
  };
  const getAnimatedFace = (model, meshIndex, faceIndex) => {
    const vertices = getFaceVertices(model, meshIndex, faceIndex);
    if (!vertices) return null;
    const mesh = model.meshes[meshIndex];
    const indexes = mesh.geometry.getIndex();
    const face = indexes.array.slice(3 * faceIndex, 3 * faceIndex + 3);
    if (mesh.isSkinnedMesh) {
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position;
      const skinWeights = geometry.attributes.skinWeight;
      const positionScale = getAttributeScale(positions);
      const skinWeightScale = getAttributeScale(skinWeights);
      vertices.forEach((vertex, idx) => {
        const posIdx = face[idx];
        const transformed = getSkinnedVertex(posIdx, mesh, positionScale, skinWeightScale);
        vertex.copy(transformed);
      });
    } else {
      vertices.forEach(vertex => {
        vertex.applyMatrix4(mesh.matrixWorld);
      });
    }
    return vertices;
  };
  const subclip = (sourceClip, name, startTime, endTime) => {
    const clip = sourceClip.clone();
    clip.name = name;
    const tracks = [];
    clip.tracks.forEach(track => {
      const valueSize = track.getValueSize();
      const times = [];
      const values = [];
      for (let timeIdx = 0; timeIdx < track.times.length; ++timeIdx) {
        const time = track.times[timeIdx];
        const nextTime = track.times[timeIdx + 1];
        const prevTime = track.times[timeIdx - 1];
        const isPrevFrame = nextTime && time < startTime && nextTime > startTime;
        const isMiddleFrame = time >= startTime && time < endTime;
        const isNextFrame = prevTime && time >= endTime && prevTime < endTime;
        if (!isPrevFrame && !isMiddleFrame && !isNextFrame) continue;
        times.push(time);
        for (let k = 0; k < valueSize; ++k) {
          values.push(track.values[timeIdx * valueSize + k]);
        }
      }
      if (times.length === 0) return;
      track.times = convertArray(times, track.times.constructor);
      track.values = convertArray(values, track.values.constructor);
      tracks.push(track);
    });
    clip.tracks = tracks;
    for (let i = 0; i < clip.tracks.length; ++i) {
      clip.tracks[i].shift(-startTime);
    }
    clip.duration = endTime - startTime;
    return clip;
  };
  // From three.js AnimationUtils
  // https://github.com/mrdoob/three.js/blob/68daccedef9c9c325cc5f4c929fcaf05229aa1b3/src/animation/AnimationUtils.js#L20
  // The MIT License
  // Copyright © 2010-2022 three.js authors
  const convertArray = (array, type, forceClone = false) => {
    if (!array ||
    // let 'undefined' and 'null' pass
    !forceClone && array.constructor === type) return array;
    if (typeof type.BYTES_PER_ELEMENT === "number") {
      return new type(array); // create typed array
    }

    return Array.prototype.slice.call(array); // create Array
  };

  const parseAsBboxRatio = (arr, bbox) => {
    const min = bbox.min.toArray();
    const size = new THREE.Vector3().subVectors(bbox.max, bbox.min).toArray();
    return new THREE.Vector3().fromArray(arr.map((val, idx) => {
      if (!isString(val)) return val;
      const ratio = parseFloat(val) * 0.01;
      return min[idx] + ratio * size[idx];
    }));
  };

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  function __rest(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
              if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                  t[p[i]] = s[p[i]];
          }
      return t;
  }

  function __awaiter(thisArg, _arguments, P, generator) {
      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
  }

  /**
   * Full-screen textured quad shader
   */

  var CopyShader = {
    uniforms: {
      'tDiffuse': {
        value: null
      },
      'opacity': {
        value: 1.0
      }
    },
    vertexShader: /* glsl */"\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvUv = uv;\n\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n\t\t}",
    fragmentShader: /* glsl */"\n\n\t\tuniform float opacity;\n\n\t\tuniform sampler2D tDiffuse;\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvec4 texel = texture2D( tDiffuse, vUv );\n\t\t\tgl_FragColor = opacity * texel;\n\n\t\t}"
  };

  class Pass {
    constructor() {
      // if set to true, the pass is processed by the composer
      this.enabled = true;

      // if set to true, the pass indicates to swap read and write buffer after rendering
      this.needsSwap = true;

      // if set to true, the pass clears its buffer before rendering
      this.clear = false;

      // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
      this.renderToScreen = false;
    }
    setSize( /* width, height */) {}
    render( /* renderer, writeBuffer, readBuffer, deltaTime, maskActive */
    ) {
      console.error('THREE.Pass: .render() must be implemented in derived pass.');
    }
  }

  // Helper for passes that need to fill the viewport with a single quad.

  var _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // https://github.com/mrdoob/three.js/pull/21358

  var _geometry = new THREE.BufferGeometry();
  _geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
  _geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
  class FullScreenQuad {
    constructor(material) {
      this._mesh = new THREE.Mesh(_geometry, material);
    }
    dispose() {
      this._mesh.geometry.dispose();
    }
    render(renderer) {
      renderer.render(this._mesh, _camera);
    }
    get material() {
      return this._mesh.material;
    }
    set material(value) {
      this._mesh.material = value;
    }
  }

  class ShaderPass extends Pass {
    constructor(shader, textureID) {
      super();
      this.textureID = textureID !== undefined ? textureID : 'tDiffuse';
      if (shader instanceof THREE.ShaderMaterial) {
        this.uniforms = shader.uniforms;
        this.material = shader;
      } else if (shader) {
        this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        this.material = new THREE.ShaderMaterial({
          defines: Object.assign({}, shader.defines),
          uniforms: this.uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
        });
      }
      this.fsQuad = new FullScreenQuad(this.material);
    }
    render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
      if (this.uniforms[this.textureID]) {
        this.uniforms[this.textureID].value = readBuffer.texture;
      }
      this.fsQuad.material = this.material;
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      } else {
        renderer.setRenderTarget(writeBuffer);
        // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
        if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        this.fsQuad.render(renderer);
      }
    }
  }

  class MaskPass extends Pass {
    constructor(scene, camera) {
      super();
      this.scene = scene;
      this.camera = camera;
      this.clear = true;
      this.needsSwap = false;
      this.inverse = false;
    }
    render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
      var context = renderer.getContext();
      var state = renderer.state;

      // don't update color or depth

      state.buffers.color.setMask(false);
      state.buffers.depth.setMask(false);

      // lock buffers

      state.buffers.color.setLocked(true);
      state.buffers.depth.setLocked(true);

      // set up stencil

      var writeValue, clearValue;
      if (this.inverse) {
        writeValue = 0;
        clearValue = 1;
      } else {
        writeValue = 1;
        clearValue = 0;
      }
      state.buffers.stencil.setTest(true);
      state.buffers.stencil.setOp(context.REPLACE, context.REPLACE, context.REPLACE);
      state.buffers.stencil.setFunc(context.ALWAYS, writeValue, 0xffffffff);
      state.buffers.stencil.setClear(clearValue);
      state.buffers.stencil.setLocked(true);

      // draw into the stencil buffer

      renderer.setRenderTarget(readBuffer);
      if (this.clear) renderer.clear();
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      renderer.render(this.scene, this.camera);

      // unlock color and depth buffer for subsequent rendering

      state.buffers.color.setLocked(false);
      state.buffers.depth.setLocked(false);

      // only render where stencil is set to 1

      state.buffers.stencil.setLocked(false);
      state.buffers.stencil.setFunc(context.EQUAL, 1, 0xffffffff); // draw if == 1
      state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
      state.buffers.stencil.setLocked(true);
    }
  }
  class ClearMaskPass extends Pass {
    constructor() {
      super();
      this.needsSwap = false;
    }
    render(renderer /*, writeBuffer, readBuffer, deltaTime, maskActive */) {
      renderer.state.buffers.stencil.setLocked(false);
      renderer.state.buffers.stencil.setTest(false);
    }
  }

  class EffectComposer {
    constructor(renderer, renderTarget) {
      this.renderer = renderer;
      if (renderTarget === undefined) {
        var parameters = {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat
        };
        var size = renderer.getSize(new THREE.Vector2());
        this._pixelRatio = renderer.getPixelRatio();
        this._width = size.width;
        this._height = size.height;
        renderTarget = new THREE.WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, parameters);
        renderTarget.texture.name = 'EffectComposer.rt1';
      } else {
        this._pixelRatio = 1;
        this._width = renderTarget.width;
        this._height = renderTarget.height;
      }
      this.renderTarget1 = renderTarget;
      this.renderTarget2 = renderTarget.clone();
      this.renderTarget2.texture.name = 'EffectComposer.rt2';
      this.writeBuffer = this.renderTarget1;
      this.readBuffer = this.renderTarget2;
      this.renderToScreen = true;
      this.passes = [];

      // dependencies

      if (CopyShader === undefined) {
        console.error('THREE.EffectComposer relies on CopyShader');
      }
      if (ShaderPass === undefined) {
        console.error('THREE.EffectComposer relies on ShaderPass');
      }
      this.copyPass = new ShaderPass(CopyShader);
      this.clock = new THREE.Clock();
    }
    swapBuffers() {
      var tmp = this.readBuffer;
      this.readBuffer = this.writeBuffer;
      this.writeBuffer = tmp;
    }
    addPass(pass) {
      this.passes.push(pass);
      pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }
    insertPass(pass, index) {
      this.passes.splice(index, 0, pass);
      pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }
    removePass(pass) {
      var index = this.passes.indexOf(pass);
      if (index !== -1) {
        this.passes.splice(index, 1);
      }
    }
    isLastEnabledPass(passIndex) {
      for (var i = passIndex + 1; i < this.passes.length; i++) {
        if (this.passes[i].enabled) {
          return false;
        }
      }
      return true;
    }
    render(deltaTime) {
      // deltaTime value is in seconds

      if (deltaTime === undefined) {
        deltaTime = this.clock.getDelta();
      }
      var currentRenderTarget = this.renderer.getRenderTarget();
      var maskActive = false;
      for (var i = 0, il = this.passes.length; i < il; i++) {
        var pass = this.passes[i];
        if (pass.enabled === false) continue;
        pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
        pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);
        if (pass.needsSwap) {
          if (maskActive) {
            var context = this.renderer.getContext();
            var stencil = this.renderer.state.buffers.stencil;

            //context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );
            stencil.setFunc(context.NOTEQUAL, 1, 0xffffffff);
            this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);

            //context.stencilFunc( context.EQUAL, 1, 0xffffffff );
            stencil.setFunc(context.EQUAL, 1, 0xffffffff);
          }
          this.swapBuffers();
        }
        if (MaskPass !== undefined) {
          if (pass instanceof MaskPass) {
            maskActive = true;
          } else if (pass instanceof ClearMaskPass) {
            maskActive = false;
          }
        }
      }
      this.renderer.setRenderTarget(currentRenderTarget);
    }
    reset(renderTarget) {
      if (renderTarget === undefined) {
        var size = this.renderer.getSize(new THREE.Vector2());
        this._pixelRatio = this.renderer.getPixelRatio();
        this._width = size.width;
        this._height = size.height;
        renderTarget = this.renderTarget1.clone();
        renderTarget.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
      }
      this.renderTarget1.dispose();
      this.renderTarget2.dispose();
      this.renderTarget1 = renderTarget;
      this.renderTarget2 = renderTarget.clone();
      this.writeBuffer = this.renderTarget1;
      this.readBuffer = this.renderTarget2;
    }
    setSize(width, height) {
      this._width = width;
      this._height = height;
      var effectiveWidth = this._width * this._pixelRatio;
      var effectiveHeight = this._height * this._pixelRatio;
      this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
      this.renderTarget2.setSize(effectiveWidth, effectiveHeight);
      for (var i = 0; i < this.passes.length; i++) {
        this.passes[i].setSize(effectiveWidth, effectiveHeight);
      }
    }
    setPixelRatio(pixelRatio) {
      this._pixelRatio = pixelRatio;
      this.setSize(this._width, this._height);
    }
  }

  // Helper for passes that need to fill the viewport with a single quad.

  var _camera$1 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // https://github.com/mrdoob/three.js/pull/21358

  var _geometry$1 = new THREE.BufferGeometry();
  _geometry$1.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
  _geometry$1.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

  class RenderPass extends Pass {
    constructor(scene, camera, overrideMaterial, clearColor, clearAlpha) {
      super();
      this.scene = scene;
      this.camera = camera;
      this.overrideMaterial = overrideMaterial;
      this.clearColor = clearColor;
      this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
      this.clear = true;
      this.clearDepth = false;
      this.needsSwap = false;
      this._oldClearColor = new THREE.Color();
    }
    render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      var oldClearAlpha, oldOverrideMaterial;
      if (this.overrideMaterial !== undefined) {
        oldOverrideMaterial = this.scene.overrideMaterial;
        this.scene.overrideMaterial = this.overrideMaterial;
      }
      if (this.clearColor) {
        renderer.getClearColor(this._oldClearColor);
        oldClearAlpha = renderer.getClearAlpha();
        renderer.setClearColor(this.clearColor, this.clearAlpha);
      }
      if (this.clearDepth) {
        renderer.clearDepth();
      }
      renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);

      // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
      if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      renderer.render(this.scene, this.camera);
      if (this.clearColor) {
        renderer.setClearColor(this._oldClearColor, oldClearAlpha);
      }
      if (this.overrideMaterial !== undefined) {
        this.scene.overrideMaterial = oldOverrideMaterial;
      }
      renderer.autoClear = oldAutoClear;
    }
  }

  class SavePass extends Pass {
    constructor(renderTarget) {
      super();
      if (CopyShader === undefined) console.error('THREE.SavePass relies on CopyShader');
      var shader = CopyShader;
      this.textureID = 'tDiffuse';
      this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
      });
      this.renderTarget = renderTarget;
      if (this.renderTarget === undefined) {
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBFormat
        });
        this.renderTarget.texture.name = 'SavePass.rt';
      }
      this.needsSwap = false;
      this.fsQuad = new FullScreenQuad(this.material);
    }
    render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
      if (this.uniforms[this.textureID]) {
        this.uniforms[this.textureID].value = readBuffer.texture;
      }
      renderer.setRenderTarget(this.renderTarget);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }

  /**
   * Blend two textures
   */

  var BlendShader = {
    uniforms: {
      'tDiffuse1': {
        value: null
      },
      'tDiffuse2': {
        value: null
      },
      'mixRatio': {
        value: 0.5
      },
      'opacity': {
        value: 1.0
      }
    },
    vertexShader: /* glsl */"\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvUv = uv;\n\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n\t\t}",
    fragmentShader: /* glsl */"\n\n\t\tuniform float opacity;\n\t\tuniform float mixRatio;\n\n\t\tuniform sampler2D tDiffuse1;\n\t\tuniform sampler2D tDiffuse2;\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvec4 texel1 = texture2D( tDiffuse1, vUv );\n\t\t\tvec4 texel2 = texture2D( tDiffuse2, vUv );\n\t\t\tgl_FragColor = opacity * mix( texel1, texel2, mixRatio );\n\n\t\t}"
  };

  /**
   * Gamma Correction Shader
   * http://en.wikipedia.org/wiki/gamma_correction
   */

  var GammaCorrectionShader = {
    uniforms: {
      'tDiffuse': {
        value: null
      }
    },
    vertexShader: /* glsl */"\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvUv = uv;\n\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n\t\t}",
    fragmentShader: /* glsl */"\n\n\t\tuniform sampler2D tDiffuse;\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvec4 tex = texture2D( tDiffuse, vUv );\n\n\t\t\tgl_FragColor = LinearTosRGB( tex ); // optional: LinearToGamma( tex, float( GAMMA_FACTOR ) );\n\n\t\t}"
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  // Browser related constants
  const IS_IOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const IS_ANDROID = () => /android/i.test(navigator.userAgent);
  const EVENTS = {
    MOUSE_DOWN: "mousedown",
    MOUSE_MOVE: "mousemove",
    MOUSE_UP: "mouseup",
    TOUCH_START: "touchstart",
    TOUCH_MOVE: "touchmove",
    TOUCH_END: "touchend",
    WHEEL: "wheel",
    RESIZE: "resize",
    CONTEXT_MENU: "contextmenu",
    MOUSE_ENTER: "mouseenter",
    MOUSE_LEAVE: "mouseleave",
    POINTER_DOWN: "pointerdown",
    POINTER_MOVE: "pointermove",
    POINTER_UP: "pointerup",
    POINTER_ENTER: "pointerenter",
    POINTER_LEAVE: "pointerleave",
    LOAD: "load",
    ERROR: "error",
    CLICK: "click",
    DOUBLE_CLICK: "dblclick",
    CONTEXT_LOST: "webglcontextlost",
    CONTEXT_RESTORED: "webglcontextrestored"
  };
  const CURSOR = {
    GRAB: "grab",
    GRABBING: "grabbing",
    NONE: ""
  };
  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent.button
  var MOUSE_BUTTON;
  (function (MOUSE_BUTTON) {
    MOUSE_BUTTON[MOUSE_BUTTON["LEFT"] = 0] = "LEFT";
    MOUSE_BUTTON[MOUSE_BUTTON["MIDDLE"] = 1] = "MIDDLE";
    MOUSE_BUTTON[MOUSE_BUTTON["RIGHT"] = 2] = "RIGHT";
  })(MOUSE_BUTTON || (MOUSE_BUTTON = {}));
  const ANONYMOUS = "anonymous";
  const EL_DIV = "div";
  const EL_BUTTON = "button";

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * "auto"
   * @type {"auto"}
   */
  const AUTO = "auto";
  /**
   * Event type object with event name strings of {@link View3D}
   * @type {object}
   * @property {"ready"} READY {@link /docs/events/ready Ready event}
   * @property {"loadStart"} LOAD_START {@link /docs/events/loadStart Load start event}
   * @property {"load"} LOAD {@link /docs/events/load Load event}
   * @property {"loadError"} LOAD_ERROR {@link /docs/events/loadError Load error event}
   * @property {"resize"} RESIZE {@link /docs/events/resize Resize event}
   * @property {"beforeRender"} BEFORE_RENDER {@link /docs/events/beforeRender Before render event}
   * @property {"render"} RENDER {@link /docs/events/render Render event}
   * @property {"progress"} PROGRESS {@link /docs/events/progress Progress event}
   * @property {"inputStart"} INPUT_START {@link /docs/events/inputStart Input start event}
   * @property {"inputEnd"} INPUT_END {@link /docs/events/inputEnd Input end event}
   * @property {"cameraChange"} CAMERA_CHANGE {@link /docs/events/cameraChange Camera change event}
   * @property {"animationStart"} ANIMATION_START {@link /docs/events/animationStart Animation start event}
   * @property {"animationLoop"} ANIMATION_LOOP {@link /docs/events/animationLoop Animation loop event}
   * @property {"animationFinished"} ANIMATION_FINISHED {@link /docs/events/animationFinished Animation finished event}
   * @property {"annotationFocus"} ANNOTATION_FOCUS {@link /docs/events/annotationFocus Annotation focus event}
   * @property {"annotationUnfocus"} ANNOTATION_UNFOCUS {@link /docs/events/annotationUnfocus Annotation unfocus event}
   * @property {"quickLookTap"} QUICK_LOOK_TAP {@link /docs/events/quickLookTap Quick Look Tap event}
   * @property {"arStart"} AR_START {@link /docs/events/arStart AR start evemt}
   * @property {"arEnd"} AR_END {@link /docs/events/arEnd AR end event}
   * @property {"arModelPlaced"} AR_MODEL_PLACED {@link /docs/events/arModelPlaced AR model placed event}
   * @example
   * ```ts
   * import { EVENTS } from "@egjs/view3d";
   * EVENTS.RESIZE; // "resize"
   * ```
   */
  const EVENTS$1 = {
    READY: "ready",
    LOAD_START: "loadStart",
    LOAD: "load",
    LOAD_ERROR: "loadError",
    LOAD_FINISH: "loadFinish",
    MODEL_CHANGE: "modelChange",
    RESIZE: "resize",
    BEFORE_RENDER: "beforeRender",
    RENDER: "render",
    PROGRESS: "progress",
    INPUT_START: "inputStart",
    INPUT_END: "inputEnd",
    CAMERA_CHANGE: "cameraChange",
    ANIMATION_START: "animationStart",
    ANIMATION_LOOP: "animationLoop",
    ANIMATION_FINISHED: "animationFinished",
    ANNOTATION_FOCUS: "annotationFocus",
    ANNOTATION_UNFOCUS: "annotationUnfocus",
    AR_START: "arStart",
    AR_END: "arEnd",
    AR_MODEL_PLACED: "arModelPlaced",
    QUICK_LOOK_TAP: "quickLookTap"
  };
  /**
   * Collection of predefined easing functions
   * @type {object}
   * @property {function} SINE_WAVE
   * @property {function} EASE_OUT_CUBIC
   * @property {function} EASE_OUT_BOUNCE
   * @example
   * ```ts
   * import View3D, { EASING } from "@egjs/view3d";
   *
   * new RotateControl({
   *  easing: EASING.EASE_OUT_CUBIC,
   * });
   * ```
   */
  const EASING = {
    SINE_WAVE: x => Math.sin(x * Math.PI * 2),
    EASE_OUT_CUBIC: x => 1 - Math.pow(1 - x, 3),
    EASE_OUT_BOUNCE: x => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (x < 1 / d1) {
        return n1 * x * x;
      } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
      } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
      } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
      }
    }
  };
  /**
   * Default class names that View3D uses
   * @type {object}
   * @property {"view3d-wrapper"} WRAPPER A class name for wrapper element
   * @property {"view3d-canvas"} CANVAS A class name for canvas element
   * @property {"view3d-poster"} POSTER A class name for poster element
   * @property {"view3d-ar-overlay"} AR_OVERLAY A class name for AR overlay element
   * @property {"view3d-annotation-wrapper"} ANNOTATION_WRAPPER A class name for annotation wrapper element
   * @property {"view3d-annotation"} ANNOTATION A class name for annotation element
   * @property {"default"} ANNOTATION_DEFAULT A class name for default style annotation element
   * @property {"selected"} ANNOTATION_SELECTED A class name for selected annotation element
   * @property {"flip-x"} ANNOTATION_FLIP_X A class name for annotation element which has tooltip on the left side
   * @property {"flip-y"} ANNOTATION_FLIP_Y A class name for annotation element which has tooltip on the bottom side
   * @property {"ctx-lost"} CTX_LOST A class name for canvas element which will be added on context lost
   */
  const DEFAULT_CLASS = {
    WRAPPER: "view3d-wrapper",
    CANVAS: "view3d-canvas",
    POSTER: "view3d-poster",
    AR_OVERLAY: "view3d-ar-overlay",
    ANNOTATION_WRAPPER: "view3d-annotation-wrapper",
    ANNOTATION: "view3d-annotation",
    ANNOTATION_TOOLTIP: "view3d-annotation-tooltip",
    ANNOTATION_DEFAULT: "default",
    ANNOTATION_SELECTED: "selected",
    ANNOTATION_HIDDEN: "hidden",
    ANNOTATION_FLIP_X: "flip-x",
    ANNOTATION_FLIP_Y: "flip-y",
    CTX_LOST: "ctx-lost"
  };
  /**
   * Possible values for the toneMapping option.
   * This is used to approximate the appearance of high dynamic range (HDR) on the low dynamic range medium of a standard computer monitor or mobile device's screen.
   * @type {object}
   * @property {THREE.LinearToneMapping} LINEAR
   * @property {THREE.ReinhardToneMapping} REINHARD
   * @property {THREE.CineonToneMapping} CINEON
   * @property {THREE.ACESFilmicToneMapping} ACES_FILMIC
   */
  const TONE_MAPPING = {
    LINEAR: THREE.LinearToneMapping,
    REINHARD: THREE.ReinhardToneMapping,
    CINEON: THREE.CineonToneMapping,
    ACES_FILMIC: THREE.ACESFilmicToneMapping
  };
  /**
   * Types of zoom control
   * @type {object}
   * @property {"fov"} FOV Zoom by chaning fov(field-of-view). This will prevent camera from going inside the model.
   * @property {"distance"} DISTANCE Zoom by changing camera distance from the model.
   */
  const ZOOM_TYPE = {
    FOV: "fov",
    DISTANCE: "distance"
  };
  /**
   * Available AR session types
   * @type {object}
   * @property {"WebXR"} WEBXR An AR session based on {@link https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API WebXR Device API}
   * @property {"SceneViewer"} SCENE_VIEWER An AR session based on {@link https://developers.google.com/ar/develop/java/scene-viewer Google SceneViewer}, which is only available in Android
   * @property {"QuickLook"} QUICK_LOOK An AR session based on Apple {@link https://developer.apple.com/augmented-reality/quick-look/ AR Quick Look}, which is only available in iOS
   */
  const AR_SESSION_TYPE = {
    WEBXR: "webAR",
    SCENE_VIEWER: "sceneViewer",
    QUICK_LOOK: "quickLook"
  };
  /**
   * @type {object}
   * @property {"ar_only"} ONLY_AR
   * @property {"3d_only"} ONLY_3D
   * @property {"ar_preferred"} PREFER_AR
   * @property {"3d_preferred"} PREFER_3D
   */
  const SCENE_VIEWER_MODE = {
    ONLY_AR: "ar_only",
    ONLY_3D: "3d_only",
    PREFER_AR: "ar_preferred",
    PREFER_3D: "3d_preferred"
  };
  /**
   * <img src="https://docs-assets.developer.apple.com/published/b122cc68df/10cb0534-e1f6-42ed-aadb-5390c55ad3ff.png" />
   * @see https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look
   * @property {"plain"} PLAIN
   * @property {"pay"} PAY
   * @property {"buy"} BUY
   * @property {"check-out"} CHECK_OUT
   * @property {"book"} BOOK
   * @property {"donate"} DONATE
   * @property {"subscribe"} SUBSCRIBE
   */
  const QUICK_LOOK_APPLE_PAY_BUTTON_TYPE = {
    PLAIN: "plain",
    PAY: "pay",
    BUY: "buy",
    CHECK_OUT: "check-out",
    BOOK: "book",
    DONATE: "donate",
    SUBSCRIBE: "subscribe"
  };
  /**
   * Available size of the custom banner
   * @type {object}
   * @property {"small"} SMALL 81pt
   * @property {"medium"} MEDIUM 121pt
   * @property {"large"} LARGE 161pt
   */
  const QUICK_LOOK_CUSTOM_BANNER_SIZE = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large"
  };
  /**
   * Input types
   * @type {object}
   * @property {0} ROTATE Rotate input
   * @property {1} TRANSLATE Translate input
   * @property {2} ZOOM Zoom input
   */
  const INPUT_TYPE = {
    ROTATE: 0,
    TRANSLATE: 1,
    ZOOM: 2
  };
  /**
   * Animation repeat modes
   * @type {object}
   * @property {"one"} ONE Repeat single animation
   * @property {"none"} NONE Pause on animation's last frame
   * @property {"all"} ALL Repeat all animations
   */
  const ANIMATION_REPEAT_MODE = {
    ONE: "one",
    NONE: "none",
    ALL: "all"
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Renderer that renders View3D's Scene
   */
  class Renderer {
    /**
     * Create new Renderer instance
     * @param {View3D} view3D An instance of View3D
     */
    constructor(view3D) {
      this._defaultRenderLoop = delta => {
        const view3D = this._view3D;
        const {
          control,
          autoPlayer,
          animator
        } = view3D;
        if (!animator.animating && !control.animating && !autoPlayer.animating) return;
        this._renderFrame(delta);
      };
      this._onContextLost = () => {
        const canvas = this._canvas;
        canvas.classList.add(DEFAULT_CLASS.CTX_LOST);
      };
      this._onContextRestore = () => {
        const canvas = this._canvas;
        const scene = this._view3D.scene;
        canvas.classList.remove(DEFAULT_CLASS.CTX_LOST);
        scene.initTextures();
        this.renderSingleFrame();
      };
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
      renderer.toneMapping = view3D.toneMapping;
      renderer.toneMappingExposure = view3D.exposure;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      this._halfFloatAvailable = checkHalfFloatAvailable(renderer);
      this._renderer = renderer;
      this._clock = new THREE.Clock(false);
      this._canvasSize = new THREE.Vector2();
      canvas.addEventListener(EVENTS.CONTEXT_LOST, this._onContextLost);
      canvas.addEventListener(EVENTS.CONTEXT_RESTORED, this._onContextRestore);
    }
    // private motionPass: MotionBlurPass;
    /**
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement HTMLCanvasElement} given when creating View3D instance
     * @type HTMLCanvasElement
     * @readonly
     */
    get canvas() {
      return this._canvas;
    }
    /**
     * Current {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext WebGLRenderingContext}
     * @type WebGLRenderingContext
     * @readonly
     */
    get context() {
      return this._renderer.getContext();
    }
    /**
     * Three.js {@link https://threejs.org/docs/#api/en/renderers/WebGLRenderer WebGLRenderer} instance
     * @type THREE.WebGLRenderer
     * @readonly
     */
    get threeRenderer() {
      return this._renderer;
    }
    /**
     * Default render loop of View3D
     * @type {function}
     * @readonly
     */
    get defaultRenderLoop() {
      return this._defaultRenderLoop;
    }
    /**
     * The rendering width and height of the canvas
     * @type {object}
     * @param {number} width Width of the canvas
     * @param {number} height Height of the canvas
     * @readonly
     */
    get size() {
      const renderingSize = this._renderer.getSize(new THREE.Vector2());
      return {
        width: renderingSize.width,
        height: renderingSize.y
      };
    }
    /**
     * Canvas element's actual size
     * @type THREE.Vector2
     * @readonly
     */
    get canvasSize() {
      return this._canvasSize;
    }
    /**
     * An object containing details about the capabilities of the current RenderingContext.
     * Merged with three.js WebGLRenderer's capabilities.
     */
    get capabilities() {
      const renderer = this._renderer;
      return Object.assign(Object.assign({}, renderer.capabilities), {
        halfFloat: this._halfFloatAvailable
      });
    }
    effectsOn(effects) {
      this._effectsOn = effects;
    }
    setBlenMixRatio(mixRatio) {
      this.blendPass.uniforms["mixRatio"].value = mixRatio;
    }
    /**
     * Destroy the renderer and stop active animation loop
     */
    destroy() {
      const canvas = this._canvas;
      this.stopAnimationLoop();
      this._renderer.dispose();
      canvas.removeEventListener(EVENTS.CONTEXT_LOST, this._onContextLost);
      canvas.removeEventListener(EVENTS.CONTEXT_RESTORED, this._onContextRestore);
    }
    /**
     * Resize the renderer based on current canvas width / height
     * @returns {void}
     */
    resize() {
      const renderer = this._renderer;
      const canvas = this._canvas;
      if (renderer.xr.isPresenting) return;
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height, false);
      this._canvasSize.set(width, height);
    }
    setAnimationLoop(callback) {
      const view3D = this._view3D;
      const clock = this._clock;
      const canvas = this._canvas;
      // Render Pass Setup
      this.renderPass = new RenderPass(view3D.scene.root, view3D.camera.threeCamera);
      const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
      const renderTargetParameters = {
        colorSpace: "srgb",
        stencilBuffer: false
      };
      const renderTarget = new THREE.WebGLRenderTarget((canvas.clientWidth || 1) * window.devicePixelRatio, (canvas.clientHeight || 1) * window.devicePixelRatio, renderTargetParameters);
      // save pass
      const savePass = new SavePass(renderTarget);
      // blend pass
      this.blendPass = new ShaderPass(BlendShader, "tDiffuse1");
      this.blendPass.uniforms["tDiffuse2"].value = savePass.renderTarget.texture;
      this.blendPass.uniforms["mixRatio"].value = 0.0;
      // output pass
      const outputPass = new ShaderPass(CopyShader);
      outputPass.renderToScreen = true;
      this.composer = new EffectComposer(this._renderer);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setPixelRatio(window.devicePixelRatio);
      this.composer.addPass(this.renderPass);
      this.composer.addPass(gammaCorrectionPass);
      this.composer.addPass(this.blendPass);
      this.composer.addPass(savePass);
      this.composer.addPass(outputPass);
      clock.start();
      this._renderer.setAnimationLoop((timestamp, frame) => {
        const delta = Math.min(clock.getDelta(), view3D.maxDeltaTime);
        callback(delta, frame);
      });
    }
    stopAnimationLoop() {
      this._clock.stop();
      // See https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop
      this._renderer.setAnimationLoop(null);
    }
    renderSingleFrame(immediate = false) {
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
    _renderFrame(delta) {
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
      view3D.trigger(EVENTS$1.BEFORE_RENDER, {
        type: EVENTS$1.BEFORE_RENDER,
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
      view3D.trigger(EVENTS$1.RENDER, {
        type: EVENTS$1.RENDER,
        target: view3D,
        delta: deltaMiliSec
      });
    }
  }

  // https://github.com/mrdoob/three.js/issues/5552
  // http://en.wikipedia.org/wiki/RGBE_image_format

  class RGBELoader extends THREE.DataTextureLoader {
    constructor(manager) {
      super(manager);
      this.type = THREE.HalfFloatType;
    }

    // adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

    parse(buffer) {
      var /* return codes for rgbe routines */
        //RGBE_RETURN_SUCCESS = 0,
        RGBE_RETURN_FAILURE = -1,
        /* default error routine.  change this to change error handling */
        rgbe_read_error = 1,
        rgbe_write_error = 2,
        rgbe_format_error = 3,
        rgbe_memory_error = 4,
        rgbe_error = function (rgbe_error_code, msg) {
          switch (rgbe_error_code) {
            case rgbe_read_error:
              console.error('THREE.RGBELoader Read Error: ' + (msg || ''));
              break;
            case rgbe_write_error:
              console.error('THREE.RGBELoader Write Error: ' + (msg || ''));
              break;
            case rgbe_format_error:
              console.error('THREE.RGBELoader Bad File Format: ' + (msg || ''));
              break;
            default:
            case rgbe_memory_error:
              console.error('THREE.RGBELoader: Error: ' + (msg || ''));
          }
          return RGBE_RETURN_FAILURE;
        },
        /* offsets to red, green, and blue components in a data (float) pixel */
        //RGBE_DATA_RED = 0,
        //RGBE_DATA_GREEN = 1,
        //RGBE_DATA_BLUE = 2,

        /* number of floats per pixel, use 4 since stored in rgba image format */
        //RGBE_DATA_SIZE = 4,

        /* flags indicating which fields in an rgbe_header_info are valid */
        RGBE_VALID_PROGRAMTYPE = 1,
        RGBE_VALID_FORMAT = 2,
        RGBE_VALID_DIMENSIONS = 4,
        NEWLINE = '\n',
        fgets = function (buffer, lineLimit, consume) {
          var chunkSize = 128;
          lineLimit = !lineLimit ? 1024 : lineLimit;
          var p = buffer.pos,
            i = -1,
            len = 0,
            s = '',
            chunk = String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
          while (0 > (i = chunk.indexOf(NEWLINE)) && len < lineLimit && p < buffer.byteLength) {
            s += chunk;
            len += chunk.length;
            p += chunkSize;
            chunk += String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
          }
          if (-1 < i) {
            /*for (i=l-1; i>=0; i--) {
            	byteCode = m.charCodeAt(i);
            	if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
            	else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
            	if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
            }*/
            if (false !== consume) buffer.pos += len + i + 1;
            return s + chunk.slice(0, i);
          }
          return false;
        },
        /* minimal header reading.  modify if you want to parse more information */
        RGBE_ReadHeader = function (buffer) {
          // regexes to parse header info fields
          var magic_token_re = /^#\?(\S+)/,
            gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
            exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
            format_re = /^\s*FORMAT=(\S+)\s*$/,
            dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
            // RGBE format header struct
            header = {
              valid: 0,
              /* indicate which fields are valid */

              string: '',
              /* the actual header string */

              comments: '',
              /* comments found in header */

              programtype: 'RGBE',
              /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */

              format: '',
              /* RGBE format, default 32-bit_rle_rgbe */

              gamma: 1.0,
              /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */

              exposure: 1.0,
              /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */

              width: 0,
              height: 0 /* image dimensions, width/height */
            };

          var line, match;
          if (buffer.pos >= buffer.byteLength || !(line = fgets(buffer))) {
            return rgbe_error(rgbe_read_error, 'no header found');
          }

          /* if you want to require the magic token then uncomment the next line */
          if (!(match = line.match(magic_token_re))) {
            return rgbe_error(rgbe_format_error, 'bad initial token');
          }
          header.valid |= RGBE_VALID_PROGRAMTYPE;
          header.programtype = match[1];
          header.string += line + '\n';
          while (true) {
            line = fgets(buffer);
            if (false === line) break;
            header.string += line + '\n';
            if ('#' === line.charAt(0)) {
              header.comments += line + '\n';
              continue; // comment line
            }

            if (match = line.match(gamma_re)) {
              header.gamma = parseFloat(match[1], 10);
            }
            if (match = line.match(exposure_re)) {
              header.exposure = parseFloat(match[1], 10);
            }
            if (match = line.match(format_re)) {
              header.valid |= RGBE_VALID_FORMAT;
              header.format = match[1]; //'32-bit_rle_rgbe';
            }

            if (match = line.match(dimensions_re)) {
              header.valid |= RGBE_VALID_DIMENSIONS;
              header.height = parseInt(match[1], 10);
              header.width = parseInt(match[2], 10);
            }
            if (header.valid & RGBE_VALID_FORMAT && header.valid & RGBE_VALID_DIMENSIONS) break;
          }
          if (!(header.valid & RGBE_VALID_FORMAT)) {
            return rgbe_error(rgbe_format_error, 'missing format specifier');
          }
          if (!(header.valid & RGBE_VALID_DIMENSIONS)) {
            return rgbe_error(rgbe_format_error, 'missing image size specifier');
          }
          return header;
        },
        RGBE_ReadPixels_RLE = function (buffer, w, h) {
          var scanline_width = w;
          if (
          // run length encoding is not allowed so read flat
          scanline_width < 8 || scanline_width > 0x7fff ||
          // this file is not run length encoded
          2 !== buffer[0] || 2 !== buffer[1] || buffer[2] & 0x80) {
            // return the flat buffer
            return new Uint8Array(buffer);
          }
          if (scanline_width !== (buffer[2] << 8 | buffer[3])) {
            return rgbe_error(rgbe_format_error, 'wrong scanline width');
          }
          var data_rgba = new Uint8Array(4 * w * h);
          if (!data_rgba.length) {
            return rgbe_error(rgbe_memory_error, 'unable to allocate buffer space');
          }
          var offset = 0,
            pos = 0;
          var ptr_end = 4 * scanline_width;
          var rgbeStart = new Uint8Array(4);
          var scanline_buffer = new Uint8Array(ptr_end);
          var num_scanlines = h;

          // read in each successive scanline
          while (num_scanlines > 0 && pos < buffer.byteLength) {
            if (pos + 4 > buffer.byteLength) {
              return rgbe_error(rgbe_read_error);
            }
            rgbeStart[0] = buffer[pos++];
            rgbeStart[1] = buffer[pos++];
            rgbeStart[2] = buffer[pos++];
            rgbeStart[3] = buffer[pos++];
            if (2 != rgbeStart[0] || 2 != rgbeStart[1] || (rgbeStart[2] << 8 | rgbeStart[3]) != scanline_width) {
              return rgbe_error(rgbe_format_error, 'bad rgbe scanline format');
            }

            // read each of the four channels for the scanline into the buffer
            // first red, then green, then blue, then exponent
            var ptr = 0,
              count = void 0;
            while (ptr < ptr_end && pos < buffer.byteLength) {
              count = buffer[pos++];
              var isEncodedRun = count > 128;
              if (isEncodedRun) count -= 128;
              if (0 === count || ptr + count > ptr_end) {
                return rgbe_error(rgbe_format_error, 'bad scanline data');
              }
              if (isEncodedRun) {
                // a (encoded) run of the same value
                var byteValue = buffer[pos++];
                for (var i = 0; i < count; i++) {
                  scanline_buffer[ptr++] = byteValue;
                }
                //ptr += count;
              } else {
                // a literal-run
                scanline_buffer.set(buffer.subarray(pos, pos + count), ptr);
                ptr += count;
                pos += count;
              }
            }

            // now convert data from buffer into rgba
            // first red, then green, then blue, then exponent (alpha)
            var l = scanline_width; //scanline_buffer.byteLength;
            for (var _i = 0; _i < l; _i++) {
              var off = 0;
              data_rgba[offset] = scanline_buffer[_i + off];
              off += scanline_width; //1;
              data_rgba[offset + 1] = scanline_buffer[_i + off];
              off += scanline_width; //1;
              data_rgba[offset + 2] = scanline_buffer[_i + off];
              off += scanline_width; //1;
              data_rgba[offset + 3] = scanline_buffer[_i + off];
              offset += 4;
            }
            num_scanlines--;
          }
          return data_rgba;
        };
      var RGBEByteToRGBFloat = function (sourceArray, sourceOffset, destArray, destOffset) {
        var e = sourceArray[sourceOffset + 3];
        var scale = Math.pow(2.0, e - 128.0) / 255.0;
        destArray[destOffset + 0] = sourceArray[sourceOffset + 0] * scale;
        destArray[destOffset + 1] = sourceArray[sourceOffset + 1] * scale;
        destArray[destOffset + 2] = sourceArray[sourceOffset + 2] * scale;
      };
      var RGBEByteToRGBHalf = function (sourceArray, sourceOffset, destArray, destOffset) {
        var e = sourceArray[sourceOffset + 3];
        var scale = Math.pow(2.0, e - 128.0) / 255.0;

        // clamping to 65504, the maximum representable value in float16
        destArray[destOffset + 0] = THREE.DataUtils.toHalfFloat(Math.min(sourceArray[sourceOffset + 0] * scale, 65504));
        destArray[destOffset + 1] = THREE.DataUtils.toHalfFloat(Math.min(sourceArray[sourceOffset + 1] * scale, 65504));
        destArray[destOffset + 2] = THREE.DataUtils.toHalfFloat(Math.min(sourceArray[sourceOffset + 2] * scale, 65504));
      };
      var byteArray = new Uint8Array(buffer);
      byteArray.pos = 0;
      var rgbe_header_info = RGBE_ReadHeader(byteArray);
      if (RGBE_RETURN_FAILURE !== rgbe_header_info) {
        var w = rgbe_header_info.width,
          h = rgbe_header_info.height,
          image_rgba_data = RGBE_ReadPixels_RLE(byteArray.subarray(byteArray.pos), w, h);
        if (RGBE_RETURN_FAILURE !== image_rgba_data) {
          var data, format, type;
          var numElements;
          switch (this.type) {
            case THREE.UnsignedByteType:
              data = image_rgba_data;
              format = THREE.RGBEFormat; // handled as THREE.RGBAFormat in shaders
              type = THREE.UnsignedByteType;
              break;
            case THREE.FloatType:
              numElements = image_rgba_data.length / 4;
              var floatArray = new Float32Array(numElements * 3);
              for (var j = 0; j < numElements; j++) {
                RGBEByteToRGBFloat(image_rgba_data, j * 4, floatArray, j * 3);
              }
              data = floatArray;
              format = THREE.RGBFormat;
              type = THREE.FloatType;
              break;
            case THREE.HalfFloatType:
              numElements = image_rgba_data.length / 4;
              var halfArray = new Uint16Array(numElements * 3);
              for (var _j = 0; _j < numElements; _j++) {
                RGBEByteToRGBHalf(image_rgba_data, _j * 4, halfArray, _j * 3);
              }
              data = halfArray;
              format = THREE.RGBFormat;
              type = THREE.HalfFloatType;
              break;
            default:
              console.error('THREE.RGBELoader: unsupported type: ', this.type);
              break;
          }
          return {
            width: w,
            height: h,
            data: data,
            header: rgbe_header_info.string,
            gamma: rgbe_header_info.gamma,
            exposure: rgbe_header_info.exposure,
            format: format,
            type: type
          };
        }
      }
      return null;
    }
    setDataType(value) {
      this.type = value;
      return this;
    }
    load(url, onLoad, onProgress, onError) {
      function onLoadCallback(texture, texData) {
        switch (texture.type) {
          case THREE.UnsignedByteType:
            texture.encoding = THREE.RGBEEncoding;
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            texture.flipY = true;
            break;
          case THREE.FloatType:
            texture.encoding = THREE.LinearEncoding;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.flipY = true;
            break;
          case THREE.HalfFloatType:
            texture.encoding = THREE.LinearEncoding;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.flipY = true;
            break;
        }
        if (onLoad) onLoad(texture, texData);
      }
      return super.load(url, onLoadCallback, onProgress, onError);
    }
  }

  /**
   * Base class for all loaders that View3D uses
   */
  class Loader {
    /** */
    constructor(view3D) {
      this._onLoadingProgress = (evt, src, context) => {
        const view3D = this._view3D;
        context.initialized = true;
        context.lengthComputable = evt.lengthComputable;
        context.loaded = evt.loaded;
        context.total = evt.total;
        view3D.trigger(EVENTS$1.PROGRESS, {
          type: EVENTS$1.PROGRESS,
          target: view3D,
          src,
          lengthComputable: evt.lengthComputable,
          loaded: evt.loaded,
          total: evt.total
        });
      };
      this._view3D = view3D;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Texture loader
   */
  class TextureLoader extends Loader {
    /**
     * Create new TextureLoader instance
     * @param {View3D} view3D An instance of View3D
     */
    constructor(view3D) {
      super(view3D);
    }
    /**
     * Create new {@link https://threejs.org/docs/index.html#api/en/textures/Texture Texture} with given url
     * Texture's {@link https://threejs.org/docs/index.html#api/en/textures/Texture.flipY flipY} property is `true` by Three.js's policy, so be careful when using it as a map texture.
     * @param url url to fetch image
     */
    load(url) {
      const view3D = this._view3D;
      return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        const loadingContext = createLoadingContext(view3D, url);
        loader.setCrossOrigin(ANONYMOUS);
        loader.load(url, resolve, evt => this._onLoadingProgress(evt, url, loadingContext), err => {
          loadingContext.initialized = true;
          reject(err);
        });
      });
    }
    /**
     * Create new texture with given HDR(RGBE) image url
     * @param url image url
     */
    loadHDRTexture(url) {
      const view3D = this._view3D;
      return new Promise((resolve, reject) => {
        const loader = new RGBELoader();
        if (!view3D.renderer.capabilities.halfFloat) {
          loader.type = THREE.FloatType;
        }
        const loadingContext = createLoadingContext(view3D, url);
        loader.setCrossOrigin(ANONYMOUS);
        loader.load(url, texture => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          resolve(texture);
        }, evt => this._onLoadingProgress(evt, url, loadingContext), err => {
          loadingContext.initialized = true;
          reject(err);
        });
      });
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  // Constants that used internally
  // Texture map names that used in THREE#MeshStandardMaterial
  const STANDARD_MAPS = ["alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap", "envMap", "lightMap", "map", "metalnessMap", "normalMap", "roughnessMap", "sheenColorMap", "sheenRoughnessMap", "specularColorMap", "specularIntensityMap", "transmissionMap", "clearcoatMap", "clearcoatNormalMap"];
  const CONTROL_EVENTS = {
    HOLD: "hold",
    RELEASE: "release",
    ENABLE: "enable",
    DISABLE: "disable"
  };
  var GESTURE;
  (function (GESTURE) {
    GESTURE[GESTURE["NONE"] = 0] = "NONE";
    GESTURE[GESTURE["ONE_FINGER_HORIZONTAL"] = 1] = "ONE_FINGER_HORIZONTAL";
    GESTURE[GESTURE["ONE_FINGER_VERTICAL"] = 2] = "ONE_FINGER_VERTICAL";
    GESTURE[GESTURE["ONE_FINGER"] = 3] = "ONE_FINGER";
    GESTURE[GESTURE["TWO_FINGER_HORIZONTAL"] = 4] = "TWO_FINGER_HORIZONTAL";
    GESTURE[GESTURE["TWO_FINGER_VERTICAL"] = 8] = "TWO_FINGER_VERTICAL";
    GESTURE[GESTURE["TWO_FINGER"] = 12] = "TWO_FINGER";
    GESTURE[GESTURE["PINCH"] = 16] = "PINCH";
  })(GESTURE || (GESTURE = {}));
  const VARIANT_EXTENSION = "KHR_materials_variants";
  const CUSTOM_TEXTURE_LOD_EXTENSION = "EXT_View3D_texture_LOD";
  const TEXTURE_LOD_EXTRA = "view3d-lod";
  const ANNOTATION_EXTRA = "view3d-annotation";

  /**
   * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
   * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
   *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
   *
   * - 9 samples per pass
   * - standard deviation 2.7
   * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
   */

  var HorizontalBlurShader = {
    uniforms: {
      'tDiffuse': {
        value: null
      },
      'h': {
        value: 1.0 / 512.0
      }
    },
    vertexShader: /* glsl */"\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvUv = uv;\n\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n\t\t}",
    fragmentShader: /* glsl */"\n\n\t\tuniform sampler2D tDiffuse;\n\t\tuniform float h;\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvec4 sum = vec4( 0.0 );\n\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;\n\n\t\t\tgl_FragColor = sum;\n\n\t\t}"
  };

  /**
   * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
   * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
   *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
   *
   * - 9 samples per pass
   * - standard deviation 2.7
   * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
   */

  var VerticalBlurShader = {
    uniforms: {
      'tDiffuse': {
        value: null
      },
      'v': {
        value: 1.0 / 512.0
      }
    },
    vertexShader: /* glsl */"\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvUv = uv;\n\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n\t\t}",
    fragmentShader: /* glsl */"\n\n\t\tuniform sampler2D tDiffuse;\n\t\tuniform float v;\n\n\t\tvarying vec2 vUv;\n\n\t\tvoid main() {\n\n\t\t\tvec4 sum = vec4( 0.0 );\n\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;\n\t\t\tsum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;\n\n\t\t\tgl_FragColor = sum;\n\n\t\t}"
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Helper class to easily add shadow plane under your 3D model
   */
  class ShadowPlane {
    /**
     * Create new shadow plane
     * @param {object} options Options
     * @param {number} [options.darkness=0.5] Darkness of the shadow.
     * @param {number} [options.mapSize=9] Size of the shadow map. Texture of size (n * n) where n = 2 ^ (mapSize) will be used as shadow map. Should be an integer value.
     * @param {number} [options.blur=3.5] Blurriness of the shadow.
     * @param {number} [options.shadowScale=1] Scale of the shadow range. This usually means which height of the 3D model shadow will be affected by.
     * @param {number} [options.planeScale=2] Scale of the shadow plane. Use higher value if the shadow is clipped.
     */
    constructor(view3D, {
      darkness = 0.5,
      mapSize = 9,
      blur = 3.5,
      shadowScale = 1,
      planeScale = 2
    } = {}) {
      this._view3D = view3D;
      this._darkness = darkness;
      this._mapSize = mapSize;
      this._blur = blur;
      this._shadowScale = shadowScale;
      this._planeScale = planeScale;
      const threeRenderer = view3D.renderer.threeRenderer;
      const maxTextureSize = Math.min(Math.pow(2, Math.floor(mapSize)), threeRenderer.capabilities.maxTextureSize);
      this._root = new THREE.Group();
      this._renderTarget = new THREE.WebGLRenderTarget(maxTextureSize, maxTextureSize, {
        format: THREE.RGBAFormat
      });
      this._blurTarget = new THREE.WebGLRenderTarget(maxTextureSize, maxTextureSize, {
        format: THREE.RGBAFormat
      });
      this._renderTarget.texture.generateMipmaps = false;
      this._blurTarget.texture.generateMipmaps = false;
      const shadowCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0);
      shadowCamera.rotation.x = Math.PI / 2;
      this._shadowCamera = shadowCamera;
      this._root.add(shadowCamera);
      const blurCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0);
      this._blurCamera = blurCamera;
      this._setupPlanes();
    }
    /**
     * Root of the object
     * @readonly
     */
    get root() {
      return this._root;
    }
    /**
     * Darkness of the shadow.
     * @type {number}
     * @default 0.5
     */
    get darkness() {
      return this._darkness;
    }
    /**
     * Size of the shadow map. Texture of size (n * n) where n = 2 ^ (mapSize) will be used as shadow map. Should be an integer value.
     * @type {number}
     * @default 9
     */
    get mapSize() {
      return this._mapSize;
    }
    /**
     * Blurriness of the shadow.
     * @type {number}
     * @default 3.5
     */
    get blur() {
      return this._blur;
    }
    /**
     * Scale of the shadow range. Using higher values will make shadow more even-textured.
     * @type {number}
     * @default 1
     */
    get shadowScale() {
      return this._shadowScale;
    }
    /**
     * Scale of the shadow plane. Use higher value if the shadow is clipped.
     * @type {number}
     * @default 2
     */
    get planeScale() {
      return this._planeScale;
    }
    set darkness(val) {
      this._plane.material.opacity = val;
      this._darkness = val;
    }
    set blur(val) {
      this._blur = val;
    }
    set shadowScale(val) {
      this._shadowScale = val;
      const model = this._view3D.model;
      if (model) {
        this.updateDimensions(model);
      }
    }
    updateDimensions(model) {
      const root = this._root;
      const shadowCam = this._shadowCamera;
      const baseScale = this._planeScale;
      const boundingSphere = model.bbox.getBoundingSphere(new THREE.Sphere());
      const radius = boundingSphere.radius;
      const camSize = baseScale * 2 * radius;
      const shadowScale = this._shadowScale;
      shadowCam.far = shadowScale * (model.bbox.max.y - model.bbox.min.y) / camSize;
      shadowCam.rotation.set(Math.PI / 2, Math.PI, 0, "YXZ");
      root.position.copy(boundingSphere.center).setY(model.bbox.min.y);
      root.scale.setScalar(camSize);
      shadowCam.updateProjectionMatrix();
    }
    render() {
      this._plane.visible = false;
      const view3D = this._view3D;
      const {
        renderer,
        ar
      } = view3D;
      const shadowCamera = this._shadowCamera;
      const threeRenderer = renderer.threeRenderer;
      const scene = ar.activeSession ? ar.activeSession.arScene : view3D.scene;
      // disable XR for offscreen rendering
      const xrEnabled = threeRenderer.xr.enabled;
      threeRenderer.xr.enabled = false;
      const sceneRoot = scene.root;
      const initialBackground = sceneRoot.background;
      sceneRoot.background = null;
      // force the depthMaterial to everything
      sceneRoot.overrideMaterial = this._depthMaterial;
      // set renderer clear alpha
      const initialClearAlpha = threeRenderer.getClearAlpha();
      threeRenderer.setClearAlpha(0);
      // render to the render target to get the depths
      const prevRenderTarget = threeRenderer.getRenderTarget();
      threeRenderer.setRenderTarget(this._renderTarget);
      threeRenderer.clear();
      threeRenderer.render(sceneRoot, shadowCamera);
      // and reset the override material
      sceneRoot.overrideMaterial = null;
      this._blurShadow(this._blur);
      // a second pass to reduce the artifacts
      // (0.4 is the minimum blur amout so that the artifacts are gone)
      this._blurShadow(this._blur * 0.4);
      // reset and render the normal scene
      threeRenderer.xr.enabled = xrEnabled;
      threeRenderer.setRenderTarget(prevRenderTarget);
      threeRenderer.setClearAlpha(initialClearAlpha);
      sceneRoot.background = initialBackground;
      this._plane.visible = true;
    }
    _blurShadow(amount) {
      const {
        renderer
      } = this._view3D;
      const blurCamera = this._blurCamera;
      const threeRenderer = renderer.threeRenderer;
      const blurPlane = this._blurPlane;
      const renderTarget = this._renderTarget;
      const blurTarget = this._blurTarget;
      const horizontalBlurMaterial = this._horizontalBlurMaterial;
      const verticalBlurMaterial = this._verticalBlurMaterial;
      blurPlane.visible = true;
      // blur horizontally and draw in the renderTargetBlur
      horizontalBlurMaterial.uniforms.tDiffuse.value = renderTarget.texture;
      horizontalBlurMaterial.uniforms.h.value = amount * 1 / 256;
      horizontalBlurMaterial.needsUpdate = true;
      blurPlane.material = horizontalBlurMaterial;
      threeRenderer.setRenderTarget(blurTarget);
      threeRenderer.render(blurPlane, blurCamera);
      // blur vertically and draw in the main renderTarget
      verticalBlurMaterial.uniforms.tDiffuse.value = blurTarget.texture;
      verticalBlurMaterial.uniforms.v.value = amount * 1 / 256;
      verticalBlurMaterial.needsUpdate = true;
      blurPlane.material = verticalBlurMaterial;
      threeRenderer.setRenderTarget(renderTarget);
      threeRenderer.render(blurPlane, blurCamera);
      blurPlane.visible = false;
    }
    _setupPlanes() {
      const root = this._root;
      const planeGeometry = new THREE.PlaneBufferGeometry();
      const planeMat = new THREE.MeshBasicMaterial({
        opacity: this._darkness,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        map: this._renderTarget.texture
      });
      const plane = new THREE.Mesh(planeGeometry, planeMat);
      plane.renderOrder = 1;
      plane.scale.set(-1, -1, 1);
      plane.rotation.order = "YXZ";
      plane.rotation.x = Math.PI / 2;
      this._plane = plane;
      root.add(plane);
      const blurPlane = new THREE.Mesh(planeGeometry);
      this._blurPlane = blurPlane;
      const depthMaterial = new THREE.MeshDepthMaterial();
      depthMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = `
        ${shader.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );", "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * opacity );")}`;
      };
      this._depthMaterial = depthMaterial;
      const horizontalBlurMaterial = new THREE.ShaderMaterial(HorizontalBlurShader);
      horizontalBlurMaterial.depthTest = false;
      this._horizontalBlurMaterial = horizontalBlurMaterial;
      const verticalBlurMaterial = new THREE.ShaderMaterial(VerticalBlurShader);
      verticalBlurMaterial.depthTest = false;
      this._verticalBlurMaterial = verticalBlurMaterial;
    }
  }

  class LightProbeGenerator {
    // https://www.ppsloan.org/publications/StupidSH36.pdf
    static fromCubeTexture(cubeTexture) {
      var totalWeight = 0;
      var coord = new THREE.Vector3();
      var dir = new THREE.Vector3();
      var color = new THREE.Color();
      var shBasis = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      var sh = new THREE.SphericalHarmonics3();
      var shCoefficients = sh.coefficients;
      for (var faceIndex = 0; faceIndex < 6; faceIndex++) {
        var image = cubeTexture.image[faceIndex];
        var width = image.width;
        var height = image.height;
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        var imageData = context.getImageData(0, 0, width, height);
        var data = imageData.data;
        var imageWidth = imageData.width; // assumed to be square

        var pixelSize = 2 / imageWidth;
        for (var i = 0, il = data.length; i < il; i += 4) {
          // RGBA assumed

          // pixel color
          color.setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);

          // convert to linear color space
          convertColorToLinear(color, cubeTexture.encoding);

          // pixel coordinate on unit cube

          var pixelIndex = i / 4;
          var col = -1 + (pixelIndex % imageWidth + 0.5) * pixelSize;
          var row = 1 - (Math.floor(pixelIndex / imageWidth) + 0.5) * pixelSize;
          switch (faceIndex) {
            case 0:
              coord.set(-1, row, -col);
              break;
            case 1:
              coord.set(1, row, col);
              break;
            case 2:
              coord.set(-col, 1, -row);
              break;
            case 3:
              coord.set(-col, -1, row);
              break;
            case 4:
              coord.set(-col, row, 1);
              break;
            case 5:
              coord.set(col, row, -1);
              break;
          }

          // weight assigned to this pixel

          var lengthSq = coord.lengthSq();
          var weight = 4 / (Math.sqrt(lengthSq) * lengthSq);
          totalWeight += weight;

          // direction vector to this pixel
          dir.copy(coord).normalize();

          // evaluate SH basis functions in direction dir
          THREE.SphericalHarmonics3.getBasisAt(dir, shBasis);

          // accummuulate
          for (var j = 0; j < 9; j++) {
            shCoefficients[j].x += shBasis[j] * color.r * weight;
            shCoefficients[j].y += shBasis[j] * color.g * weight;
            shCoefficients[j].z += shBasis[j] * color.b * weight;
          }
        }
      }

      // normalize
      var norm = 4 * Math.PI / totalWeight;
      for (var _j = 0; _j < 9; _j++) {
        shCoefficients[_j].x *= norm;
        shCoefficients[_j].y *= norm;
        shCoefficients[_j].z *= norm;
      }
      return new THREE.LightProbe(sh);
    }
    static fromCubeRenderTarget(renderer, cubeRenderTarget) {
      // The renderTarget must be set to RGBA in order to make readRenderTargetPixels works
      var totalWeight = 0;
      var coord = new THREE.Vector3();
      var dir = new THREE.Vector3();
      var color = new THREE.Color();
      var shBasis = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      var sh = new THREE.SphericalHarmonics3();
      var shCoefficients = sh.coefficients;
      for (var faceIndex = 0; faceIndex < 6; faceIndex++) {
        var imageWidth = cubeRenderTarget.width; // assumed to be square
        var data = new Uint8Array(imageWidth * imageWidth * 4);
        renderer.readRenderTargetPixels(cubeRenderTarget, 0, 0, imageWidth, imageWidth, data, faceIndex);
        var pixelSize = 2 / imageWidth;
        for (var i = 0, il = data.length; i < il; i += 4) {
          // RGBA assumed

          // pixel color
          color.setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);

          // convert to linear color space
          convertColorToLinear(color, cubeRenderTarget.texture.encoding);

          // pixel coordinate on unit cube

          var pixelIndex = i / 4;
          var col = -1 + (pixelIndex % imageWidth + 0.5) * pixelSize;
          var row = 1 - (Math.floor(pixelIndex / imageWidth) + 0.5) * pixelSize;
          switch (faceIndex) {
            case 0:
              coord.set(1, row, -col);
              break;
            case 1:
              coord.set(-1, row, col);
              break;
            case 2:
              coord.set(col, 1, -row);
              break;
            case 3:
              coord.set(col, -1, row);
              break;
            case 4:
              coord.set(col, row, 1);
              break;
            case 5:
              coord.set(-col, row, -1);
              break;
          }

          // weight assigned to this pixel

          var lengthSq = coord.lengthSq();
          var weight = 4 / (Math.sqrt(lengthSq) * lengthSq);
          totalWeight += weight;

          // direction vector to this pixel
          dir.copy(coord).normalize();

          // evaluate SH basis functions in direction dir
          THREE.SphericalHarmonics3.getBasisAt(dir, shBasis);

          // accummuulate
          for (var j = 0; j < 9; j++) {
            shCoefficients[j].x += shBasis[j] * color.r * weight;
            shCoefficients[j].y += shBasis[j] * color.g * weight;
            shCoefficients[j].z += shBasis[j] * color.b * weight;
          }
        }
      }

      // normalize
      var norm = 4 * Math.PI / totalWeight;
      for (var _j2 = 0; _j2 < 9; _j2++) {
        shCoefficients[_j2].x *= norm;
        shCoefficients[_j2].y *= norm;
        shCoefficients[_j2].z *= norm;
      }
      return new THREE.LightProbe(sh);
    }
  }
  function convertColorToLinear(color, encoding) {
    switch (encoding) {
      case THREE.sRGBEncoding:
        color.convertSRGBToLinear();
        break;
      case THREE.LinearEncoding:
        break;
      default:
        console.warn('WARNING: LightProbeGenerator convertColorToLinear() encountered an unsupported encoding.');
        break;
    }
    return color;
  }

  /**
   * Skybox texture generator
   */
  class Skybox {
    static createDefaultEnv(renderer) {
      const envScene = new THREE.Scene();
      const point = new THREE.PointLight(0xffffff, 0.8, 20);
      point.decay = 2;
      point.position.set(0, 7, 0);
      envScene.add(point);
      const boxGeo = new THREE.BoxBufferGeometry(1, 1, 1);
      const boxMat = new THREE.MeshStandardMaterial({
        side: THREE.BackSide
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = false;
      box.scale.set(15, 45, 15);
      box.position.set(0, 20, 0);
      envScene.add(box);
      const topLight = Skybox._createRectAreaLightSource({
        intensity: 4.5,
        width: 4,
        height: 4
      });
      topLight.position.set(0, 2.5, 0);
      topLight.rotateX(Math.PI / 2);
      const frontLightIntensity = 3;
      const frontLight0 = Skybox._createRectAreaLightSource({
        intensity: frontLightIntensity,
        width: 2,
        height: 2
      });
      frontLight0.position.set(0, 1, 4);
      frontLight0.lookAt(0, 0, 0);
      const frontLight1 = Skybox._createRectAreaLightSource({
        intensity: frontLightIntensity,
        width: 2,
        height: 2
      });
      frontLight1.position.set(-4, 1, 1);
      frontLight1.lookAt(0, 0, 0);
      const frontLight2 = Skybox._createRectAreaLightSource({
        intensity: frontLightIntensity,
        width: 2,
        height: 2
      });
      frontLight2.position.set(4, 1, 1);
      frontLight2.lookAt(0, 0, 0);
      const backLight1 = Skybox._createRectAreaLightSource({
        intensity: 2.5,
        width: 2,
        height: 2
      });
      backLight1.position.set(1.5, 1, -4);
      backLight1.lookAt(0, 0, 0);
      const backLight2 = Skybox._createRectAreaLightSource({
        intensity: 2.5,
        width: 2,
        height: 2
      });
      backLight2.position.set(-1.5, 1, -4);
      backLight2.lookAt(0, 0, 0);
      envScene.add(topLight, frontLight0, frontLight1, frontLight2, backLight1, backLight2);
      const outputEncoding = renderer.outputEncoding;
      const toneMapping = renderer.toneMapping;
      renderer.outputEncoding = THREE.LinearEncoding;
      renderer.toneMapping = THREE.NoToneMapping;
      const renderTarget = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.035);
      renderer.outputEncoding = outputEncoding;
      renderer.toneMapping = toneMapping;
      return renderTarget.texture;
    }
    /**
     * Create blurred cubemap texture of the given texture and use that as the skybox
     * @param {THREE.Texture} texture Equirect texture
     * @returns {this}
     */
    static createBlurredHDR(view3D, texture) {
      const threeRenderer = view3D.renderer.threeRenderer;
      const bgScene = new THREE.Scene();
      bgScene.background = texture;
      // To prevent exposure applied twice
      const origExposure = threeRenderer.toneMappingExposure;
      threeRenderer.toneMappingExposure = 1;
      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        encoding: THREE.sRGBEncoding,
        format: THREE.RGBAFormat
      });
      const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
      cubeCamera.update(threeRenderer, bgScene);
      const lightProbe = LightProbeGenerator.fromCubeRenderTarget(threeRenderer, cubeRenderTarget);
      const skyboxMat = new THREE.MeshStandardMaterial({
        side: THREE.BackSide
      });
      const geometry = new THREE.IcosahedronBufferGeometry(1, 4);
      const skyboxScene = new THREE.Scene();
      const skyboxMesh = new THREE.Mesh(geometry, skyboxMat);
      const normals = geometry.getAttribute("normal");
      for (let i = 0; i < normals.count; i++) {
        normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i));
      }
      skyboxScene.add(skyboxMesh);
      skyboxScene.add(lightProbe);
      cubeCamera.update(threeRenderer, skyboxScene);
      threeRenderer.toneMappingExposure = origExposure;
      return cubeRenderTarget.texture;
    }
    static _createRectAreaLightSource({
      intensity,
      width,
      height
    }) {
      const planeBufferGeo = new THREE.PlaneBufferGeometry(width, height);
      const mat = new THREE.MeshBasicMaterial();
      mat.color.setScalar(intensity);
      return new THREE.Mesh(planeBufferGeo, mat);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Scene that View3D will render.
   * All model datas including Mesh, Lights, etc. will be included on this
   */
  class Scene {
    /**
     * Create new Scene instance
     * @param {View3D} view3D An instance of View3D
     */
    constructor(view3D) {
      this._view3D = view3D;
      this._root = new THREE.Scene();
      this._userObjects = new THREE.Group();
      this._envObjects = new THREE.Group();
      this._fixedObjects = new THREE.Group();
      this._shadowPlane = new ShadowPlane(view3D, getObjectOption(view3D.shadow));
      const root = this._root;
      const userObjects = this._userObjects;
      const envObjects = this._envObjects;
      const fixedObjects = this._fixedObjects;
      const shadowPlane = this._shadowPlane;
      userObjects.name = "userObjects";
      envObjects.name = "envObjects";
      fixedObjects.name = "fixedObjects";
      root.add(userObjects, envObjects, fixedObjects);
      if (view3D.shadow) {
        fixedObjects.add(shadowPlane.root);
      }
    }
    /**
     * Root {@link https://threejs.org/docs/#api/en/scenes/Scene THREE.Scene} object
     * @readonly
     */
    get root() {
      return this._root;
    }
    /**
     * Shadow plane & light
     * @type {ShadowPlane}
     * @readonly
     */
    get shadowPlane() {
      return this._shadowPlane;
    }
    /**
     * Group that contains volatile user objects
     * @readonly
     */
    get userObjects() {
      return this._userObjects;
    }
    /**
     * Group that contains non-volatile user objects
     * @readonly
     */
    get envObjects() {
      return this._envObjects;
    }
    /**
     * Group that contains objects that View3D manages
     * @readonly
     */
    get fixedObjects() {
      return this._fixedObjects;
    }
    /**
     * Reset scene to initial state
     * @param {object} options Options
     * @param {boolean} [options.volatileOnly=true] Remove only volatile objects
     * @returns {void}
     */
    reset({
      volatileOnly = true
    } = {}) {
      this._removeChildsOf(this._userObjects);
      if (!volatileOnly) {
        this._removeChildsOf(this._envObjects);
      }
    }
    /**
     * Add new Three.js {@link https://threejs.org/docs/#api/en/core/Object3D Object3D} into the scene
     * @param object {@link https://threejs.org/docs/#api/en/core/Object3D THREE.Object3D}s to add
     * @param volatile If set to true, objects will be removed after displaying another 3D model
     * @returns {void}
     */
    add(object, volatile = true) {
      const objRoot = volatile ? this._userObjects : this._envObjects;
      const objects = Array.isArray(object) ? object : [object];
      objRoot.add(...objects);
    }
    /**
     * Remove Three.js {@link https://threejs.org/docs/#api/en/core/Object3D Object3D} into the scene
     * @param object {@link https://threejs.org/docs/#api/en/core/Object3D THREE.Object3D}s to add
     * @returns {void}
     */
    remove(object) {
      const objects = Array.isArray(object) ? object : [object];
      this._userObjects.remove(...objects);
      this._envObjects.remove(...objects);
    }
    /**
     * Set background of the scene.
     * @param background A color / image url to set as background
     * @returns {Promise<void>}
     */
    setBackground(background) {
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const root = this._root;
        if (typeof background === "number" || background.charAt(0) === "#") {
          root.background = new THREE.Color(background);
        } else {
          const textureLoader = new TextureLoader(view3D);
          const texture = yield textureLoader.load(background);
          texture.encoding = THREE.sRGBEncoding;
          root.background = texture;
        }
        view3D.renderer.renderSingleFrame();
      });
    }
    /**
     * Set scene's skybox, which both affects background & envmap
     * @param url An URL to equirectangular image
     * @returns {Promise<void>}
     */
    setSkybox(url) {
      return __awaiter(this, void 0, void 0, function* () {
        const root = this._root;
        const view3D = this._view3D;
        // Destroy previous skybox
        if (root.background && root.background.isTexture) {
          root.background.dispose();
        }
        if (url) {
          const textureLoader = new TextureLoader(view3D);
          const texture = yield textureLoader.loadHDRTexture(url);
          if (view3D.skyboxBlur) {
            root.background = Skybox.createBlurredHDR(view3D, texture);
          } else {
            root.background = texture;
          }
          root.environment = texture;
        } else {
          root.background = null;
          root.environment = null;
        }
        view3D.renderer.renderSingleFrame();
      });
    }
    /**
     * Set scene's environment map that affects all physical materials in the scene
     * @param url An URL to equirectangular image
     * @returns {void}
     */
    setEnvMap(url) {
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const root = this._root;
        if (url) {
          const textureLoader = new TextureLoader(view3D);
          const texture = yield textureLoader.loadHDRTexture(url);
          root.environment = texture;
        } else {
          root.environment = null;
        }
        view3D.renderer.renderSingleFrame();
      });
    }
    /**
     * @internal
     */
    initTextures() {
      const {
        skybox,
        envmap,
        background,
        useDefaultEnv
      } = this._view3D;
      const tasks = [];
      if (useDefaultEnv) {
        this.setDefaultEnv();
      }
      const hasEnvmap = skybox || envmap;
      if (hasEnvmap) {
        const loadEnv = skybox ? this.setSkybox(skybox) : this.setEnvMap(envmap);
        tasks.push(loadEnv);
      }
      if (!skybox && background) {
        tasks.push(this.setBackground(background));
      }
      return tasks;
    }
    /**
     * @internal
     */
    setDefaultEnv() {
      const renderer = this._view3D.renderer;
      const defaultEnv = Skybox.createDefaultEnv(renderer.threeRenderer);
      this._root.environment = defaultEnv;
    }
    _removeChildsOf(obj) {
      obj.traverse(child => {
        if (child.isMesh) {
          const mesh = child;
          // Release geometry & material memory
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            STANDARD_MAPS.forEach(map => {
              if (mat[map]) {
                mat[map].dispose();
              }
            });
          });
        }
      });
      while (obj.children.length > 0) {
        obj.remove(obj.children[0]);
      }
    }
  }

  // Animation
  const EASING$1 = EASING.EASE_OUT_CUBIC;
  const ANIMATION_DURATION = 300;
  const ANIMATION_LOOP = false;
  const ANIMATION_RANGE = {
    min: 0,
    max: 1
  };
  // Camera
  const FOV = 45;
  const INFINITE_RANGE = {
    min: -Infinity,
    max: Infinity
  };
  const PITCH_RANGE = {
    min: -89.9,
    max: 89.9
  };
  const ANNOTATION_BREAKPOINT = {
    165: 0,
    135: 0.4,
    0: 1
  };
  const AR_OVERLAY_CLASS = "view3d-ar-overlay";
  const DRACO_DECODER_URL = "https://www.gstatic.com/draco/versioned/decoders/1.4.1/";
  const KTX_TRANSCODER_URL = "https://unpkg.com/three@0.134.0/examples/js/libs/basis/";
  const AR_PRIORITY = [AR_SESSION_TYPE.WEBXR, AR_SESSION_TYPE.SCENE_VIEWER, AR_SESSION_TYPE.QUICK_LOOK];

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  class Motion {
    constructor({
      duration = ANIMATION_DURATION,
      loop = ANIMATION_LOOP,
      range = ANIMATION_RANGE,
      easing = EASING$1
    } = {}) {
      this._duration = duration;
      this._loop = loop;
      this._range = range;
      this._easing = easing;
      this._activated = false;
      this.reset(0);
    }
    get val() {
      return this._val;
    }
    get start() {
      return this._start;
    }
    get end() {
      return this._end;
    }
    get progress() {
      return this._progress;
    }
    get duration() {
      return this._duration;
    }
    get loop() {
      return this._loop;
    }
    get range() {
      return this._range;
    }
    get easing() {
      return this._easing;
    }
    get activated() {
      return this._activated;
    }
    set duration(val) {
      this._duration = val;
    }
    set loop(val) {
      this._loop = val;
    }
    set range(val) {
      this._range = val;
    }
    set easing(val) {
      this._easing = val;
    }
    /**
     * Update motion and progress it by given deltaTime
     * @param deltaTime number of milisec to update motion
     * @returns Difference(delta) of the value from the last update.
     */
    update(deltaTime) {
      if (!this._activated) return 0;
      const start = this._start;
      const end = this._end;
      const duration = this._duration;
      const prev = this._val;
      const loop = this._loop;
      const nextProgress = this._progress + deltaTime / duration;
      this._progress = loop ? circulate(nextProgress, 0, 1) : clamp(nextProgress, 0, 1);
      const easedProgress = this._easing(this._progress);
      this._val = lerp(start, end, easedProgress);
      if (!loop && this._progress >= 1) {
        this._activated = false;
      }
      return this._val - prev;
    }
    reset(defaultVal) {
      const range = this._range;
      const val = clamp(defaultVal, range.min, range.max);
      this._start = val;
      this._end = val;
      this._val = val;
      this._progress = 0;
      this._activated = false;
    }
    setEndDelta(delta) {
      const range = this._range;
      this._start = this._val;
      this._end = clamp(this._end + delta, range.min, range.max);
      this._progress = 0;
      this._activated = true;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Control that animates model without user input
   */
  class AnimationControl {
    /**
     * Create new instance of AnimationControl
     * @param from Start pose
     * @param to End pose
     * @param {object} options Options
     * @param {number} [options.duration=500] Animation duration
     * @param {function} [options.easing=(x: number) => 1 - Math.pow(1 - x, 3)] Animation easing function
     */
    constructor(view3D, from, to, {
      duration = ANIMATION_DURATION,
      easing = EASING$1,
      disableOnFinish = true
    } = {}) {
      this._enabled = false;
      this._finishCallbacks = [];
      this._view3D = view3D;
      this._motion = new Motion({
        duration,
        range: ANIMATION_RANGE,
        easing
      });
      this._disableOnFinish = disableOnFinish;
      this.changeStartEnd(from, to);
    }
    get element() {
      return null;
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Duration of the animation
     */
    get duration() {
      return this._motion.duration;
    }
    /**
     * Easing function of the animation
     */
    get easing() {
      return this._motion.easing;
    }
    /**
     * Whether this control is animating the camera
     * @readonly
     * @type {boolean}
     */
    get animating() {
      return this._motion.activated;
    }
    set duration(val) {
      this._motion.duration = val;
    }
    set easing(val) {
      this._motion.easing = val;
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * This also will reset CSS cursor to intial
     * @returns {void}
     */
    destroy() {
      this.disable();
    }
    changeStartEnd(from, to) {
      from = from.clone();
      to = to.clone();
      from.yaw = circulate(from.yaw, 0, 360);
      to.yaw = circulate(to.yaw, 0, 360);
      // Take the smaller degree
      if (Math.abs(to.yaw - from.yaw) > 180) {
        to.yaw = to.yaw < from.yaw ? to.yaw + 360 : to.yaw - 360;
      }
      this._from = from;
      this._to = to;
    }
    /**
     * Update control by given deltaTime
     * @param deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      if (!this._enabled) return;
      const camera = this._view3D.camera;
      const from = this._from;
      const to = this._to;
      const motion = this._motion;
      motion.update(deltaTime);
      // Progress that easing is applied
      const progress = motion.val;
      camera.yaw = lerp(from.yaw, to.yaw, progress);
      camera.pitch = lerp(from.pitch, to.pitch, progress);
      camera.zoom = lerp(from.zoom, to.zoom, progress);
      camera.pivot = from.pivot.clone().lerp(to.pivot, progress);
      if (progress >= 1) {
        if (this._disableOnFinish) {
          this.disable();
        }
        this._finishCallbacks.forEach(callback => callback());
        this.clearFinished();
      }
    }
    /**
     * Enable this input and add event listeners
     * @returns {void}
     */
    enable() {
      if (this._enabled) return;
      this._enabled = true;
      this.reset();
    }
    /**
     * Disable this input and remove all event handlers
     * @returns {void}
     */
    disable() {
      if (!this._enabled) return;
      this._enabled = false;
    }
    reset() {
      this._motion.reset(0);
      this._motion.setEndDelta(1);
    }
    /**
     * Add callback which is called when animation is finished
     * @param callback Callback that will be called when animation finishes
     * @returns {void}
     */
    onFinished(callback) {
      this._finishCallbacks.push(callback);
    }
    /**
     * Remove all onFinished callbacks
     * @returns {void}
     */
    clearFinished() {
      this._finishCallbacks = [];
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    resize(size) {
      // DO NOTHING
    }
    sync() {
      // Do nothing
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Data class of camera's pose
   */
  class Pose {
    /**
     * Create new instance of pose
     * @param {number} yaw yaw
     * @param {number} pitch pitch
     * @param {number} zoom zoom
     * @param {number[]} pivot pivot
     * @example
     * ```ts
     * import { THREE, Pose } from "@egjs/view3d";
     *
     * const pose = new Pose(180, 45, 150, [5, -1, 3]);
     * ```
     */
    constructor(yaw, pitch, zoom, pivot = [0, 0, 0]) {
      this.yaw = yaw;
      this.pitch = pitch;
      this.zoom = zoom;
      this.pivot = new THREE.Vector3().fromArray(pivot);
    }
    /**
     * Clone this pose
     * @returns Cloned pose
     */
    clone() {
      return new Pose(this.yaw, this.pitch, this.zoom, this.pivot.toArray());
    }
    /**
     * Copy values from the other pose
     * @param {Pose} pose pose to copy
     */
    copy(pose) {
      this.yaw = pose.yaw;
      this.pitch = pose.pitch;
      this.zoom = pose.zoom;
      this.pivot.copy(pose.pivot);
    }
    /**
     * Return whether values of this pose is equal to other pose
     * @param {Pose} pose pose to check
     */
    equals(pose) {
      const {
        yaw,
        pitch,
        zoom,
        pivot
      } = this;
      return circulate(yaw, 0, 360) === circulate(pose.yaw, 0, 360) && pitch === pose.pitch && zoom === pose.zoom && pivot.equals(pose.pivot);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Camera that renders the scene of View3D
   */
  class Camera {
    /**
     * Create new Camera instance
     * @param {View3D} view3D An instance of View3D
     */
    constructor(view3D) {
      this._view3D = view3D;
      this._threeCamera = new THREE.PerspectiveCamera();
      this._maxTanHalfHFov = 0;
      this._baseFov = 45;
      this._baseDistance = 0;
      const initialZoom = isNumber(view3D.initialZoom) ? view3D.initialZoom : 0;
      this._defaultPose = new Pose(view3D.yaw, view3D.pitch, initialZoom);
      this._currentPose = this._defaultPose.clone();
      this._newPose = this._currentPose.clone();
    }
    /**
     * Three.js {@link https://threejs.org/docs/#api/en/cameras/PerspectiveCamera PerspectiveCamera} instance
     * @readonly
     * @type THREE.PerspectiveCamera
     */
    get threeCamera() {
      return this._threeCamera;
    }
    /**
     * Camera's default pose(yaw, pitch, zoom, pivot)
     * This will be new currentPose when {@link Camera#reset reset()} is called
     * @readonly
     * @type {Pose}
     */
    get defaultPose() {
      return this._defaultPose;
    }
    /**
     * Camera's current pose value
     * @readonly
     * @type {Pose}
     */
    get currentPose() {
      return this._currentPose.clone();
    }
    /**
     * Camera's new pose that will be applied on the next frame
     * {@link Camera#updatePosition} should be called after changing this value.
     * @type {Pose}
     */
    get newPose() {
      return this._newPose;
    }
    /**
     * Camera's current yaw
     * {@link Camera#updatePosition} should be called after changing this value.
     * @type {number}
     */
    get yaw() {
      return this._currentPose.yaw;
    }
    /**
     * Camera's current pitch
     * {@link Camera#updatePosition} should be called after changing this value.
     * @type {number}
     */
    get pitch() {
      return this._currentPose.pitch;
    }
    /**
     * Camera's current zoom value
     * {@link Camera#updatePosition} should be called after changing this value.
     * @type {number}
     */
    get zoom() {
      return this._currentPose.zoom;
    }
    /**
     * Camera's disatance from current camera pivot(target)
     * @type {number}
     * @readonly
     */
    get distance() {
      return this._view3D.control.zoom.type === ZOOM_TYPE.FOV ? this._baseDistance : this._baseDistance - this._currentPose.zoom;
    }
    /**
     * Camera's default distance from the model center.
     * This will be automatically calculated based on the model size.
     * @type {number}
     * @readonly
     */
    get baseDistance() {
      return this._baseDistance;
    }
    /**
     * Camera's default fov value.
     * This will be automatically chosen when `view3D.fov` is "auto", otherwise it is equal to `view3D.fov`
     * @type {number}
     * @readonly
     */
    get baseFov() {
      return this._baseFov;
    }
    /**
     * Current pivot point of camera rotation
     * @type THREE.Vector3
     * @readonly
     * @see {@link https://threejs.org/docs/#api/en/math/Vector3 THREE#Vector3}
     */
    get pivot() {
      return this._currentPose.pivot;
    }
    /**
     * Camera's focus of view value (vertical)
     * @type number
     * @readonly
     * @see {@link https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.fov THREE#PerspectiveCamera}
     */
    get fov() {
      return this._threeCamera.fov;
    }
    /**
     * Camera's frustum width
     * @type number
     * @readonly
     */
    get renderWidth() {
      return this.renderHeight * this._threeCamera.aspect;
    }
    /**
     * Camera's frustum height
     * @type number
     * @readonly
     */
    get renderHeight() {
      return 2 * this.distance * Math.tan(toRadian(this._threeCamera.getEffectiveFOV() / 2));
    }
    set yaw(val) {
      this._newPose.yaw = val;
    }
    set pitch(val) {
      this._newPose.pitch = val;
    }
    set zoom(val) {
      this._newPose.zoom = val;
    }
    set pivot(val) {
      this._newPose.pivot.copy(val);
    }
    set baseFov(val) {
      this._baseFov = val;
    }
    /**
     * Reset camera to default pose
     * @param {number} [duration=0] Duration of the reset animation
     * @param {function} [easing] Easing function for the reset animation
     * @param {Pose} [pose] Pose to reset, camera will reset to `defaultPose` if pose is not given.
     * @returns Promise that resolves when the animation finishes
     */
    reset(duration = 0, easing = EASING$1, pose) {
      const view3D = this._view3D;
      const control = view3D.control;
      const autoPlayer = view3D.autoPlayer;
      const newPose = this._newPose;
      const currentPose = this._currentPose;
      const targetPose = pose !== null && pose !== void 0 ? pose : this._defaultPose;
      if (duration <= 0) {
        // Reset camera immediately
        newPose.copy(targetPose);
        currentPose.copy(targetPose);
        view3D.renderer.renderSingleFrame();
        control.sync();
        return Promise.resolve();
      } else {
        // Play the animation
        const autoplayEnabled = autoPlayer.enabled;
        const resetControl = new AnimationControl(view3D, currentPose, targetPose);
        resetControl.duration = duration;
        resetControl.easing = easing;
        resetControl.enable();
        if (autoplayEnabled) {
          autoPlayer.disable();
        }
        control.add(resetControl);
        return new Promise(resolve => {
          resetControl.onFinished(() => {
            newPose.copy(targetPose);
            currentPose.copy(targetPose);
            control.remove(resetControl);
            control.sync();
            if (autoplayEnabled) {
              autoPlayer.enableAfterDelay();
            }
            resolve();
          });
        });
      }
    }
    /**
     * Update camera's aspect to given size
     * @param {object} size New size to apply
     * @param {number} [size.width] New width
     * @param {number} [size.height] New height
     * @returns {void}
     */
    resize({
      width,
      height
    }, prevSize = null) {
      const {
        control,
        fov,
        maintainSize
      } = this._view3D;
      const threeCamera = this._threeCamera;
      const aspect = width / height;
      threeCamera.aspect = aspect;
      if (fov === AUTO) {
        if (!maintainSize || prevSize == null) {
          this._applyEffectiveFov(FOV);
        } else {
          const heightRatio = height / prevSize.height;
          const currentZoom = this._currentPose.zoom;
          const tanHalfFov = Math.tan(toRadian((this._baseFov - currentZoom) / 2));
          this._baseFov = toDegree(2 * Math.atan(heightRatio * tanHalfFov)) + currentZoom;
        }
      } else {
        this._baseFov = fov;
      }
      control.zoom.updateRange();
    }
    /**
     * Fit camera frame to the given model
     */
    fit(model) {
      const view3D = this._view3D;
      const camera = this._threeCamera;
      const defaultPose = this._defaultPose;
      const control = view3D.control;
      const pivot = view3D.pivot;
      const bbox = model.bbox;
      const fov = view3D.fov;
      const hfov = fov === AUTO ? FOV : fov;
      const modelCenter = model.center;
      const maxDistToCenterSquared = view3D.ignoreCenterOnFit || view3D.center === AUTO ? new THREE.Vector3().subVectors(bbox.max, bbox.min).lengthSq() / 4 : model.reduceVertices((dist, vertice) => {
        return Math.max(dist, vertice.distanceToSquared(modelCenter));
      }, 0);
      const maxDistToCenter = Math.sqrt(maxDistToCenterSquared);
      const effectiveCamDist = maxDistToCenter / Math.sin(toRadian(hfov / 2));
      const maxTanHalfHFov = model.reduceVertices((res, vertex) => {
        const distToCenter = new THREE.Vector3().subVectors(vertex, modelCenter);
        const radiusXZ = Math.hypot(distToCenter.x, distToCenter.z);
        return Math.max(res, radiusXZ / (effectiveCamDist - Math.abs(distToCenter.y)));
      }, 0);
      if (fov === AUTO) {
        // Cache for later use in resize
        this._maxTanHalfHFov = maxTanHalfHFov;
        this._applyEffectiveFov(hfov);
      } else {
        this._maxTanHalfHFov = fov;
      }
      defaultPose.pivot = pivot === AUTO ? modelCenter.clone() : parseAsBboxRatio(pivot, bbox);
      this._baseDistance = effectiveCamDist;
      camera.near = (effectiveCamDist - maxDistToCenter) * 0.1;
      camera.far = (effectiveCamDist + maxDistToCenter) * 10;
      control.zoom.updateRange();
      if (!isNumber(view3D.initialZoom)) {
        const baseFov = this._baseFov;
        const modelBbox = model.bbox;
        const alignAxis = view3D.initialZoom.axis;
        const targetRatio = view3D.initialZoom.ratio;
        const bboxDiff = new THREE.Vector3().subVectors(modelBbox.max, modelBbox.min);
        const axisDiff = bboxDiff[alignAxis];
        const newViewHeight = alignAxis === "y" ? axisDiff / targetRatio : axisDiff / (targetRatio * camera.aspect);
        const camDist = alignAxis !== "z" ? effectiveCamDist - bboxDiff.z / 2 : effectiveCamDist - bboxDiff.x / 2;
        const newFov = toDegree(2 * Math.atan(newViewHeight / (2 * camDist)));
        defaultPose.zoom = baseFov - newFov;
      } else {
        defaultPose.zoom = view3D.initialZoom;
      }
    }
    /**
     * Update camera position
     * @returns {void}
     */
    updatePosition() {
      const view3D = this._view3D;
      const control = view3D.control;
      const threeCamera = this._threeCamera;
      const currentPose = this._currentPose;
      const newPose = this._newPose;
      const baseFov = this._baseFov;
      const baseDistance = this._baseDistance;
      const isFovZoom = control.zoom.type === ZOOM_TYPE.FOV;
      const prevPose = currentPose.clone();
      // Clamp current pose
      currentPose.yaw = circulate(newPose.yaw, 0, 360);
      currentPose.pitch = clamp(newPose.pitch, PITCH_RANGE.min, PITCH_RANGE.max);
      currentPose.zoom = newPose.zoom;
      currentPose.pivot.copy(newPose.pivot);
      const fov = isFovZoom ? baseFov - currentPose.zoom : baseFov;
      const distance = isFovZoom ? baseDistance : baseDistance - currentPose.zoom;
      const newCamPos = getRotatedPosition(distance, currentPose.yaw, currentPose.pitch);
      newCamPos.add(currentPose.pivot);
      threeCamera.fov = fov;
      threeCamera.position.copy(newCamPos);
      threeCamera.lookAt(currentPose.pivot);
      threeCamera.updateProjectionMatrix();
      newPose.copy(currentPose);
      view3D.trigger(EVENTS$1.CAMERA_CHANGE, {
        type: EVENTS$1.CAMERA_CHANGE,
        target: view3D,
        pose: currentPose.clone(),
        prevPose
      });
    }
    _applyEffectiveFov(fov) {
      const camera = this._threeCamera;
      const tanHalfHFov = Math.tan(toRadian(fov / 2));
      const tanHalfVFov = tanHalfHFov * Math.max(1, this._maxTanHalfHFov / tanHalfHFov / camera.aspect);
      this._baseFov = toDegree(2 * Math.atan(tanHalfVFov));
    }
    _parseBboxRatioOption(arr, bbox) {
      const min = bbox.min.toArray();
      const size = new THREE.Vector3().subVectors(bbox.max, bbox.min).toArray();
      return arr.map((val, idx) => {
        if (!isString(val)) return val;
        const ratio = parseFloat(val) * 0.01;
        return min[idx] + ratio * size[idx];
      });
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Automatic resizer that uses both ResizeObserver and window resize event
   */
  class AutoResizer {
    /** */
    constructor(view3d) {
      this._onResize = () => {
        this._view3d.resize();
      };
      // eslint-disable-next-line @typescript-eslint/member-ordering
      this._skipFirstResize = (() => {
        let isFirstResize = true;
        return () => {
          if (isFirstResize) {
            isFirstResize = false;
            return;
          }
          this._onResize();
        };
      })();
      this._view3d = view3d;
      this._enabled = false;
      this._resizeObserver = null;
    }
    /**
     * Returns whether AutoResizer is enabled
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable resizer
     */
    enable() {
      const view3d = this._view3d;
      if (this._enabled) {
        this.disable();
      }
      if (view3d.useResizeObserver && !!window.ResizeObserver) {
        const canvasEl = view3d.renderer.canvas;
        const canvasBbox = canvasEl.getBoundingClientRect();
        const resizeImmediate = canvasBbox.width !== 0 || canvasBbox.height !== 0;
        const resizeObserver = new ResizeObserver(resizeImmediate ? this._skipFirstResize : this._onResize);
        // This will automatically call `resize` for the first time
        resizeObserver.observe(canvasEl);
        this._resizeObserver = resizeObserver;
      } else {
        view3d.resize();
        window.addEventListener(EVENTS.RESIZE, this._onResize);
      }
      this._enabled = true;
      return this;
    }
    /**
     * Disable resizer
     */
    disable() {
      if (!this._enabled) return this;
      const resizeObserver = this._resizeObserver;
      if (resizeObserver) {
        resizeObserver.disconnect();
        this._resizeObserver = null;
      } else {
        window.removeEventListener(EVENTS.RESIZE, this._onResize);
      }
      this._enabled = false;
      return this;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Component that manages animations of the 3D Model
   */
  class ModelAnimator {
    /**
     * Create new ModelAnimator instance
     */
    constructor(view3D) {
      this._onAnimationLoop = evt => {
        const view3D = this._view3D;
        const actions = this._actions;
        const clips = this._clips;
        const index = actions.findIndex(action => action === evt.action);
        view3D.trigger(EVENTS$1.ANIMATION_LOOP, {
          type: EVENTS$1.ANIMATION_LOOP,
          target: view3D,
          index,
          action: evt.action,
          clip: clips[index]
        });
        if (view3D.animationRepeatMode === ANIMATION_REPEAT_MODE.ALL) {
          const nextIndex = index + 1 >= clips.length ? 0 : index + 1;
          this.play(nextIndex);
        }
      };
      this._onAnimationFinished = evt => {
        const view3D = this._view3D;
        const actions = this._actions;
        const clips = this._clips;
        const index = actions.findIndex(action => action === evt.action);
        view3D.trigger(EVENTS$1.ANIMATION_FINISHED, {
          type: EVENTS$1.ANIMATION_FINISHED,
          target: view3D,
          index,
          action: evt.action,
          clip: clips[index]
        });
      };
      this._view3D = view3D;
      this._mixer = new THREE.AnimationMixer(view3D.scene.userObjects);
      this._clips = [];
      this._actions = [];
      this._activeAnimationIdx = -1;
      this._timeScale = 1;
      this._fadePromises = [];
    }
    /**
     * Three.js {@link https://threejs.org/docs/#api/en/animation/AnimationClip AnimationClip}s that stored
     * @type THREE.AnimationClip
     * @readonly
     */
    get clips() {
      return this._clips;
    }
    /**
     * {@link https://threejs.org/docs/#api/en/animation/AnimationMixer THREE.AnimationMixer} instance
     * @type THREE.AnimationMixer
     * @readonly
     */
    get mixer() {
      return this._mixer;
    }
    /**
     * An array of active {@link https://threejs.org/docs/#api/en/animation/AnimationAction AnimationAction}s
     * @type THREE.AnimationAction
     * @readonly
     */
    get actions() {
      return this._actions;
    }
    /**
     * Current length of animations
     * @type {number}
     * @readonly
     */
    get animationCount() {
      return this._clips.length;
    }
    /**
     * Infomation of the animation currently playing, `null` if there're no animation or stopped.
     * @see {@link https://threejs.org/docs/#api/en/animation/AnimationClip AnimationClip}
     * @type {THREE.AnimationClip | null}
     */
    get activeAnimation() {
      var _a;
      return (_a = this._clips[this._activeAnimationIdx]) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * THREE.AnimationAction instance of the animation currently playing, `null` if there're no animation or stopped.
     * @see {@link https://threejs.org/docs/#api/en/animation/AnimationAction AnimationAction}
     * @type {THREE.AnimationAction | null}
     */
    get activeAction() {
      var _a;
      return (_a = this._actions[this._activeAnimationIdx]) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * An index of the animation currently playing.
     * @type {number}
     * @readonly
     */
    get activeAnimationIndex() {
      return this._activeAnimationIdx;
    }
    /**
     * An boolean value indicating whether the animations are paused
     * @type {boolean}
     * @readonly
     */
    get paused() {
      return this._mixer.timeScale === 0;
    }
    /**
     * An boolean value indicating whether at least one of the animation is playing
     * @type {boolean}
     * @readonly
     */
    get animating() {
      var _a;
      return ((_a = this.activeAction) === null || _a === void 0 ? void 0 : _a.isRunning()) && !this.paused;
    }
    /**
     * Global time scale for animations
     * @type {number}
     */
    get timeScale() {
      return this._timeScale;
    }
    set timeScale(val) {
      this._timeScale = val;
    }
    /**
     * Initialize ModelAnimator
     */
    init() {
      this._mixer.addEventListener("loop", this._onAnimationLoop);
      this._mixer.addEventListener("finished", this._onAnimationFinished);
    }
    /**
     * Destroy ModelAnimator instance
     */
    destroy() {
      this.reset();
      this._mixer.removeEventListener("loop", this._onAnimationLoop);
      this._mixer.removeEventListener("finished", this._onAnimationFinished);
    }
    /**
     * Store the given clips
     * @param clips Three.js {@link https://threejs.org/docs/#api/en/animation/AnimationClip AnimationClip}s of the model
     * @returns {void}
     * @example
     * ```ts
     * // After loading model
     * view3d.animator.setClips(model.animations);
     * ```
     */
    setClips(clips) {
      const mixer = this._mixer;
      this._clips = clips;
      this._actions = clips.map(clip => {
        const action = mixer.clipAction(clip);
        action.setEffectiveWeight(0);
        return action;
      });
      this.updateRepeatMode();
    }
    /**
     * Play one of the model's animation
     * @param {number} index Index of the animation to play
     * @returns {void}
     */
    play(index) {
      const view3D = this._view3D;
      const action = this._actions[index];
      if (!action) return;
      this.stop(); // Stop all previous actions
      this._restoreTimeScale();
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(1);
      action.play();
      this._activeAnimationIdx = index;
      this._flushFadePromises();
      view3D.trigger(EVENTS$1.ANIMATION_START, {
        type: EVENTS$1.ANIMATION_START,
        target: view3D,
        index,
        action,
        clip: this._clips[index]
      });
    }
    /**
     * Crossfade animation from one to another
     * @param {number} index Index of the animation to crossfade to
     * @param {number} duration Duration of the crossfade animation, in milisec
     * @returns {Promise<boolean>} A promise that resolves boolean value that indicates whether the crossfade is fullfilled without any inference
     */
    crossFade(index, duration, {
      synchronize = false
    } = {}) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const mixer = this._mixer;
        const actions = this._actions;
        const activeAnimationIdx = this._activeAnimationIdx;
        const endAction = actions[index];
        const startAction = (_a = actions[activeAnimationIdx]) !== null && _a !== void 0 ? _a : endAction;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const EVT_LOOP = "loop";
        this._restoreTimeScale();
        const doCrossfade = () => {
          endAction.enabled = true;
          endAction.setEffectiveTimeScale(1);
          endAction.setEffectiveWeight(1);
          endAction.time = 0;
          endAction.play();
          startAction.crossFadeTo(endAction, duration / 1000, true);
          this._activeAnimationIdx = index;
        };
        if (synchronize) {
          const onLoop = evt => {
            if (evt.action === startAction) {
              mixer.removeEventListener(EVT_LOOP, onLoop);
              doCrossfade();
            }
          };
          mixer.addEventListener(EVT_LOOP, onLoop);
        } else {
          doCrossfade();
        }
        this._flushFadePromises();
        const fadePromise = new Promise(resolve => {
          const onFrame = () => {
            if (endAction.getEffectiveWeight() < 1) return;
            view3D.off(EVENTS$1.BEFORE_RENDER, onFrame);
            resolve(true);
          };
          view3D.on(EVENTS$1.BEFORE_RENDER, onFrame);
          this._fadePromises.push({
            listener: onFrame,
            resolve
          });
        });
        return fadePromise;
      });
    }
    /**
     * Fadeout active animation, and restore to the default pose
     * @param {number} duration Duration of the crossfade animation, in milisec
     * @returns {Promise<boolean>} A promise that resolves boolean value that indicates whether the fadeout is fullfilled without any inference
     */
    fadeOut(duration) {
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const actions = this._actions;
        const activeAction = actions[this._activeAnimationIdx];
        if (!activeAction) return false;
        this._flushFadePromises();
        this._restoreTimeScale();
        activeAction.fadeOut(duration / 1000);
        const fadePromise = new Promise(resolve => {
          const onFrame = () => {
            if (activeAction.getEffectiveWeight() > 0) return;
            view3D.off(EVENTS$1.BEFORE_RENDER, onFrame);
            this._activeAnimationIdx = -1;
            resolve(true);
          };
          view3D.on(EVENTS$1.BEFORE_RENDER, onFrame);
          this._fadePromises.push({
            listener: onFrame,
            resolve
          });
        });
        return fadePromise;
      });
    }
    /**
     * Pause all animations
     * If you want to stop animation completely, you should call {@link ModelAnimator#stop stop} instead
     * You should call {@link ModelAnimator#resume resume} to resume animation
     * @returns {void}
     */
    pause() {
      this._mixer.timeScale = 0;
    }
    /**
     * Resume all animations
     * This will play animation from the point when the animation is paused
     * @returns {void}
     */
    resume() {
      this._restoreTimeScale();
    }
    /**
     * Fully stops one of the model's animation
     * @returns {void}
     */
    stop() {
      this._actions.forEach(action => {
        action.stop();
        action.setEffectiveWeight(0);
      });
      // Render single frame to show deactivated state
      this._view3D.renderer.renderSingleFrame();
      this._activeAnimationIdx = -1;
      this._flushFadePromises();
    }
    /**
     * Update animations
     * @param {number} delta number of seconds to play animations attached
     * @internal
     * @returns {void}
     */
    update(delta) {
      this._mixer.update(delta);
    }
    /**
     * Update animation repeat mode of the animation actions
     */
    updateRepeatMode() {
      const view3D = this._view3D;
      const actions = this._actions;
      const repeatMode = view3D.animationRepeatMode;
      if (repeatMode === ANIMATION_REPEAT_MODE.NONE) {
        actions.forEach(action => {
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
        });
      } else {
        actions.forEach(action => {
          action.clampWhenFinished = false;
          action.loop = THREE.LoopRepeat;
        });
      }
    }
    /**
     * Reset the instance and remove all cached animation clips attached to it
     * @returns {void}
     */
    reset() {
      const mixer = this._mixer;
      this.stop();
      mixer.uncacheRoot(mixer.getRoot());
      this._clips = [];
      this._actions = [];
    }
    _restoreTimeScale() {
      this._mixer.timeScale = this._timeScale;
    }
    _flushFadePromises() {
      const view3D = this._view3D;
      const fadePromises = this._fadePromises;
      fadePromises.forEach(({
        resolve,
        listener
      }) => {
        resolve(false);
        view3D.off(EVENTS$1.BEFORE_RENDER, listener);
      });
      this._fadePromises = [];
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Fires for every animation frame when animation is active.
   * @type object
   * @property {object} event Event object.
   * @property {number} [event.progress] Current animation progress value.
   * Value is ranged from 0(start) to 1(end).
   * @property {number} [event.easedProgress] Eased progress value.
   * @event Animation#progress
   */
  /**
   * Fires for every animation loop except for the last loop
   * This will be triggered only when repeat > 0
   * @type object
   * @property {object} event Event object.
   * @property {number} [event.progress] Current animation progress value.
   * Value is ranged from 0(start) to 1(end).
   * @property {number} [event.easedProgress] Eased progress value.
   * @property {number} [event.loopIndex] Index of the current loop.
   * @event Animation#loop
   */
  /**
   * Fires when animation ends.
   * @type void
   * @event Animation#finish
   */
  /**
   * Self-running animation
   */
  class Animation extends Component {
    /**
     * Create new instance of the Animation
     * @param {object} [options={}] Options
     */
    constructor({
      context = window,
      repeat = 0,
      duration = ANIMATION_DURATION,
      easing = EASING$1
    } = {}) {
      super();
      this._loop = () => {
        const delta = this._getDeltaTime();
        const duration = this._duration;
        const repeat = this._repeat;
        const prevTime = this._time;
        const time = prevTime + delta;
        const loopIncrease = Math.floor(time / duration);
        this._time = this._loopCount >= repeat ? clamp(time, 0, duration) : circulate(time, 0, duration);
        const progress = this._time / duration;
        const progressEvent = {
          progress,
          easedProgress: this._easing(progress)
        };
        this.trigger("progress", progressEvent);
        for (let loopIdx = 0; loopIdx < loopIncrease; loopIdx++) {
          this._loopCount++;
          if (this._loopCount > repeat) {
            this.trigger("finish");
            this.stop();
            return;
          } else {
            this.trigger("loop", Object.assign(Object.assign({}, progressEvent), {
              loopIndex: this._loopCount
            }));
          }
        }
        this._rafId = this._ctx.requestAnimationFrame(this._loop);
      };
      // Options
      this._repeat = repeat;
      this._duration = duration;
      this._easing = easing;
      // Internal States
      this._ctx = context;
      this._rafId = -1;
      this._time = 0;
      this._clock = 0;
      this._loopCount = 0;
    }
    start() {
      if (this._rafId >= 0) return;
      // This guarantees "progress" event with progress = 0 on first start
      this._updateClock();
      this._loop();
    }
    stop() {
      if (this._rafId < 0) return;
      this._time = 0;
      this._loopCount = 0;
      this._stopLoop();
    }
    pause() {
      if (this._rafId < 0) return;
      this._stopLoop();
    }
    _stopLoop() {
      this._ctx.cancelAnimationFrame(this._rafId);
      this._rafId = -1;
    }
    _getDeltaTime() {
      const lastTime = this._clock;
      this._updateClock();
      return this._clock - lastTime;
    }
    _updateClock() {
      this._clock = Date.now();
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /* eslint-enable */
  const QUICK_LOOK_SUPPORTED = () => {
    const anchorEl = document.createElement("a");
    return anchorEl.relList && anchorEl.relList.supports && anchorEl.relList.supports("ar");
  };
  const WEBXR_SUPPORTED = () => navigator.xr && !!navigator.xr.isSessionSupported;
  const HIT_TEST_SUPPORTED = () => window.XRSession && window.XRSession.prototype.requestHitTestSource;
  const DOM_OVERLAY_SUPPORTED = () => window.XRDOMOverlayState != null;
  const SESSION = {
    AR: "immersive-ar",
    VR: "immersive-vr"
  };
  const REFERENCE_SPACE = {
    LOCAL: "local",
    LOCAL_FLOOR: "local-floor",
    VIEWER: "viewer"
  };
  const EVENTS$2 = {
    SELECT_START: "selectstart",
    SELECT: "select",
    SELECT_END: "selectend",
    ESTIMATION_START: "estimationstart",
    ESTIMATION_END: "estimationend"
  };
  const INPUT_PROFILE = {
    TOUCH: "generic-touchscreen"
  };
  const FEATURES = {
    HIT_TEST: {
      requiredFeatures: ["hit-test"]
    },
    DOM_OVERLAY: root => root ? {
      requiredFeatures: ["dom-overlay"],
      domOverlay: {
        root
      }
    } : {},
    LIGHT_ESTIMATION: {
      optionalFeatures: ["light-estimation"]
    }
  };
  // For type definition
  const EMPTY_FEATURES = {};
  const SCENE_VIEWER = {
    INTENT_AR_CORE: (params, fallback) => `intent://arvr.google.com/scene-viewer/1.2?${params}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;${fallback ? `S.browser_fallback_url=${fallback};` : ""}end;`,
    INTENT_SEARCHBOX: (params, fallback) => `intent://arvr.google.com/scene-viewer/1.2?${params}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;${fallback ? `S.browser_fallback_url=${fallback};` : ""}end;`,
    FALLBACK_DEFAULT: params => `https://arvr.google.com/scene-viewer?${params}`
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * One finger swirl control on single axis
   */
  class ARSwirlControl {
    /**
     * Create new ARSwirlControl
     * @param {ARSwirlControlOptions} [options={}] Options
     * @param {number} [options.scale=1] Scale(speed) factor of the rotation
     * @param {boolean} [options.showIndicator=true] Whether to show rotation indicator or not.
     */
    constructor({
      scale = 1
    } = {}) {
      /**
       * Current rotation value
       */
      this.rotation = new THREE.Quaternion();
      // Internal States
      this._axis = new THREE.Vector3(0, 1, 0);
      this._enabled = false;
      this._active = false;
      this._prevPos = new THREE.Vector2();
      this._fromQuat = new THREE.Quaternion();
      this._toQuat = new THREE.Quaternion();
      this._motion = new Motion({
        range: INFINITE_RANGE
      });
      this._userScale = scale;
    }
    /**
     * Whether this control is enabled or not.
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Scale(speed) factor of this control.
     */
    get scale() {
      return this._userScale;
    }
    set scale(val) {
      this._userScale = val;
    }
    updateRotation(rotation) {
      this.rotation.copy(rotation);
      this._fromQuat.copy(rotation);
      this._toQuat.copy(rotation);
    }
    /**
     * Enable this control
     */
    enable() {
      this._enabled = true;
    }
    /**
     * Disable this control
     */
    disable() {
      this._enabled = false;
    }
    activate() {
      if (!this._enabled) return;
      this._active = true;
    }
    deactivate() {
      this._active = false;
    }
    updateAxis(axis) {
      this._axis.copy(axis);
    }
    setInitialPos(coords) {
      this._prevPos.copy(coords[0]);
    }
    process({
      scene,
      xrCam
    }, {
      coords
    }) {
      if (!this._active || coords.length !== 1) return;
      const prevPos = this._prevPos;
      const motion = this._motion;
      const coord = coords[0];
      const modelPos = scene.modelMovable.getWorldPosition(new THREE.Vector3());
      const ndcModelPos = new THREE.Vector2().fromArray(modelPos.project(xrCam).toArray());
      // Get the rotation angle with the model's NDC coordinates as the center.
      const rotationAngle = getRotationAngle(ndcModelPos, prevPos, coord) * this._userScale;
      const rotation = new THREE.Quaternion().setFromAxisAngle(this._axis, rotationAngle);
      const interpolated = this._getInterpolatedQuaternion();
      this._fromQuat.copy(interpolated);
      this._toQuat.premultiply(rotation);
      motion.reset(0);
      motion.setEndDelta(1);
      prevPos.copy(coord);
    }
    update({
      scene
    }, deltaTime) {
      if (!this._active) return;
      const motion = this._motion;
      motion.update(deltaTime);
      const interpolated = this._getInterpolatedQuaternion();
      this.rotation.copy(interpolated);
      scene.setModelRotation(interpolated);
    }
    _getInterpolatedQuaternion() {
      const motion = this._motion;
      const toEuler = this._toQuat;
      const fromEuler = this._fromQuat;
      const progress = motion.val;
      return new THREE.Quaternion().copy(fromEuler).slerp(toEuler, progress);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  var STATE;
  (function (STATE) {
    STATE[STATE["WAITING"] = 0] = "WAITING";
    STATE[STATE["TRANSLATING"] = 1] = "TRANSLATING";
    STATE[STATE["BOUNCING"] = 2] = "BOUNCING";
  })(STATE || (STATE = {}));
  /**
   * Model's translation(position) control for {@link WebARControl}
   */
  class ARTranslateControl {
    /**
     * Create new instance of ARTranslateControl
     * @param {ARTranslateControlOption} [options={}] Options
     */
    constructor({
      hoverHeight = 0.1,
      bounceDuration = 1000,
      bounceEasing = EASING.EASE_OUT_BOUNCE
    } = {}) {
      // Internal states
      this._hoverPosition = new THREE.Vector3();
      this._floorPosition = new THREE.Vector3();
      this._wallRotation = new THREE.Quaternion();
      this._dragPlane = new THREE.Plane();
      this._enabled = false;
      this._vertical = false;
      this._state = STATE.WAITING;
      this._initialPos = new THREE.Vector2();
      this._hoverHeight = hoverHeight;
      this._bounceMotion = new Motion({
        duration: bounceDuration,
        easing: bounceEasing,
        range: INFINITE_RANGE
      });
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Last detected floor position
     * @readonly
     */
    get floorPosition() {
      return this._floorPosition.clone();
    }
    /**
     * How much model will float from the floor, in meter.
     */
    get hoverHeight() {
      return this._hoverHeight;
    }
    set hoverHeight(val) {
      this._hoverHeight = val;
    }
    /**
     * Enable this control
     */
    enable() {
      this._enabled = true;
    }
    /**
     * Disable this control
     */
    disable() {
      this.deactivate();
      this._enabled = false;
    }
    activate() {
      if (!this._enabled) return;
      const dragPlane = this._dragPlane;
      dragPlane.constant = this._calcDragPlaneConstant(this._floorPosition);
      this._state = STATE.TRANSLATING;
    }
    deactivate() {
      if (!this._enabled || this._vertical || this._state === STATE.WAITING) {
        this._state = STATE.WAITING;
        return;
      }
      this._state = STATE.BOUNCING;
      const floorPosition = this._floorPosition;
      const hoverPosition = this._hoverPosition;
      const bounceMotion = this._bounceMotion;
      const hoveringAmount = hoverPosition.y - floorPosition.y;
      bounceMotion.reset(hoveringAmount);
      bounceMotion.setEndDelta(-hoveringAmount);
    }
    init(position, rotation, vertical) {
      this._floorPosition.copy(position);
      this._hoverPosition.copy(position);
      const planeNormal = vertical ? new THREE.Vector3(0, 1, 0).applyQuaternion(rotation) : new THREE.Vector3(0, 1, 0);
      this._dragPlane.normal.copy(planeNormal);
      this._wallRotation.copy(rotation);
      this._vertical = vertical;
    }
    setInitialPos(coords) {
      this._initialPos.copy(coords[0]);
    }
    process({
      frame,
      referenceSpace,
      xrCam
    }, {
      hitResults
    }) {
      const state = this._state;
      const notActive = state === STATE.WAITING || state === STATE.BOUNCING;
      if (!hitResults || hitResults.length !== 1 || notActive) return;
      const hitResult = hitResults[0];
      const prevFloorPosition = this._floorPosition.clone();
      const floorPosition = this._floorPosition;
      const hoverPosition = this._hoverPosition;
      const hoverHeight = this._hoverHeight;
      const dragPlane = this._dragPlane;
      const vertical = this._vertical;
      const hitPose = hitResult.results[0] && hitResult.results[0].getPose(referenceSpace);
      const hitMatrix = hitPose && new THREE.Matrix4().fromArray(hitPose.transform.matrix);
      const isFloorHit = hitPose && hitMatrix.elements[5] > 0.75;
      const isWallHit = hitPose && hitMatrix.elements[5] < 0.25;
      const camPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
      const hitPosition = hitPose && new THREE.Vector3().setFromMatrixPosition(hitMatrix);
      if (!vertical) {
        if (frame && (!hitPose || !isFloorHit)) {
          // Use previous drag plane if no hit plane is found
          const targetRayPose = frame.getPose(hitResult.inputSource.targetRaySpace, referenceSpace);
          if (!targetRayPose) return;
          const rayPos = targetRayPose.transform.position;
          const fingerPos = new THREE.Vector3(rayPos.x, rayPos.y, rayPos.z);
          const fingerDir = fingerPos.sub(camPos).normalize();
          const fingerRay = new THREE.Ray(camPos, fingerDir);
          const intersection = fingerRay.intersectPlane(dragPlane, new THREE.Vector3());
          if (intersection) {
            floorPosition.copy(intersection);
            floorPosition.setY(prevFloorPosition.y);
            hoverPosition.copy(intersection);
          }
          return;
        }
        // Set new floor level when it's increased at least 10cm
        const currentDragPlaneHeight = -dragPlane.constant;
        const hitDragPlaneHeight = hitPosition.y + hoverHeight;
        if (hitDragPlaneHeight - currentDragPlaneHeight > 0.1) {
          dragPlane.constant = -hitDragPlaneHeight;
        }
        const camToHitDir = new THREE.Vector3().subVectors(hitPosition, camPos).normalize();
        const camToHitRay = new THREE.Ray(camPos, camToHitDir);
        const hitOnDragPlane = camToHitRay.intersectPlane(dragPlane, new THREE.Vector3());
        if (!hitOnDragPlane) return;
        floorPosition.copy(hitOnDragPlane);
        floorPosition.setY(hitPosition.y);
        hoverPosition.copy(hitOnDragPlane);
      } else {
        if (frame && (!hitPose || !isWallHit)) {
          // Use previous drag plane if no hit plane is found
          const targetRayPose = frame.getPose(hitResult.inputSource.targetRaySpace, referenceSpace);
          if (!targetRayPose) return;
          const rayPos = targetRayPose.transform.position;
          const fingerPos = new THREE.Vector3(rayPos.x, rayPos.y, rayPos.z);
          const fingerDir = fingerPos.sub(camPos).normalize();
          const fingerRay = new THREE.Ray(camPos, fingerDir);
          const intersection = fingerRay.intersectPlane(dragPlane, new THREE.Vector3());
          if (intersection) {
            floorPosition.copy(intersection);
          }
          return;
        }
        const globalUp = new THREE.Vector3(0, 1, 0);
        const hitOrientation = hitPose.transform.orientation;
        const wallNormal = globalUp.clone().applyQuaternion(new THREE.Quaternion(hitOrientation.x, hitOrientation.y, hitOrientation.z, hitOrientation.w)).normalize();
        const wallX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), wallNormal);
        // Update rotation if it differs more than 10deg
        const prevWallNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(this._wallRotation).normalize();
        if (Math.acos(Math.abs(prevWallNormal.dot(wallNormal))) >= Math.PI / 18) {
          const wallMatrix = new THREE.Matrix4().makeBasis(wallX, globalUp, wallNormal);
          const wallEuler = new THREE.Euler(0, 0, 0, "YXZ").setFromRotationMatrix(wallMatrix);
          wallEuler.z = 0;
          wallEuler.x = Math.PI / 2;
          this._wallRotation.setFromEuler(wallEuler);
          dragPlane.normal.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(this._wallRotation));
          dragPlane.constant = this._calcDragPlaneConstant(hitPosition);
        }
        const camToHitDir = new THREE.Vector3().subVectors(hitPosition, camPos).normalize();
        const camToHitRay = new THREE.Ray(camPos, camToHitDir);
        const hitOnDragPlane = camToHitRay.intersectPlane(dragPlane, new THREE.Vector3());
        if (!hitOnDragPlane) return;
        floorPosition.copy(hitOnDragPlane);
      }
    }
    update({
      scene
    }, delta) {
      const state = this._state;
      const floorPosition = this._floorPosition;
      const hoverPosition = this._hoverPosition;
      const bounceMotion = this._bounceMotion;
      const vertical = this._vertical;
      if (state === STATE.BOUNCING) {
        bounceMotion.update(delta);
        hoverPosition.setY(floorPosition.y + bounceMotion.val);
        if (bounceMotion.progress >= 1) {
          this._state = STATE.WAITING;
        }
      }
      scene.setRootPosition(floorPosition);
      if (!vertical) {
        scene.setModelHovering(hoverPosition.y - floorPosition.y);
      } else {
        scene.setWallRotation(this._wallRotation);
      }
    }
    _calcDragPlaneConstant(floor) {
      const vertical = this._vertical;
      const dragPlaneNormal = this._dragPlane.normal.clone();
      const dragPlaneAtZero = new THREE.Plane(dragPlaneNormal, 0);
      const hoverHeight = vertical ? 0 : this._hoverHeight;
      const dragPlaneConstant = -(dragPlaneAtZero.distanceToPoint(floor) + hoverHeight);
      return dragPlaneConstant;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * UI element displaying model's scale percentage info when user chaning model's scale.
   */
  class ScaleUI {
    /**
     * Create new instance of ScaleUI
     * @param {ScaleUIOptions} [options={}] Options
     */
    constructor({
      width = 0.1,
      padding = 20,
      offset = 0.05,
      font = "64px sans-serif",
      color = "white"
    } = {}) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = font;
      // Maximum canvas width should be equal to this
      const maxText = ctx.measureText("100%");
      // Following APIs won't work on IE, but it's WebXR so I think it's okay
      const maxWidth = maxText.actualBoundingBoxLeft + maxText.actualBoundingBoxRight;
      const maxHeight = maxText.actualBoundingBoxAscent + maxText.actualBoundingBoxDescent;
      const widthPowerOfTwo = toPowerOfTwo(maxWidth);
      canvas.width = widthPowerOfTwo;
      canvas.height = widthPowerOfTwo;
      // This considers increased amount by making width to power of two
      const planeWidth = width * (widthPowerOfTwo / maxWidth);
      this._ctx = ctx;
      this._canvas = canvas;
      this._height = planeWidth * maxHeight / maxWidth; // Text height inside plane
      this._texture = new THREE.CanvasTexture(canvas);
      // Plane is square
      const uiGeometry = new THREE.PlaneGeometry(planeWidth, planeWidth);
      const mesh = new THREE.Mesh(uiGeometry, new THREE.MeshBasicMaterial({
        map: this._texture,
        transparent: true,
        depthTest: false
      }));
      this._mesh = mesh;
      this._font = font;
      this._color = color;
      this._padding = padding;
      this._offset = offset;
      this.hide();
    }
    /**
     * Scale UI's plane mesh
     * @readonly
     */
    get mesh() {
      return this._mesh;
    }
    /**
     * Scale UI's height value
     * @readonly
     */
    get height() {
      return this._height;
    }
    /**
     * Whether UI is visible or not.
     * @readonly
     */
    get visible() {
      return this._mesh.visible;
    }
    updatePosition(worldRotation, focus, modelHeight) {
      const mesh = this._mesh;
      const offset = this._height / 2 + this._offset + modelHeight;
      const offsetVec = new THREE.Vector3(0, offset, 0).applyQuaternion(worldRotation.clone().invert());
      // Update mesh
      mesh.position.copy(offsetVec);
      mesh.lookAt(focus);
    }
    updateScale(scale) {
      const ctx = this._ctx;
      const canvas = this._canvas;
      const padding = this._padding;
      const scalePercentage = (scale * 100).toFixed(0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      // Draw round rect
      const textSize = ctx.measureText(`${scalePercentage}%`);
      const halfWidth = (textSize.actualBoundingBoxLeft + textSize.actualBoundingBoxRight) / 2;
      const halfHeight = (textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent) / 2;
      ctx.beginPath();
      ctx.moveTo(centerX - halfWidth, centerY - halfHeight - padding);
      ctx.lineTo(centerX + halfWidth, centerY - halfHeight - padding);
      ctx.quadraticCurveTo(centerX + halfWidth + padding, centerY - halfHeight - padding, centerX + halfWidth + padding, centerY - halfHeight);
      ctx.lineTo(centerX + halfWidth + padding, centerY + halfHeight);
      ctx.quadraticCurveTo(centerX + halfWidth + padding, centerY + halfHeight + padding, centerX + halfWidth, centerY + halfHeight + padding);
      ctx.lineTo(centerX - halfWidth, centerY + halfHeight + padding);
      ctx.quadraticCurveTo(centerX - halfWidth - padding, centerY + halfHeight + padding, centerX - halfWidth - padding, centerY + halfHeight);
      ctx.lineTo(centerX - halfWidth - padding, centerY - halfHeight);
      ctx.quadraticCurveTo(centerX - halfWidth - padding, centerY - halfHeight - padding, centerX - halfWidth, centerY - halfHeight - padding);
      ctx.closePath();
      ctx.lineWidth = 5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();
      ctx.stroke();
      // Draw text
      ctx.font = this._font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = this._color;
      ctx.fillStyle = this._color;
      ctx.fillText(`${scalePercentage}%`, centerX, centerY);
      this._texture.needsUpdate = true;
      this._mesh.scale.setScalar(1 / scale);
    }
    /**
     * Show UI
     */
    show() {
      this._mesh.visible = true;
    }
    /**
     * Hide UI
     */
    hide() {
      this._mesh.visible = false;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Model's scale controller which works on AR(WebXR) mode.
   */
  class ARScaleControl {
    /**
     * Create new instance of ARScaleControl
     * @param {ARScaleControlOptions} [options={}] Options
     * @param {number} [options.min=0.05] Minimum scale, default is 0.05(5%)
     * @param {number} [options.max=5] Maximum scale, default is 5(500%)
     */
    constructor({
      min = 0.05,
      max = 5
    } = {}) {
      this._enabled = false;
      this._active = false;
      this._prevCoordDistance = -1;
      this._scaleMultiplier = 1;
      this._ui = new ScaleUI();
      this._motion = new Motion({
        duration: 0,
        range: {
          min,
          max
        }
      });
      this._motion.reset(1); // default scale is 1(100%)
      this._ui = new ScaleUI();
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    get scale() {
      return this._scaleMultiplier;
    }
    get ui() {
      return this._ui;
    }
    /**
     * Range of the scale
     * @readonly
     */
    get range() {
      return this._motion.range;
    }
    setInitialScale({
      scene,
      model,
      floorPosition,
      xrCam,
      initialScale
    }) {
      const motion = this._motion;
      const scaleRange = motion.range;
      if (initialScale === AUTO) {
        const camFov = 2 * Math.atan(1 / xrCam.projectionMatrix.elements[5]); // in radians
        const aspectInv = xrCam.projectionMatrix.elements[0] / xrCam.projectionMatrix.elements[5]; // x/y
        const camPos = xrCam.position;
        const modelHeight = model.bbox.max.y - model.bbox.min.y;
        const camToFloorDist = camPos.distanceTo(new THREE.Vector3().addVectors(floorPosition, new THREE.Vector3(0, modelHeight / 2, 0)));
        const viewY = camToFloorDist * Math.tan(camFov / 2);
        const viewX = viewY * aspectInv;
        const modelBoundingSphere = model.bbox.getBoundingSphere(new THREE.Sphere());
        const scaleY = viewY / modelBoundingSphere.radius;
        const scaleX = viewX / modelBoundingSphere.radius;
        const scale = clamp(Math.min(scaleX, scaleY), scaleRange.min, 1);
        motion.reset(scale);
      } else {
        motion.reset(clamp(initialScale, scaleRange.min, scaleRange.max));
      }
      const scale = this._motion.val;
      this._scaleMultiplier = scale;
      scene.setModelScale(scale);
    }
    setInitialPos(coords) {
      this._prevCoordDistance = new THREE.Vector2().subVectors(coords[0], coords[1]).length();
    }
    /**
     * Enable this control
     */
    enable() {
      this._enabled = true;
    }
    /**
     * Disable this control
     */
    disable() {
      this._enabled = false;
      this.deactivate();
    }
    activate(ctx) {
      this._active = true;
      this._ui.show();
      this._updateUIPosition(ctx);
    }
    deactivate() {
      this._active = false;
      this._ui.hide();
      this._prevCoordDistance = -1;
    }
    process(ctx, {
      coords
    }) {
      if (coords.length !== 2 || !this._enabled || !this._active) return;
      const motion = this._motion;
      const distance = new THREE.Vector2().subVectors(coords[0], coords[1]).length();
      const delta = distance - this._prevCoordDistance;
      motion.setEndDelta(delta);
      this._prevCoordDistance = distance;
      this._updateUIPosition(ctx);
    }
    update({
      scene
    }, deltaTime) {
      if (!this._enabled || !this._active) return;
      const motion = this._motion;
      motion.update(deltaTime);
      this._scaleMultiplier = motion.val;
      this._ui.updateScale(this._scaleMultiplier);
      scene.setModelScale(this._scaleMultiplier);
    }
    _updateUIPosition({
      view3D,
      scene,
      xrCam,
      vertical
    }) {
      // Update UI
      const model = view3D.model;
      const camPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
      const modelHeight = vertical ? model.bbox.getBoundingSphere(new THREE.Sphere()).radius : model.bbox.max.y - model.bbox.min.y;
      this._ui.updatePosition(scene.root.quaternion, camPos, modelHeight);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Ring type indicator for showing where the model's at.
   */
  class FloorIndicator {
    /**
     * Create new instance of FloorIndicator
     * @param {FloorIndicatorOptions} [options={}] Options
     */
    constructor({
      ringOpacity = 0.3,
      dirIndicatorOpacity = 1,
      fadeoutDuration = 1000
    } = {}) {
      const deg10 = Math.PI / 18;
      const ringGeomtry = new THREE.RingGeometry(0.975, 1, 150, 1, -6 * deg10, 30 * deg10);
      ringGeomtry.rotateX(-Math.PI / 2);
      const arrowGeometry = new THREE.RingGeometry(0.96, 1.015, 30, 1, 25 * deg10, 4 * deg10);
      // Create little triangle in ring
      const {
        position: arrowGeometryPosition
      } = arrowGeometry.attributes;
      const triangleStartIdx = Math.floor(11 * arrowGeometryPosition.count / 16);
      const triangleEndIdx = Math.floor(13 * arrowGeometryPosition.count / 16);
      const midIndex = Math.floor((triangleEndIdx - triangleStartIdx + 1) / 2);
      const firstY = new THREE.Vector3().fromBufferAttribute(arrowGeometryPosition, triangleStartIdx).y;
      for (let idx = triangleStartIdx; idx < triangleEndIdx; idx++) {
        const vecIndex = idx - triangleStartIdx;
        const offsetAmount = 0.025 * (midIndex - Math.abs(vecIndex - midIndex));
        arrowGeometryPosition.setY(idx, firstY - offsetAmount);
      }
      arrowGeometry.rotateX(-Math.PI / 2);
      const dimmedMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: ringOpacity,
        color: 0xffffff
      });
      const highlightMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: dirIndicatorOpacity,
        color: 0xffffff
      });
      const ring = new THREE.Mesh(ringGeomtry, dimmedMaterial);
      const arrow = new THREE.Mesh(arrowGeometry, highlightMaterial);
      const merged = new THREE.Group();
      merged.add(ring, arrow);
      merged.position.setY(0.0001); // Set Y higher than shadow plane
      this._mesh = merged;
      this._ring = ring;
      this._arrow = arrow;
      this._animator = new Motion({
        duration: fadeoutDuration
      });
      this._opacityRange = {
        min: ringOpacity,
        max: dirIndicatorOpacity
      };
      this.hide();
    }
    /**
     * Ring mesh
     */
    get mesh() {
      return this._mesh;
    }
    updateSize(model) {
      this._mesh.scale.setScalar(model.bbox.getBoundingSphere(new THREE.Sphere()).radius);
    }
    update({
      delta,
      rotation
    }) {
      const mesh = this._mesh;
      const animator = this._animator;
      if (!mesh.visible) return;
      animator.update(delta);
      const minOpacityMat = this._ring.material;
      const maxOpacityMat = this._arrow.material;
      const opacityRange = this._opacityRange;
      minOpacityMat.opacity = animator.val * opacityRange.min;
      maxOpacityMat.opacity = animator.val * opacityRange.max;
      if (animator.val <= 0) {
        mesh.visible = false;
      }
      // Update mesh
      mesh.quaternion.copy(rotation);
      mesh.updateMatrix();
    }
    show() {
      this._mesh.visible = true;
      this._animator.reset(1);
    }
    hide() {
      this._mesh.visible = false;
    }
    fadeout() {
      this._animator.setEndDelta(-1);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  var STATE$1;
  (function (STATE) {
    STATE[STATE["WAITING"] = 0] = "WAITING";
    STATE[STATE["IN_DEADZONE"] = 1] = "IN_DEADZONE";
    STATE[STATE["OUT_OF_DEADZONE"] = 2] = "OUT_OF_DEADZONE";
  })(STATE$1 || (STATE$1 = {}));
  /**
   * Deadzone checker for deadzone-based controls
   */
  class DeadzoneChecker {
    /**
     * Create new DeadzoneChecker
     * @param {DeadzoneCheckerOptions} [options={}] Options
     * @param {number} [options.size=0.1] Size of the deadzone circle.
     */
    constructor({
      size = 0.1
    } = {}) {
      // Internal States
      this._state = STATE$1.WAITING;
      this._detectedGesture = GESTURE.NONE;
      this._testingGestures = GESTURE.NONE;
      this._lastFingerCount = 0;
      this._aspect = 1;
      // Store two prev positions, as it should be maintained separately
      this._prevOneFingerPos = new THREE.Vector2();
      this._prevTwoFingerPos = new THREE.Vector2();
      this._initialTwoFingerDistance = 0;
      this._prevOneFingerPosInitialized = false;
      this._prevTwoFingerPosInitialized = false;
      this._size = size;
    }
    /**
     * Size of the deadzone.
     * @type {number}
     */
    get size() {
      return this._size;
    }
    /**
     * Whether the input is in the deadzone
     * @type {boolean}
     */
    get inDeadzone() {
      return this._state === STATE$1.IN_DEADZONE;
    }
    set size(val) {
      this._size = val;
    }
    /**
     * Set screen aspect(height / width)
     * @param aspect Screen aspect value
     */
    setAspect(aspect) {
      this._aspect = aspect;
    }
    setFirstInput(inputs) {
      const fingerCount = inputs.length;
      if (fingerCount === 1 && !this._prevOneFingerPosInitialized) {
        this._prevOneFingerPos.copy(inputs[0]);
        this._prevOneFingerPosInitialized = true;
      } else if (fingerCount === 2 && !this._prevTwoFingerPosInitialized) {
        this._prevTwoFingerPos.copy(new THREE.Vector2().addVectors(inputs[0], inputs[1]).multiplyScalar(0.5));
        this._initialTwoFingerDistance = new THREE.Vector2().subVectors(inputs[0], inputs[1]).length();
        this._prevTwoFingerPosInitialized = true;
      }
      this._lastFingerCount = fingerCount;
      this._state = STATE$1.IN_DEADZONE;
    }
    addTestingGestures(...gestures) {
      this._testingGestures = this._testingGestures | gestures.reduce((gesture, accumulated) => gesture | accumulated, GESTURE.NONE);
    }
    cleanup() {
      this._testingGestures = GESTURE.NONE;
      this._lastFingerCount = 0;
      this._prevOneFingerPosInitialized = false;
      this._prevTwoFingerPosInitialized = false;
      this._initialTwoFingerDistance = 0;
      this._detectedGesture = GESTURE.NONE;
      this._state = STATE$1.WAITING;
    }
    applyScreenAspect(inputs) {
      const aspect = this._aspect;
      inputs.forEach(input => {
        if (aspect > 1) {
          input.setY(input.y * aspect);
        } else {
          input.setX(input.x / aspect);
        }
      });
    }
    check(inputs) {
      const state = this._state;
      const deadzone = this._size;
      const testingGestures = this._testingGestures;
      const lastFingerCount = this._lastFingerCount;
      const fingerCount = inputs.length;
      if (state === STATE$1.OUT_OF_DEADZONE) {
        return this._detectedGesture;
      }
      this._lastFingerCount = fingerCount;
      this.applyScreenAspect(inputs);
      if (fingerCount !== lastFingerCount) {
        this.setFirstInput(inputs);
        return GESTURE.NONE;
      }
      if (fingerCount === 1) {
        const input = inputs[0];
        const prevPos = this._prevOneFingerPos.clone();
        const diff = new THREE.Vector2().subVectors(input, prevPos);
        if (diff.length() > deadzone) {
          if (Math.abs(diff.x) > Math.abs(diff.y)) {
            if (GESTURE.ONE_FINGER_HORIZONTAL & testingGestures) {
              this._detectedGesture = GESTURE.ONE_FINGER_HORIZONTAL;
            }
          } else {
            if (GESTURE.ONE_FINGER_VERTICAL & testingGestures) {
              this._detectedGesture = GESTURE.ONE_FINGER_VERTICAL;
            }
          }
        }
      } else if (fingerCount === 2) {
        const middle = new THREE.Vector2().addVectors(inputs[1], inputs[0]).multiplyScalar(0.5);
        const prevPos = this._prevTwoFingerPos.clone();
        const diff = new THREE.Vector2().subVectors(middle, prevPos);
        if (diff.length() > deadzone) {
          if (Math.abs(diff.x) > Math.abs(diff.y)) {
            if (GESTURE.TWO_FINGER_HORIZONTAL & testingGestures) {
              this._detectedGesture = GESTURE.TWO_FINGER_HORIZONTAL;
            }
          } else {
            if (GESTURE.TWO_FINGER_VERTICAL & testingGestures) {
              this._detectedGesture = GESTURE.TWO_FINGER_VERTICAL;
            }
          }
        }
        const distance = new THREE.Vector2().subVectors(inputs[1], inputs[0]).length();
        if (Math.abs(distance - this._initialTwoFingerDistance) > deadzone) {
          if (GESTURE.PINCH & testingGestures) {
            this._detectedGesture = GESTURE.PINCH;
          }
        }
      }
      if (this._detectedGesture !== GESTURE.NONE) {
        this._state = STATE$1.OUT_OF_DEADZONE;
      }
      return this._detectedGesture;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * AR control for {@link WebARSession}
   */
  class WebARControl {
    /**
     * Create new instance of ARControl
     * @param {WebARControlOptions} options Options
     */
    constructor(view3D, arScene, {
      rotate,
      translate,
      scale,
      ring,
      deadzone,
      initialScale
    }) {
      this._onSelectStart = evt => {
        const frame = evt.frame;
        const view3D = this._view3D;
        const arScene = this._arScene;
        const hitTestSource = this._hitTestSource;
        const deadzoneChecker = this._deadzoneChecker;
        const rotateControl = this._rotateControl;
        const translateControl = this._translateControl;
        const scaleControl = this._scaleControl;
        const threeRenderer = view3D.renderer.threeRenderer;
        const xrCamArray = threeRenderer.xr.getCamera(new THREE.PerspectiveCamera());
        const referenceSpace = threeRenderer.xr.getReferenceSpace();
        if (!hitTestSource || xrCamArray.cameras.length <= 0) return;
        const xrCam = xrCamArray.cameras[0];
        const model = view3D.model;
        // Update deadzone testing gestures
        if (rotateControl.enabled) {
          deadzoneChecker.addTestingGestures(GESTURE.ONE_FINGER);
        }
        if (translateControl.enabled) {
          deadzoneChecker.addTestingGestures(GESTURE.ONE_FINGER);
        }
        if (scaleControl.enabled) {
          deadzoneChecker.addTestingGestures(GESTURE.PINCH);
        }
        const hitResults = frame.getHitTestResultsForTransientInput(hitTestSource);
        const coords = this._hitResultToVector(hitResults);
        deadzoneChecker.applyScreenAspect(coords);
        deadzoneChecker.setFirstInput(coords);
        if (coords.length === 1) {
          // Check finger is on the model
          const targetRayPose = frame.getPose(hitResults[0].inputSource.targetRaySpace, referenceSpace);
          if (targetRayPose) {
            const camPos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
            const rayPose = targetRayPose.transform.position;
            const fingerDir = new THREE.Vector3(rayPose.x, rayPose.y, rayPose.z).sub(camPos).normalize();
            const fingerRay = new THREE.Ray(camPos, fingerDir);
            const modelBoundingSphere = model.bbox.getBoundingSphere(new THREE.Sphere());
            modelBoundingSphere.applyMatrix4(arScene.modelMovable.matrixWorld);
            const intersection = fingerRay.intersectSphere(modelBoundingSphere, new THREE.Vector3());
            if (intersection) {
              // Touch point intersected with model
              this._modelHit = true;
            }
          }
        }
        if (!this._vertical || this._modelHit) {
          this._floorIndicator.show();
        }
      };
      this._onSelectEnd = () => {
        this._deactivate();
        this._floorIndicator.fadeout();
      };
      this._view3D = view3D;
      this._arScene = arScene;
      this._vertical = false;
      this._initialized = false;
      this._modelHit = false;
      this._hitTestSource = null;
      this._rotate = rotate;
      this._translate = translate;
      this._scale = scale;
      this._initialScale = initialScale;
      this._rotateControl = new ARSwirlControl(getObjectOption(rotate));
      this._translateControl = new ARTranslateControl(getObjectOption(translate));
      this._scaleControl = new ARScaleControl(getObjectOption(scale));
      this._floorIndicator = new FloorIndicator(ring);
      this._deadzoneChecker = new DeadzoneChecker(deadzone);
    }
    /**
     * {@link ARSwirlControl} in this control
     */
    get rotate() {
      return this._rotateControl;
    }
    /**
     * {@link ARTranslateControl} in this control
     */
    get translate() {
      return this._translateControl;
    }
    /**
     * {@link ARScaleControl} in this control
     */
    get scale() {
      return this._scaleControl;
    }
    init({
      model,
      session,
      size,
      vertical,
      hitPosition,
      hitRotation
    }) {
      return __awaiter(this, void 0, void 0, function* () {
        const arScene = this._arScene;
        const translateControl = this._translateControl;
        const scaleControl = this._scaleControl;
        const floorIndicator = this._floorIndicator;
        const deadzoneChecker = this._deadzoneChecker;
        this._vertical = vertical;
        translateControl.init(hitPosition, hitRotation, vertical);
        deadzoneChecker.setAspect(size.height / size.width);
        arScene.add(floorIndicator.mesh, scaleControl.ui.mesh);
        this.syncTargetModel(model);
        const transientHitTestSource = yield session.requestHitTestSourceForTransientInput({
          profile: INPUT_PROFILE.TOUCH
        });
        this._hitTestSource = transientHitTestSource;
        this._initialized = true;
      });
    }
    /**
     * Destroy this control and deactivate it
     */
    destroy(session) {
      if (!this._initialized) return;
      if (this._hitTestSource) {
        this._hitTestSource.cancel();
        this._hitTestSource = null;
      }
      this.disable(session);
      this._floorIndicator.hide();
      this._scaleControl.ui.hide();
      session.removeEventListener(EVENTS$2.SELECT_START, this._onSelectStart);
      session.removeEventListener(EVENTS$2.SELECT_END, this._onSelectEnd);
      this._initialized = false;
    }
    enable(session) {
      const rotate = this._rotate;
      const translate = this._translate;
      const scale = this._scale;
      const rotateControl = this._rotateControl;
      const translateControl = this._translateControl;
      const scaleControl = this._scaleControl;
      const vertical = this._vertical;
      session.addEventListener(EVENTS$2.SELECT_START, this._onSelectStart);
      session.addEventListener(EVENTS$2.SELECT_END, this._onSelectEnd);
      if (rotate && !vertical) {
        rotateControl.enable();
      }
      if (translate) {
        translateControl.enable();
      }
      if (scale) {
        scaleControl.enable();
      }
    }
    disable(session) {
      const rotateControl = this._rotateControl;
      const translateControl = this._translateControl;
      const scaleControl = this._scaleControl;
      session.removeEventListener(EVENTS$2.SELECT_START, this._onSelectStart);
      session.removeEventListener(EVENTS$2.SELECT_END, this._onSelectEnd);
      this._deactivate();
      rotateControl.disable();
      translateControl.disable();
      scaleControl.disable();
    }
    update(ctx) {
      var _a;
      const {
        view3D,
        session,
        frame
      } = ctx;
      const hitTestSource = this._hitTestSource;
      if (!hitTestSource || !view3D.model) return;
      const deadzoneChecker = this._deadzoneChecker;
      const inputSources = session.inputSources;
      const hitResults = (_a = frame === null || frame === void 0 ? void 0 : frame.getHitTestResultsForTransientInput(hitTestSource)) !== null && _a !== void 0 ? _a : [];
      const coords = this._hitResultToVector(hitResults);
      const xrInputs = {
        coords,
        inputSources,
        hitResults
      };
      if (deadzoneChecker.inDeadzone) {
        this._checkDeadzone(ctx, xrInputs);
      } else {
        this._processInput(ctx, xrInputs);
      }
      this._updateControls(ctx);
    }
    syncTargetModel(model) {
      const initialScale = this._initialScale;
      const floorPosition = this._translateControl.floorPosition;
      const xrCam = this._view3D.renderer.threeRenderer.xr.getCamera(new THREE.PerspectiveCamera()).cameras[0];
      this._floorIndicator.updateSize(model);
      this._scaleControl.setInitialScale({
        scene: this._arScene,
        model,
        floorPosition,
        xrCam,
        initialScale
      });
    }
    _deactivate() {
      this._modelHit = false;
      this._deadzoneChecker.cleanup();
      this._rotateControl.deactivate();
      this._translateControl.deactivate();
      this._scaleControl.deactivate();
    }
    _checkDeadzone(ctx, {
      coords
    }) {
      const arScene = this._arScene;
      const rotateControl = this._rotateControl;
      const translateControl = this._translateControl;
      const scaleControl = this._scaleControl;
      const gesture = this._deadzoneChecker.check(coords.map(coord => coord.clone()));
      if (gesture === GESTURE.NONE) return;
      switch (gesture) {
        case GESTURE.ONE_FINGER_HORIZONTAL:
        case GESTURE.ONE_FINGER_VERTICAL:
          if (this._modelHit) {
            translateControl.activate();
            translateControl.setInitialPos(coords);
          } else {
            rotateControl.activate();
            rotateControl.updateRotation(arScene.modelMovable.quaternion);
            rotateControl.setInitialPos(coords);
          }
          break;
        case GESTURE.PINCH:
          scaleControl.activate(ctx);
          scaleControl.setInitialPos(coords);
          break;
      }
    }
    _processInput(ctx, inputs) {
      this._rotateControl.process(ctx, inputs);
      this._translateControl.process(ctx, inputs);
      this._scaleControl.process(ctx, inputs);
    }
    _updateControls(ctx) {
      const {
        delta
      } = ctx;
      const arScene = this._arScene;
      const rotateControl = this._rotateControl;
      const translateControl = this._translateControl;
      const scaleControl = this._scaleControl;
      const floorIndicator = this._floorIndicator;
      const deltaMilisec = delta * 1000;
      rotateControl.update(ctx, deltaMilisec);
      translateControl.update(ctx, deltaMilisec);
      scaleControl.update(ctx, deltaMilisec);
      const modelRotation = rotateControl.rotation;
      const floorPosition = translateControl.floorPosition;
      arScene.setRootPosition(floorPosition);
      floorIndicator.update({
        delta: deltaMilisec,
        rotation: modelRotation
      });
    }
    _hitResultToVector(hitResults) {
      return hitResults.map(input => {
        return new THREE.Vector2().set(input.inputSource.gamepad.axes[0], -input.inputSource.gamepad.axes[1]);
      });
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * A dedicated scene for WebXR-based AR session
   */
  class ARScene {
    /** */
    constructor() {
      this._root = new THREE.Scene();
      this._modelRoot = new THREE.Group();
      this._modelMovable = new THREE.Group();
      this._modelFixed = new THREE.Group();
      this._arRoot = new THREE.Group();
      const root = this._root;
      const modelRoot = this._modelRoot;
      const modelMovable = this._modelMovable;
      const modelFixed = this._modelFixed;
      const arRoot = this._arRoot;
      modelRoot.add(modelMovable);
      root.add(modelRoot, modelFixed, arRoot);
    }
    get root() {
      return this._root;
    }
    get modelRoot() {
      return this._modelRoot;
    }
    get modelMovable() {
      return this._modelMovable;
    }
    get arRoot() {
      return this._arRoot;
    }
    init(view3D) {
      const root = this._root;
      const modelMovable = this._modelMovable;
      const modelFixed = this._modelFixed;
      // Copy all scene objects into model objects
      const originalScene = view3D.scene;
      modelMovable.add(originalScene.userObjects, originalScene.envObjects);
      modelFixed.add(originalScene.fixedObjects);
      // Copy environment
      root.environment = originalScene.root.environment;
      // Start with root hidden, as floor should be detected first
      this.hideModel();
    }
    destroy(view3D) {
      const modelMovable = this._modelMovable;
      const modelFixed = this._modelFixed;
      const originalScene = view3D.scene;
      [...modelMovable.children, ...modelFixed.children].forEach(child => {
        originalScene.root.add(child);
      });
    }
    /**
     * Make this scene visible
     * @returns {void}
     */
    showModel() {
      this._modelRoot.visible = true;
    }
    /**
     * Make this scene invisible
     * @returns {void}
     */
    hideModel() {
      this._modelRoot.visible = false;
    }
    /**
     * Add AR-exclusive object
     */
    add(...objects) {
      this._arRoot.add(...objects);
    }
    /**
     * Remove objects from scene
     */
    remove(...objects) {
      this._arRoot.remove(...objects);
    }
    setRootPosition(pos) {
      const root = this._root;
      root.position.copy(pos);
    }
    setWallRotation(quat) {
      const root = this._root;
      root.quaternion.copy(quat);
    }
    updateModelRootPosition(model, vertical) {
      const modelRoot = this._modelRoot;
      if (!vertical) return;
      const modelHeight = model.bbox.max.y - model.bbox.min.y;
      modelRoot.position.setZ(modelHeight / 2);
      modelRoot.position.setY(-model.bbox.min.z);
      modelRoot.rotateX(-Math.PI / 2);
      modelRoot.updateMatrix();
    }
    setModelHovering(hoverAmount) {
      const modelMovable = this._modelMovable;
      modelMovable.position.setY(hoverAmount);
    }
    setModelRotation(quat) {
      const modelMovable = this._modelMovable;
      modelMovable.quaternion.copy(quat);
    }
    setModelScale(scalar) {
      const root = this._root;
      root.scale.setScalar(scalar);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Manager for WebXR dom-overlay feature
   */
  class DOMOverlay {
    constructor() {
      this._root = null;
    }
    /**
     * Return whether dom-overlay feature is available
     */
    static isAvailable() {
      return DOM_OVERLAY_SUPPORTED();
    }
    get root() {
      return this._root;
    }
    destroy() {
      this._root = null;
    }
    getFeatures(root) {
      this._root = root;
      return FEATURES.DOM_OVERLAY(root);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Manager for WebXR hit-test feature
   */
  class HitTest {
    constructor() {
      this._source = null;
    }
    /**
     * Return whether hit-test feature is available
     */
    static isAvailable() {
      return HIT_TEST_SUPPORTED();
    }
    /**
     * Return whether hit-test is ready
     */
    get ready() {
      return this._source != null;
    }
    /**
     * Destroy instance
     */
    destroy() {
      if (this._source) {
        this._source.cancel();
        this._source = null;
      }
    }
    /**
     * Initialize hit-test feature
     * @param {XRSession} session XRSession instance
     */
    init(session) {
      session.requestReferenceSpace(REFERENCE_SPACE.VIEWER).then(referenceSpace => {
        session.requestHitTestSource({
          space: referenceSpace
        }).then(source => {
          this._source = source;
        });
      });
    }
    /**
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/XRSessionInit XRSessionInit} object for hit-test feature
     */
    getFeatures() {
      return FEATURES.HIT_TEST;
    }
    /**
     * Get hit-test results
     * @param {XRFrame} frame XRFrame instance
     */
    getResults(frame) {
      var _a;
      return (_a = frame === null || frame === void 0 ? void 0 : frame.getHitTestResults(this._source)) !== null && _a !== void 0 ? _a : [];
    }
  }

  class SessionLightProbe {
    constructor(xrLight, renderer, lightProbe, environmentEstimation, estimationStartCallback) {
      this.xrLight = xrLight;
      this.renderer = renderer;
      this.lightProbe = lightProbe;
      this.xrWebGLBinding = null;
      this.estimationStartCallback = estimationStartCallback;
      this.frameCallback = this.onXRFrame.bind(this);
      var session = renderer.xr.getSession();

      // If the XRWebGLBinding class is available then we can also query an
      // estimated reflection cube map.
      if (environmentEstimation && 'XRWebGLBinding' in window) {
        // This is the simplest way I know of to initialize a WebGL cubemap in Three.
        var cubeRenderTarget = new THREE.WebGLCubeRenderTarget(16);
        xrLight.environment = cubeRenderTarget.texture;
        var gl = renderer.getContext();

        // Ensure that we have any extensions needed to use the preferred cube map format.
        switch (session.preferredReflectionFormat) {
          case 'srgba8':
            gl.getExtension('EXT_sRGB');
            break;
          case 'rgba16f':
            gl.getExtension('OES_texture_half_float');
            break;
        }
        this.xrWebGLBinding = new XRWebGLBinding(session, gl);
        this.lightProbe.addEventListener('reflectionchange', () => {
          this.updateReflection();
        });
      }

      // Start monitoring the XR animation frame loop to look for lighting
      // estimation changes.
      session.requestAnimationFrame(this.frameCallback);
    }
    updateReflection() {
      var textureProperties = this.renderer.properties.get(this.xrLight.environment);
      if (textureProperties) {
        var cubeMap = this.xrWebGLBinding.getReflectionCubeMap(this.lightProbe);
        if (cubeMap) {
          textureProperties.__webglTexture = cubeMap;
        }
      }
    }
    onXRFrame(time, xrFrame) {
      // If either this obejct or the XREstimatedLight has been destroyed, stop
      // running the frame loop.
      if (!this.xrLight) {
        return;
      }
      var session = xrFrame.session;
      session.requestAnimationFrame(this.frameCallback);
      var lightEstimate = xrFrame.getLightEstimate(this.lightProbe);
      if (lightEstimate) {
        // We can copy the estimate's spherical harmonics array directly into the light probe.
        this.xrLight.lightProbe.sh.fromArray(lightEstimate.sphericalHarmonicsCoefficients);
        this.xrLight.lightProbe.intensity = 1.0;

        // For the directional light we have to normalize the color and set the scalar as the
        // intensity, since WebXR can return color values that exceed 1.0.
        var intensityScalar = Math.max(1.0, Math.max(lightEstimate.primaryLightIntensity.x, Math.max(lightEstimate.primaryLightIntensity.y, lightEstimate.primaryLightIntensity.z)));
        this.xrLight.directionalLight.color.setRGB(lightEstimate.primaryLightIntensity.x / intensityScalar, lightEstimate.primaryLightIntensity.y / intensityScalar, lightEstimate.primaryLightIntensity.z / intensityScalar);
        this.xrLight.directionalLight.intensity = intensityScalar;
        this.xrLight.directionalLight.position.copy(lightEstimate.primaryLightDirection);
        if (this.estimationStartCallback) {
          this.estimationStartCallback();
          this.estimationStartCallback = null;
        }
      }
    }
    dispose() {
      this.xrLight = null;
      this.renderer = null;
      this.lightProbe = null;
      this.xrWebGLBinding = null;
    }
  }
  class XREstimatedLight extends THREE.Group {
    constructor(renderer) {
      var environmentEstimation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      super();
      this.lightProbe = new THREE.LightProbe();
      this.lightProbe.intensity = 0;
      this.add(this.lightProbe);
      this.directionalLight = new THREE.DirectionalLight();
      this.directionalLight.intensity = 0;
      this.add(this.directionalLight);

      // Will be set to a cube map in the SessionLightProbe is environment estimation is
      // available and requested.
      this.environment = null;
      var sessionLightProbe = null;
      var estimationStarted = false;
      renderer.xr.addEventListener('sessionstart', () => {
        var session = renderer.xr.getSession();
        if ('requestLightProbe' in session) {
          session.requestLightProbe({
            reflectionFormat: session.preferredReflectionFormat
          }).then(probe => {
            sessionLightProbe = new SessionLightProbe(this, renderer, probe, environmentEstimation, () => {
              estimationStarted = true;

              // Fired to indicate that the estimated lighting values are now being updated.
              this.dispatchEvent({
                type: 'estimationstart'
              });
            });
          });
        }
      });
      renderer.xr.addEventListener('sessionend', () => {
        if (sessionLightProbe) {
          sessionLightProbe.dispose();
          sessionLightProbe = null;
        }
        if (estimationStarted) {
          // Fired to indicate that the estimated lighting values are no longer being updated.
          this.dispatchEvent({
            type: 'estimationend'
          });
        }
      });

      // Done inline to provide access to sessionLightProbe.
      this.dispose = () => {
        if (sessionLightProbe) {
          sessionLightProbe.dispose();
          sessionLightProbe = null;
        }
        this.remove(this.lightProbe);
        this.lightProbe = null;
        this.remove(this.directionalLight);
        this.directionalLight = null;
        this.environment = null;
      };
    }
  }

  /**
   * Manager for WebXR light-estimation feature
   */
  class LightEstimation {
    constructor(view3D, arScene) {
      this._onEstimationStart = () => {
        const estimatedLight = this._light;
        const scene = this._arScene;
        if (!estimatedLight) return;
        scene.add(estimatedLight);
        if (estimatedLight.environment) {
          scene.root.environment = estimatedLight.environment;
        }
      };
      this._onEstimationEnd = () => {
        const estimatedLight = this._light;
        const scene = this._arScene;
        if (!estimatedLight) return;
        scene.remove(estimatedLight);
        scene.root.environment = this._origEnvironment;
      };
      this._view3D = view3D;
      this._arScene = arScene;
      this._light = null;
      this._origEnvironment = null;
    }
    /**
     * As light estimation is optional, always return true
     * @type {true}
     */
    static isAvailable() {
      return true;
    }
    /**
     * "light-estimation" as optionalFeatures
     */
    getFeatures() {
      return FEATURES.LIGHT_ESTIMATION;
    }
    init() {
      const renderer = this._view3D.renderer.threeRenderer;
      const estimatedLight = new XREstimatedLight(renderer);
      this._light = estimatedLight;
      estimatedLight.addEventListener(EVENTS$2.ESTIMATION_START, this._onEstimationStart);
      estimatedLight.addEventListener(EVENTS$2.ESTIMATION_END, this._onEstimationEnd);
    }
    destroy() {
      const estimatedLight = this._light;
      if (!estimatedLight) return;
      estimatedLight.removeEventListener(EVENTS$2.ESTIMATION_START, this._onEstimationStart);
      estimatedLight.removeEventListener(EVENTS$2.ESTIMATION_END, this._onEstimationEnd);
      this._light = null;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * WebXR based abstract AR session class
   */
  class WebARSession {
    /**
     * Create new instance of WebARSession
     * @param {View3D} view3D Instance of the View3D
     * @param {object} [options={}] Options
     * @param {object} [options.features={}] Additional features(see {@link https://developer.mozilla.org/en-US/docs/Web/API/XRSessionInit XRSessionInit}) of the WebXR session.
     * @param {boolean} [options.vertical=false] Whether to place 3D model vertically on the wall.
     * @param {HTMLElement|string|null} [options.overlayRoot=null] `dom-overlay`'s root element. You can set either HTMLElement or query selector for that element.
     * @param {boolean} [options.useLightEstimation=true] Whether to use `light-estimation` feature.
     * @param {boolean|ARSwirlControlOptions} [options.rotate=true] Options for the rotate control inside the AR session. You can disable rotate control by giving `false`.
     * @param {boolean|ARTranslateControlOptions} [options.translate=true] Options for the translate control inside the AR session. You can disable translate control by giving `false`.
     * @param {boolean|ARScaleControlOptions} [options.scale=true] Options for the scale control inside the AR session. You can disable scale control by giving `false`.
     * @param {FloorIndicatorOptions} [options.ring={}] Options for the floor ring.
     * @param {DeadzoneCheckerOptions} [options.deadzone={}] Control's deadzone options.
     * @param {"auto"|number} [options.initialScale="auto"] Initial scale of the model. If set to "auto", it will modify big overflowing 3D model's scale to fit the screen when it's initially displayed. This won't increase the 3D model's scale more than 1.
     */
    constructor(view3D, {
      features = EMPTY_FEATURES,
      vertical = false,
      overlayRoot = null,
      useLightEstimation = true,
      rotate = true,
      translate = true,
      scale = true,
      ring = {},
      deadzone = {},
      initialScale = AUTO
    } = {}) {
      this._view3D = view3D;
      // Init internal states
      this._modelPlaced = false;
      // Bind options
      this.features = features;
      this.vertical = vertical;
      this.overlayRoot = overlayRoot;
      this.useLightEstimation = useLightEstimation;
      // Create internal components
      this._arScene = new ARScene();
      this._control = new WebARControl(view3D, this._arScene, {
        rotate,
        translate,
        scale,
        ring,
        deadzone,
        initialScale
      });
      this._hitTest = new HitTest();
      this._domOverlay = new DOMOverlay();
      this._lightEstimation = new LightEstimation(view3D, this._arScene);
    }
    /**
     * Return availability of this session
     * @returns {Promise<boolean>} A Promise that resolves availability of this session(boolean).
     */
    static isAvailable() {
      if (!WEBXR_SUPPORTED() || !HitTest.isAvailable() || !DOMOverlay.isAvailable()) return Promise.resolve(false);
      return navigator.xr.isSessionSupported(SESSION.AR);
    }
    /**
     * {@link ARControl} instance of this session
     * @type ARFloorControl
     */
    get control() {
      return this._control;
    }
    get arScene() {
      return this._arScene;
    }
    get hitTest() {
      return this._hitTest;
    }
    get domOverlay() {
      return this._domOverlay;
    }
    get lightEstimation() {
      return this._lightEstimation;
    }
    /**
     * Enter session
     * @param view3D Instance of the View3D
     * @returns {Promise}
     */
    enter() {
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const scene = view3D.scene;
        const arScene = this._arScene;
        const renderer = view3D.renderer;
        const threeRenderer = renderer.threeRenderer;
        const control = this._control;
        const hitTest = this._hitTest;
        const domOverlay = this._domOverlay;
        const useLightEstimation = this.useLightEstimation;
        const lightEstimation = this._lightEstimation;
        const vertical = this.vertical;
        const features = this._getAllXRFeatures();
        // Enable xr
        threeRenderer.xr.enabled = true;
        if (useLightEstimation) {
          // Estimation requires "sessionstart" event of the renderer
          // So it should be initialized before requesting session
          lightEstimation.init();
        }
        const session = yield navigator.xr.requestSession(SESSION.AR, features);
        // Cache original values
        const originalPixelRatio = threeRenderer.getPixelRatio();
        threeRenderer.setPixelRatio(1);
        threeRenderer.xr.setReferenceSpaceType(REFERENCE_SPACE.LOCAL);
        yield threeRenderer.xr.setSession(session);
        arScene.init(view3D);
        hitTest.init(session);
        const onSessionEnd = () => __awaiter(this, void 0, void 0, function* () {
          control.destroy(session);
          arScene.destroy(view3D);
          lightEstimation.destroy();
          domOverlay.destroy();
          // Restore original values
          threeRenderer.setPixelRatio(originalPixelRatio);
          // Restore render loop
          renderer.stopAnimationLoop();
          renderer.setAnimationLoop(renderer.defaultRenderLoop);
          view3D.trigger(EVENTS$1.AR_END, {
            target: view3D,
            type: EVENTS$1.AR_END,
            session: this
          });
        });
        session.addEventListener("end", onSessionEnd, {
          once: true
        });
        // Set XR session render loop
        const screenSize = new THREE.Vector2(window.outerWidth, window.outerHeight);
        const arClock = new THREE.Clock();
        arClock.start();
        renderer.stopAnimationLoop();
        threeRenderer.xr.setAnimationLoop((_, frame) => {
          var _a, _b;
          const xrCamArray = threeRenderer.xr.getCamera(new THREE.PerspectiveCamera());
          const delta = arClock.getDelta();
          if (xrCamArray.cameras.length <= 0) return;
          const xrCam = xrCamArray.cameras[0];
          const referenceSpace = threeRenderer.xr.getReferenceSpace();
          const glLayer = session.renderState.baseLayer;
          const size = {
            width: (_a = glLayer === null || glLayer === void 0 ? void 0 : glLayer.framebufferWidth) !== null && _a !== void 0 ? _a : 1,
            height: (_b = glLayer === null || glLayer === void 0 ? void 0 : glLayer.framebufferHeight) !== null && _b !== void 0 ? _b : 1
          };
          const ctx = {
            view3D,
            scene: arScene,
            session,
            delta,
            frame,
            vertical,
            referenceSpace,
            xrCam,
            size
          };
          const deltaMiliSec = delta * 1000;
          view3D.trigger(EVENTS$1.BEFORE_RENDER, {
            type: EVENTS$1.BEFORE_RENDER,
            target: view3D,
            delta: deltaMiliSec
          });
          if (!this._modelPlaced) {
            this._initModelPosition(ctx);
          } else {
            view3D.animator.update(delta);
            control.update(ctx);
            scene.shadowPlane.render();
            threeRenderer.render(arScene.root, xrCam);
            view3D.annotation.render(xrCam, screenSize);
          }
          view3D.trigger(EVENTS$1.RENDER, {
            type: EVENTS$1.RENDER,
            target: view3D,
            delta: deltaMiliSec
          });
        });
        view3D.trigger(EVENTS$1.AR_START, {
          type: EVENTS$1.AR_START,
          target: view3D,
          session: this
        });
      });
    }
    /**
     * Exit this session
     */
    exit() {
      return __awaiter(this, void 0, void 0, function* () {
        const session = this._view3D.renderer.threeRenderer.xr.getSession();
        return session === null || session === void 0 ? void 0 : session.end();
      });
    }
    _getAllXRFeatures() {
      var _a;
      const userFeatures = this.features;
      const overlayRoot = (_a = getNullableElement(this.overlayRoot)) !== null && _a !== void 0 ? _a : this._createARRootElement();
      return merge({}, this._domOverlay.getFeatures(overlayRoot), this._hitTest.getFeatures(), this._lightEstimation.getFeatures(), userFeatures);
    }
    _initModelPosition(ctx) {
      const {
        frame,
        session,
        size,
        vertical,
        referenceSpace
      } = ctx;
      const view3D = this._view3D;
      const model = view3D.model;
      const arScene = this._arScene;
      const hitTest = this._hitTest;
      // Make sure the model is loaded
      if (!hitTest.ready || !model) return;
      const control = this._control;
      const hitTestResults = hitTest.getResults(frame);
      if (hitTestResults.length <= 0) return;
      const hit = hitTestResults[0];
      const hitPose = hit.getPose(referenceSpace);
      if (!hitPose) return;
      const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
      // If transformed coords space's y axis is not facing the correct direction, don't use it.
      if (!vertical && hitMatrix.elements[5] < 0.75 || vertical && (hitMatrix.elements[5] >= 0.25 || hitMatrix.elements[5] <= -0.25)) return;
      const hitPosition = new THREE.Vector3().setFromMatrixPosition(hitMatrix);
      const hitRotation = new THREE.Quaternion();
      if (vertical) {
        const globalUp = new THREE.Vector3(0, 1, 0);
        const hitOrientation = hitPose.transform.orientation;
        const wallNormal = globalUp.clone().applyQuaternion(new THREE.Quaternion(hitOrientation.x, hitOrientation.y, hitOrientation.z, hitOrientation.w)).normalize();
        const wallX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), wallNormal);
        const wallMatrix = new THREE.Matrix4().makeBasis(wallX, globalUp, wallNormal);
        const wallEuler = new THREE.Euler(0, 0, 0, "YXZ").setFromRotationMatrix(wallMatrix);
        wallEuler.z = 0;
        wallEuler.x = Math.PI / 2;
        hitRotation.setFromEuler(wallEuler);
        arScene.setWallRotation(hitRotation);
      }
      // Reset rotation & update position
      arScene.updateModelRootPosition(model, vertical);
      arScene.setRootPosition(hitPosition);
      arScene.showModel();
      // Don't need hit-test anymore, as we're having new one in WebARControl
      hitTest.destroy();
      this._modelPlaced = true;
      view3D.trigger(EVENTS$1.AR_MODEL_PLACED, {
        type: EVENTS$1.AR_MODEL_PLACED,
        target: view3D,
        session: this,
        model
      });
      void control.init({
        model,
        vertical,
        session,
        size,
        hitPosition,
        hitRotation
      });
      const initialScale = control.scale.scale;
      // Show scale up animation
      const scaleUpAnimation = new Animation({
        context: session,
        duration: 1000
      });
      scaleUpAnimation.on("progress", evt => {
        arScene.setModelScale(evt.easedProgress * initialScale);
      });
      scaleUpAnimation.on("finish", () => {
        arScene.setModelScale(initialScale);
        control.enable(session);
      });
      scaleUpAnimation.start();
    }
    _createARRootElement() {
      const view3D = this._view3D;
      const root = document.createElement(EL_DIV);
      root.classList.add(AR_OVERLAY_CLASS);
      view3D.rootEl.appendChild(root);
      view3D.once(EVENTS$1.AR_END, () => {
        view3D.rootEl.removeChild(root);
      });
      return root;
    }
  }
  WebARSession.type = AR_SESSION_TYPE.WEBXR;

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * AR session using Google's scene-viewer
   * @see https://developers.google.com/ar/develop/java/scene-viewer
   */
  class SceneViewerSession {
    /**
     * Create new instance of SceneViewerSession
     * @see https://developers.google.com/ar/develop/java/scene-viewer
     * @param {View3D} view3D Instance of the View3D
     * @param {object} [params={}] Session params
     * @param {string} [params.file=null] This URL specifies the glTF or glb file that should be loaded into Scene Viewer. This should be URL-escaped. If `null` is given, it will try to use current model shown on the canvas. This behavior only works when the format of the model shown is either "glTF" or "glb".
     * @param {string} [params.mode="ar_only"] See [SCENE_VIEWER_MODE](/docs/api/SCENE_VIEWER_MODE) for available modes (also check their [official page](https://developers.google.com/ar/develop/java/scene-viewer) for details).
     * @param {string} [params.fallbackURL=null] This is a Google Chrome feature supported only for web-based implementations. When the Google app com.google.android.googlequicksearchbox is not present on the device, this is the URL that Google Chrome navigates to.
     * @param {string} [params.title=null] A name for the model. If present, it will be displayed in the UI. The name will be truncated with ellipses after 60 characters.
     * @param {string} [params.link=null] A URL for an external webpage. If present, a button will be surfaced in the UI that intents to this URL when clicked.
     * @param {string} [params.sound=null] A URL to a looping audio track that is synchronized with the first animation embedded in a glTF file. It should be provided alongside a glTF with an animation of matching length. If present, the sound is looped after the model is loaded. This should be URL-escaped.
     * @param {boolean} [params.resizable=true] When set to false, users will not be able to scale the model in the AR experience. Scaling works normally in the 3D experience.
     * @param {boolean} [params.vertical=false] When set to true, users will be able to place the model on a vertical surface.
     * @param {boolean} [params.disableOcclusion=false] When set to true, SceneViewer will disable {@link https://developers.google.com/ar/develop/java/depth/introduction object blending}
     * @param {string} [params.initialScale="auto"] Initial scale of the 3D model. If set to `null`, 3D model will shown as its original size and will disable the "View actual size" button. Default value is "auto", and "1" will show model size in 100%, "2" in 200%, "0.5" in 50% and so on.
     * @param {string} [params.shareText=null] A text that will be displayed when user clicked the share button.
     */
    constructor(view3D, _a = {}) {
      var {
          file = null,
          mode = SCENE_VIEWER_MODE.ONLY_AR,
          fallbackURL = null,
          title = null,
          link = null,
          sound = null,
          resizable = true,
          vertical = false,
          disableOcclusion = false,
          initialScale = AUTO,
          shareText = null
        } = _a,
        otherParams = __rest(_a, ["file", "mode", "fallbackURL", "title", "link", "sound", "resizable", "vertical", "disableOcclusion", "initialScale", "shareText"]);
      this._view3D = view3D;
      this.file = file;
      this.fallbackURL = fallbackURL;
      this.mode = mode;
      this.title = title;
      this.link = link;
      this.sound = sound;
      this.resizable = resizable;
      this.vertical = vertical;
      this.disableOcclusion = disableOcclusion;
      this.initialScale = initialScale;
      this.shareText = shareText;
      this.otherParams = otherParams;
    }
    /**
     * Return the availability of SceneViewerSession.
     * Scene-viewer is available on all android devices with google ARCore installed.
     * @returns {Promise} A Promise that resolves availability of this session(boolean).
     */
    static isAvailable() {
      return Promise.resolve(IS_ANDROID());
    }
    /**
     * Enter Scene-viewer AR session
     */
    enter() {
      var _a, _b;
      return __awaiter(this, void 0, void 0, function* () {
        const model = this._view3D.model;
        const params = Object.assign({
          title: this.title,
          link: this.link,
          sound: this.sound,
          mode: this.mode,
          initial_scale: this.initialScale
        }, this.otherParams);
        params.resizable = toBooleanString(this.resizable);
        params.enable_vertical_placement = toBooleanString(this.vertical);
        params.disable_occlusion = toBooleanString(this.disableOcclusion);
        params.share_text = this.shareText ? encodeURIComponent(this.shareText) : null;
        const file = (_a = this.file) !== null && _a !== void 0 ? _a : model.src;
        if (!file) {
          return Promise.reject(new View3DError(ERROR.MESSAGES.FILE_NOT_SUPPORTED((_b = this.file) !== null && _b !== void 0 ? _b : model.src), ERROR.CODES.FILE_NOT_SUPPORTED));
        }
        params.file = new URL(file, window.location.href).href;
        const fallbackURL = this.fallbackURL;
        const queryString = Object.keys(params).filter(key => params[key] != null).map(key => `${key}=${params[key]}`).join("&");
        const intentURL = params.mode === SCENE_VIEWER_MODE.ONLY_AR ? SCENE_VIEWER.INTENT_AR_CORE(queryString, fallbackURL) : SCENE_VIEWER.INTENT_SEARCHBOX(queryString, fallbackURL || SCENE_VIEWER.FALLBACK_DEFAULT(queryString));
        const anchor = document.createElement("a");
        anchor.href = intentURL;
        anchor.click();
      });
    }
    exit() {
      return Promise.resolve();
    }
  }
  SceneViewerSession.type = AR_SESSION_TYPE.SCENE_VIEWER;

  /**
   * AR Session using Apple AR Quick Look Viewer
   * @see https://developer.apple.com/augmented-reality/quick-look/
   */
  class QuickLookSession {
    /**
     * Create new instance of QuickLookSession
     * @param {View3D} view3D Instance of the View3D
     * @param {object} [options={}] Quick Look options
     * @param {boolean} [options.allowsContentScaling=true] Whether to allow content scaling.
     * @param {string | null} [options.canonicalWebPageURL=null] The web URL to share when the user invokes the share sheet. If `null` is given, the USDZ file will be shared.
     * @param {string | null} [options.applePayButtonType=null] Type of the apple pay button in the banner. See {@link QUICK_LOOK_APPLE_PAY_BUTTON_TYPE}
     * @param {string | null} [options.callToAction=null] A text that will be displayed instead of Apple Pay Button. See {@link https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look#3405143 Official Guide Page}
     * @param {string | null} [options.checkoutTitle=null] Title of the previewed item. See {@link https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look#3405142 Official Guide Page}
     * @param {string | null} [options.checkoutSubtitle=null] Subtitle of the previewed item. See {@link https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look#3405142 Official Guide Page}
     * @param {string | null} [options.price=null] Price of the previewed item. See {@link https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look#3405142 Official Guide Page}
     * @param {string | null} [options.custom=null] Custom URL to the banner HTML. See {@link https://developer.apple.com/documentation/arkit/adding_an_apple_pay_button_or_a_custom_action_in_ar_quick_look#3402837 Official Guide Page}
     * @param {string | null} [options.customHeight=null] Height of the custom banner. See {@link QUICK_LOOK_CUSTOM_BANNER_SIZE}
     */
    constructor(view3D, {
      allowsContentScaling = true,
      canonicalWebPageURL = null,
      applePayButtonType = null,
      callToAction = null,
      checkoutTitle = null,
      checkoutSubtitle = null,
      price = null,
      custom = null,
      customHeight = null
    } = {}) {
      this._view3D = view3D;
      this.allowsContentScaling = allowsContentScaling;
      this.canonicalWebPageURL = canonicalWebPageURL;
      this.applePayButtonType = applePayButtonType;
      this.callToAction = callToAction;
      this.checkoutTitle = checkoutTitle;
      this.checkoutSubtitle = checkoutSubtitle;
      this.price = price;
      this.custom = custom;
      this.customHeight = customHeight;
    }
    /**
     * Return the availability of QuickLookSession.
     * QuickLook AR is available on iOS12+
     * @returns {Promise} A Promise that resolves availability of this session(boolean).
     */
    static isAvailable() {
      return Promise.resolve(QUICK_LOOK_SUPPORTED() && IS_IOS());
    }
    /**
     * Enter QuickLook AR Session
     */
    enter() {
      const view3D = this._view3D;
      const file = view3D.iosSrc;
      if (!file) {
        return Promise.reject(new View3DError(ERROR.MESSAGES.FILE_NOT_SUPPORTED(`${file}`), ERROR.CODES.FILE_NOT_SUPPORTED));
      }
      const canonicalWebPageURL = this.canonicalWebPageURL;
      const custom = this.custom;
      const currentHref = window.location.href;
      const anchor = document.createElement("a");
      anchor.setAttribute("rel", "ar");
      anchor.appendChild(document.createElement("img"));
      const hashObj = Object.entries({
        applePayButtonType: this.applePayButtonType,
        callToAction: this.callToAction,
        checkoutTitle: this.checkoutTitle,
        checkoutSubtitle: this.checkoutSubtitle,
        price: this.price,
        customHeight: this.customHeight
      }).reduce((obj, [key, value]) => {
        if (value) {
          obj[key] = value;
        }
        return obj;
      }, {});
      const usdzURL = new URL(file, currentHref);
      if (!this.allowsContentScaling) {
        hashObj.allowsContentScaling = "0";
      }
      if (canonicalWebPageURL) {
        hashObj.canonicalWebPageURL = new URL(canonicalWebPageURL, currentHref).href;
      }
      if (custom) {
        hashObj.custom = new URL(custom, currentHref).href;
      }
      usdzURL.hash = new URLSearchParams(hashObj).toString();
      anchor.setAttribute("href", usdzURL.href);
      anchor.addEventListener("message", evt => {
        if (evt.data === "_apple_ar_quicklook_button_tapped") {
          // User tapped either Apple pay button / Custom action button
          view3D.trigger(EVENTS$1.QUICK_LOOK_TAP, Object.assign(Object.assign({}, evt), {
            type: EVENTS$1.QUICK_LOOK_TAP,
            target: view3D
          }));
        }
      }, false);
      anchor.click();
      return Promise.resolve();
    }
    exit() {
      return Promise.resolve();
    }
  }
  QuickLookSession.type = AR_SESSION_TYPE.QUICK_LOOK;

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  const sessionCtors = {
    [AR_SESSION_TYPE.WEBXR]: WebARSession,
    [AR_SESSION_TYPE.SCENE_VIEWER]: SceneViewerSession,
    [AR_SESSION_TYPE.QUICK_LOOK]: QuickLookSession
  };
  /**
   * ARManager that manages AR sessions
   */
  class ARManager {
    /**
     * Create a new instance of the ARManager
     * @param {View3D} view3D An instance of the View3D
     */
    constructor(view3D) {
      this._view3D = view3D;
      this._activeSession = null;
      view3D.on(EVENTS$1.AR_START, ({
        session
      }) => {
        this._activeSession = session;
      });
      view3D.on(EVENTS$1.AR_END, () => {
        this._activeSession = null;
      });
    }
    get activeSession() {
      return this._activeSession;
    }
    /**
     * Return a Promise containing whether any of the added session is available
     * If any of the AR session in current environment, this will return `true`
     * @returns {Promise<boolean>} Availability of the AR session
     */
    isAvailable() {
      return __awaiter(this, void 0, void 0, function* () {
        const sessions = this._getSesssionClasses();
        const results = yield Promise.all(sessions.map(session => session.isAvailable()));
        return results.some(result => result === true);
      });
    }
    /**
     * Enter XR Session.
     * This should be called from a user interaction.
     */
    enter() {
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        if (!view3D.model || !view3D.initialized) {
          throw new View3DError(ERROR.MESSAGES.NOT_INITIALIZED, ERROR.CODES.NOT_INITIALIZED);
        }
        const sessions = this._getSesssionClasses();
        for (const session of sessions) {
          try {
            if (yield session.isAvailable()) {
              const sessionInstance = new session(view3D, getObjectOption(view3D[session.type]));
              yield sessionInstance.enter();
              return Promise.resolve();
            }
          } catch (err) {} // eslint-disable-line no-empty
        }
        // No sessions were available
        return Promise.reject();
      });
    }
    /**
     * Exit current XR Session.
     */
    exit() {
      return __awaiter(this, void 0, void 0, function* () {
        const activeSession = this._activeSession;
        activeSession === null || activeSession === void 0 ? void 0 : activeSession.exit();
      });
    }
    _getSesssionClasses() {
      return this._getUsingSessionTypes().map(sessionType => sessionCtors[sessionType]);
    }
    _getUsingSessionTypes() {
      const view3D = this._view3D;
      const priority = view3D.arPriority;
      return priority.filter(sessionType => !!view3D[sessionType]);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Annotation(Hotspot) base class
   */
  class Annotation {
    /**
     * @param {View3D} view3D Instance of the view3D
     * @param {AnnotationOptions} [options={}] Options
     */
    constructor(view3D, {
      element = null,
      focus = [],
      focusDuration = 1000,
      focusOffset = [],
      baseFov = 45,
      baseDistance = null
    } = {}) {
      this._onClick = () => {
        void this.focus();
      };
      this._onWheel = evt => {
        evt.preventDefault();
        evt.stopPropagation();
      };
      this._view3D = view3D;
      this._element = element;
      this._focus = focus;
      this._focusDuration = focusDuration;
      this._focusOffset = focusOffset;
      this._baseFov = baseFov;
      this._baseDistance = baseDistance;
      this._enabled = false;
      this._hidden = false;
      this._focusing = false;
      this._tooltipSize = new THREE.Vector2();
      if (element) {
        element.draggable = false;
        this.resize();
      }
    }
    /**
     * Element of the annotation
     * @type {HTMLElement}
     * @readonly
     */
    get element() {
      return this._element;
    }
    /**
     * Whether this annotation is renderable in the screen
     * @type {boolean}
     * @readonly
     */
    get renderable() {
      return !!this._element;
    }
    /**
     * Whether this annotation is focused
     * @type {boolean}
     * @readonly
     */
    get focusing() {
      return this._focusing;
    }
    /**
     * An array of values in order of [yaw, pitch, zoom]
     * @type {number[]}
     * @readonly
     */
    get focusPose() {
      return this._focus;
    }
    /**
     * Duration of the focus animation
     * @type {number}
     */
    get focusDuration() {
      return this._focusDuration;
    }
    /**
     * Offset vector from the pivot when focused
     * @type {number[]}
     * @readonly
     */
    get focusOffset() {
      return this._focusOffset;
    }
    /**
     * Base fov value that annotation is referencing
     * @type {number}
     */
    get baseFov() {
      return this._baseFov;
    }
    /**
     * Base dsitance value that annotation is referencing
     * @type {number | null}
     */
    get baseDistance() {
      return this._baseDistance;
    }
    /**
     * Whether the annotation is hidden and not rendered
     * @type {boolean}
     * @readonly
     */
    get hidden() {
      return this._hidden;
    }
    set focusDuration(val) {
      this._focusDuration = val;
    }
    set baseFov(val) {
      this._baseFov = val;
    }
    set baseDistance(val) {
      this._baseDistance = val;
    }
    /**
     * Destroy annotation and release all resources.
     */
    destroy() {
      const wrapper = this._view3D.annotation.wrapper;
      const element = this._element;
      this.disableEvents();
      if (element && element.parentElement === wrapper) {
        wrapper.removeChild(element);
      }
    }
    /**
     * Resize annotation to the current size
     */
    resize() {
      const el = this._element;
      if (!el) return;
      const tooltip = el.querySelector(`.${DEFAULT_CLASS.ANNOTATION_TOOLTIP}`);
      if (tooltip) {
        this._tooltipSize.set(tooltip.offsetWidth, tooltip.offsetHeight);
      }
    }
    /**
     * Render annotation element
     * @param {object} params
     * @internal
     */
    render({
      screenPos,
      screenSize,
      renderOrder
    }) {
      const el = this._element;
      const tooltipSize = this._tooltipSize;
      if (!el || this._hidden) return;
      el.style.zIndex = `${renderOrder + 1}`;
      el.style.transform = `translate(-50%, -50%) translate(${screenPos.x}px, ${screenPos.y}px)`;
      if (screenPos.y + tooltipSize.y > screenSize.y) {
        el.classList.add(DEFAULT_CLASS.ANNOTATION_FLIP_Y);
      } else {
        el.classList.remove(DEFAULT_CLASS.ANNOTATION_FLIP_Y);
      }
      if (screenPos.x + tooltipSize.x > screenSize.x) {
        el.classList.add(DEFAULT_CLASS.ANNOTATION_FLIP_X);
      } else {
        el.classList.remove(DEFAULT_CLASS.ANNOTATION_FLIP_X);
      }
    }
    /**
     * Show annotation.
     * A class "hidden" will be removed from the annotation element.
     */
    show() {
      const el = this._element;
      this._hidden = false;
      if (el) {
        el.classList.remove(DEFAULT_CLASS.ANNOTATION_HIDDEN);
      }
    }
    /**
     * Hide annotation and prevent it from being rendered.
     * A class "hidden" will be added to the annotation element.
     */
    hide() {
      const el = this._element;
      this._hidden = true;
      if (el) {
        el.classList.add(DEFAULT_CLASS.ANNOTATION_HIDDEN);
      }
    }
    /**
     * Set opacity of the annotation
     * Opacity is automatically controlled with [annotationBreakpoints](/docs/options/annotation/annotationBreakpoints)
     * @param {number} opacity Opacity to apply, number between 0 and 1
     */
    setOpacity(opacity) {
      const el = this._element;
      if (!el) return;
      el.style.opacity = `${opacity}`;
    }
    /**
     * Add browser event handlers
     * @internal
     */
    enableEvents() {
      const el = this._element;
      if (!el || this._enabled) return;
      el.addEventListener(EVENTS.CLICK, this._onClick);
      el.addEventListener(EVENTS.WHEEL, this._onWheel);
      this._enabled = true;
    }
    /**
     * Remove browser event handlers
     * @internal
     */
    disableEvents() {
      const el = this._element;
      if (!el || !this._enabled) return;
      el.removeEventListener(EVENTS.CLICK, this._onClick);
      el.removeEventListener(EVENTS.WHEEL, this._onWheel);
      this._enabled = false;
    }
    handleUserInput() {
      if (!this._focusing) return;
      const view3D = this._view3D;
      if (view3D.annotationAutoUnfocus) {
        this.unfocus();
      }
    }
    _getFocus() {
      var _a;
      const view3D = this._view3D;
      const focusVector = new THREE.Vector3().fromArray(this._focus);
      const currentDistance = view3D.camera.baseDistance;
      const baseFov = this._baseFov;
      const baseDistance = (_a = this._baseDistance) !== null && _a !== void 0 ? _a : currentDistance;
      const targetRenderHeight = baseDistance * Math.tan(toRadian((baseFov - focusVector.z) / 2));
      const targetFov = 2 * toDegree(Math.atan(targetRenderHeight / currentDistance));
      // zoom value
      focusVector.z = view3D.camera.baseFov - targetFov;
      return focusVector;
    }
    _getPivotOffset() {
      var _a, _b, _c;
      const offset = this._focusOffset;
      return new THREE.Vector3((_a = offset[0]) !== null && _a !== void 0 ? _a : 0, (_b = offset[1]) !== null && _b !== void 0 ? _b : 0, (_c = offset[2]) !== null && _c !== void 0 ? _c : 0);
    }
    _onFocus() {
      const view3D = this._view3D;
      const el = this._element;
      view3D.annotation.list.forEach(annotation => {
        if (annotation._focusing) {
          annotation.unfocus();
        }
      });
      if (el) {
        el.classList.add(DEFAULT_CLASS.ANNOTATION_SELECTED);
      }
      this._focusing = true;
      view3D.trigger(EVENTS$1.ANNOTATION_FOCUS, {
        type: EVENTS$1.ANNOTATION_FOCUS,
        target: view3D,
        annotation: this
      });
    }
    _onUnfocus() {
      const view3D = this._view3D;
      const el = this._element;
      if (el) {
        el.classList.remove(DEFAULT_CLASS.ANNOTATION_SELECTED);
      }
      this._focusing = false;
      view3D.trigger(EVENTS$1.ANNOTATION_UNFOCUS, {
        type: EVENTS$1.ANNOTATION_UNFOCUS,
        target: view3D,
        annotation: this
      });
    }
  }

  /**
   * {@link Annotation} that stays at one point
   */
  class PointAnnotation extends Annotation {
    /** */
    constructor(view3D, _a = {}) {
      var {
          position = []
        } = _a,
        commonOptions = __rest(_a, ["position"]);
      super(view3D, commonOptions);
      this._position = new THREE.Vector3().fromArray(position);
    }
    get position() {
      return this._position;
    }
    focus() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this._focusing) return;
        const {
          camera
        } = this._view3D;
        const focus = this._focus;
        let targetPose;
        const pivotOffset = this._getPivotOffset();
        const position = new THREE.Vector3().addVectors(this._position, pivotOffset);
        if (focus.length > 0) {
          const focusVector = this._getFocus();
          targetPose = new Pose(focusVector.x, focusVector.y, focusVector.z, position.toArray());
        } else {
          const modelToPos = this._calculateNormalFromModelCenter();
          const {
            yaw,
            pitch
          } = directionToYawPitch(modelToPos);
          targetPose = new Pose(toDegree(yaw), toDegree(pitch), 0, position.toArray());
        }
        window.addEventListener(EVENTS.CLICK, () => {
          this.unfocus();
        }, {
          once: true,
          capture: true
        });
        this._onFocus();
        if (!targetPose.equals(camera.currentPose)) {
          return camera.reset(this._focusDuration, EASING$1, targetPose);
        } else {
          return Promise.resolve();
        }
      });
    }
    unfocus() {
      if (!this._focusing) return;
      this._onUnfocus();
    }
    toJSON() {
      return {
        position: this._position.toArray(),
        focus: this._focus,
        duration: this._focusDuration,
        focusOffset: this._focusOffset
      };
    }
    _calculateNormalFromModelCenter() {
      const view3D = this._view3D;
      const model = view3D.model;
      const center = model ? model.bbox.getCenter(new THREE.Vector3()) : new THREE.Vector3();
      return new THREE.Vector3().subVectors(this._position, center).normalize();
    }
  }

  /**
   * {@link Annotation} that tracks position of mesh face(triangle)
   */
  class FaceAnnotation extends Annotation {
    /** */
    constructor(view3D, _a = {}) {
      var {
          meshIndex = -1,
          faceIndex = -1,
          weights = range(3).map(() => 1 / 3)
        } = _a,
        commonOptions = __rest(_a, ["meshIndex", "faceIndex", "weights"]);
      super(view3D, commonOptions);
      this._meshIndex = meshIndex;
      this._faceIndex = faceIndex;
      this._weights = weights;
      this._trackingControl = null;
    }
    get position() {
      return this._getPosition();
    }
    get renderable() {
      return !!this._element && this._meshIndex >= 0 && this._faceIndex >= 0;
    }
    get meshIndex() {
      return this._meshIndex;
    }
    get faceIndex() {
      return this._faceIndex;
    }
    get weights() {
      return this._weights;
    }
    focus() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this._focusing) return;
        const view3D = this._view3D;
        const {
          camera,
          control
        } = view3D;
        const focus = this._getFocus();
        const pivot = this._getFocusPivot();
        const targetPose = new Pose(focus.x, focus.y, focus.z, pivot.toArray());
        const trackingControl = new AnimationControl(view3D, camera.currentPose, targetPose, {
          duration: this._focusDuration,
          disableOnFinish: false
        });
        this._trackingControl = trackingControl;
        trackingControl.enable();
        control.add(trackingControl);
        this._onFocus();
      });
    }
    unfocus() {
      if (!this._focusing) return;
      this.destroyTrackingControl();
      this._onUnfocus();
    }
    render(params) {
      super.render(params);
      const trackingControl = this._trackingControl;
      if (!trackingControl) return;
      const {
        camera
      } = this._view3D;
      const focus = this._getFocus();
      const pivot = this._getFocusPivot();
      const targetPose = new Pose(focus.x, focus.y, focus.z, pivot.toArray());
      trackingControl.changeStartEnd(camera.currentPose, targetPose);
      trackingControl.reset();
    }
    handleUserInput() {
      if (!this._focusing) return;
      const view3D = this._view3D;
      if (view3D.annotationAutoUnfocus) {
        this.unfocus();
      } else {
        this.destroyTrackingControl();
      }
    }
    toJSON() {
      return {
        meshIndex: this._meshIndex,
        faceIndex: this._faceIndex,
        focus: this._focus,
        duration: this._focusDuration,
        focusOffset: this._focusOffset
      };
    }
    destroyTrackingControl() {
      const {
        control
      } = this._view3D;
      const trackingControl = this._trackingControl;
      if (!trackingControl) return;
      control.sync();
      control.remove(trackingControl);
      trackingControl.destroy();
      this._trackingControl = null;
    }
    _getPosition() {
      const model = this._view3D.model;
      const meshIndex = this._meshIndex;
      const faceIndex = this._faceIndex;
      const weights = this._weights;
      const animatedVertices = getAnimatedFace(model, meshIndex, faceIndex);
      if (!animatedVertices) return new THREE.Vector3();
      // barycentric
      return new THREE.Vector3().addScaledVector(animatedVertices[0], weights[0]).addScaledVector(animatedVertices[1], weights[1]).addScaledVector(animatedVertices[2], weights[2]);
    }
    _getFocusPivot() {
      const basePosition = this._getPosition();
      const pivotOffset = this._getPivotOffset();
      return new THREE.Vector3().addVectors(basePosition, pivotOffset);
    }
  }

  /**
   * Manager class for {@link Annotation}
   */
  class AnnotationManager {
    /** */
    constructor(view3D) {
      this._onInput = () => {
        const annotations = this._list;
        annotations.forEach(annotation => {
          annotation.handleUserInput();
        });
      };
      this._view3D = view3D;
      this._list = [];
      this._wrapper = getNullableElement(view3D.annotationWrapper, view3D.rootEl) || this._createWrapper();
    }
    /**
     * List of annotations
     * @type {Annotation[]}
     * @readonly
     */
    get list() {
      return this._list;
    }
    /**
     * Wrapper element for annotations
     * @type {HTMLElement}
     * @readonly
     */
    get wrapper() {
      return this._wrapper;
    }
    /**
     * Init AnnotationManager
     */
    init() {
      const view3D = this._view3D;
      view3D.control.controls.forEach(control => {
        control.on({
          [CONTROL_EVENTS.HOLD]: this._onInput
        });
      });
    }
    /**
     * Destroy all annotations & event handlers
     */
    destroy() {
      this._view3D.control.controls.forEach(control => {
        control.off({
          [CONTROL_EVENTS.HOLD]: this._onInput
        });
      });
      this.reset();
    }
    /**
     * Resize annotations
     */
    resize() {
      this._list.forEach(annotation => {
        annotation.resize();
      });
    }
    /**
     * Collect annotations inside the wrapper element
     */
    collect() {
      const view3D = this._view3D;
      const wrapper = this._wrapper;
      const annotationEls = [].slice.apply(wrapper.querySelectorAll(view3D.annotationSelector));
      const annotations = annotationEls.map(element => {
        const focusStr = element.dataset.focus;
        const focus = focusStr ? focusStr.split(" ").map(val => parseFloat(val)) : [];
        const focusDuration = element.dataset.duration ? parseFloat(element.dataset.duration) : void 0;
        const commonOptions = {
          element,
          focus,
          focusDuration
        };
        if (element.dataset.meshIndex) {
          const meshIndex = parseFloat(element.dataset.meshIndex);
          const faceIndex = element.dataset.faceIndex ? parseFloat(element.dataset.faceIndex) : void 0;
          return new FaceAnnotation(view3D, Object.assign(Object.assign({}, commonOptions), {
            meshIndex,
            faceIndex
          }));
        } else {
          const positionStr = element.dataset.position;
          const position = positionStr ? positionStr.split(" ").map(val => parseFloat(val)) : [];
          return new PointAnnotation(view3D, Object.assign(Object.assign({}, commonOptions), {
            position
          }));
        }
      });
      this.add(...annotations);
    }
    /**
     * Load annotation JSON from URL
     * @param {string} url URL to annotations json
     */
    load(url) {
      const fileLoader = new THREE.FileLoader();
      return new Promise((resolve, reject) => {
        fileLoader.load(url, json => {
          const data = JSON.parse(json);
          const parsed = this.parse(data);
          this.add(...parsed);
          resolve(parsed);
        }, undefined, error => {
          reject(error);
        });
      });
    }
    /**
     * Parse an array of annotation data
     * @param {object[]} data An array of annotation data
     */
    parse(data) {
      const view3D = this._view3D;
      const {
        baseFov,
        baseDistance,
        items
      } = data;
      const annotations = items.map(annotationData => {
        const {
            meshIndex,
            faceIndex,
            position
          } = annotationData,
          commonData = __rest(annotationData, ["meshIndex", "faceIndex", "position"]);
        const element = this._createDefaultAnnotationElement(annotationData.label);
        if (meshIndex != null && faceIndex != null) {
          return new FaceAnnotation(view3D, Object.assign(Object.assign({
            meshIndex,
            faceIndex
          }, commonData), {
            baseFov,
            baseDistance,
            element
          }));
        } else {
          return new PointAnnotation(view3D, Object.assign(Object.assign({
            position: position
          }, commonData), {
            baseFov,
            baseDistance,
            element
          }));
        }
      });
      return annotations;
    }
    /**
     * Render annotations
     */
    render(camera, size) {
      const view3D = this._view3D;
      const model = view3D.model;
      if (!model) return;
      const screenSize = size !== null && size !== void 0 ? size : view3D.renderer.canvasSize;
      const halfScreenSize = screenSize.clone().multiplyScalar(0.5);
      const threeCamera = camera !== null && camera !== void 0 ? camera : view3D.camera.threeCamera;
      const camPos = threeCamera.position;
      const modelCenter = model.center;
      const breakpoints = view3D.annotationBreakpoints;
      // Sort by distance most far to camera (descending)
      const annotationsDesc = [...this._list].filter(annotation => annotation.renderable).map(annotation => {
        const position = annotation.position;
        return {
          annotation,
          position,
          distToCameraSquared: camPos.distanceToSquared(position)
        };
      }).sort((a, b) => b.distToCameraSquared - a.distToCameraSquared);
      const centerToCamDir = new THREE.Vector3().subVectors(camPos, modelCenter).normalize();
      const breakpointKeysDesc = Object.keys(breakpoints).map(val => parseFloat(val)).sort((a, b) => b - a);
      annotationsDesc.forEach(({
        annotation,
        position
      }, idx) => {
        if (!annotation.element) return;
        const screenRelPos = position.clone().project(threeCamera);
        const screenPos = new THREE.Vector2(screenRelPos.x, -screenRelPos.y);
        const centerToAnnotationDir = new THREE.Vector3().subVectors(position, modelCenter).normalize();
        const camToAnnotationDegree = toDegree(Math.abs(Math.acos(centerToAnnotationDir.dot(centerToCamDir))));
        screenPos.multiply(halfScreenSize);
        screenPos.add(halfScreenSize);
        for (const breakpoint of breakpointKeysDesc) {
          if (camToAnnotationDegree >= breakpoint) {
            annotation.setOpacity(breakpoints[breakpoint]);
            break;
          }
        }
        annotation.render({
          position,
          renderOrder: idx,
          screenPos,
          screenSize
        });
      });
    }
    /**
     * Add new annotation to the scene
     * @param {Annotation} annotations Annotations to add
     */
    add(...annotations) {
      const wrapper = this._wrapper;
      annotations.forEach(annotation => {
        annotation.enableEvents();
        if (annotation.element && annotation.element.parentElement !== wrapper) {
          wrapper.appendChild(annotation.element);
        }
      });
      this._list.push(...annotations);
    }
    /**
     * Remove annotation at the given index
     * @param {number} index Index of the annotation to remove
     */
    remove(index) {
      const removed = this._list.splice(index, 1)[0];
      if (!removed) return null;
      removed.destroy();
      return removed;
    }
    /**
     * Remove all annotations
     */
    reset() {
      const annotations = this._list;
      const removed = annotations.splice(0, annotations.length);
      removed.forEach(annotation => {
        annotation.destroy();
      });
    }
    /**
     * Save annotations as JSON
     */
    toJSON() {
      const view3D = this._view3D;
      const annotations = this._list;
      const items = annotations.map(annotation => {
        var _a, _b;
        return Object.assign(Object.assign({}, annotation.toJSON()), {
          label: ((_b = (_a = annotation.element) === null || _a === void 0 ? void 0 : _a.querySelector(`.${DEFAULT_CLASS.ANNOTATION_TOOLTIP}`)) === null || _b === void 0 ? void 0 : _b.innerHTML) || null
        });
      });
      const size = view3D.renderer.size;
      const aspect = Math.max(size.height / size.width, 1);
      return {
        baseFov: view3D.camera.baseFov,
        baseDistance: view3D.camera.baseDistance,
        aspect,
        items
      };
    }
    _createWrapper() {
      const view3D = this._view3D;
      const wrapper = document.createElement(EL_DIV);
      wrapper.classList.add(DEFAULT_CLASS.ANNOTATION_WRAPPER);
      view3D.rootEl.appendChild(wrapper);
      return wrapper;
    }
    _createDefaultAnnotationElement(label) {
      const annotation = document.createElement(EL_DIV);
      annotation.classList.add(DEFAULT_CLASS.ANNOTATION);
      annotation.classList.add(DEFAULT_CLASS.ANNOTATION_DEFAULT);
      if (label) {
        const tooltip = document.createElement(EL_DIV);
        tooltip.classList.add(DEFAULT_CLASS.ANNOTATION_TOOLTIP);
        tooltip.classList.add(DEFAULT_CLASS.ANNOTATION_DEFAULT);
        tooltip.innerHTML = label;
        annotation.appendChild(tooltip);
      }
      return annotation;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Model's rotation control that supports both mouse & touch
   */
  class RotateControl extends Component {
    /**
     * Create new RotateControl instance
     * @param {View3D} view3D An instance of View3D
     * @param {RotateControlOptions} options Options
     */
    constructor(view3D, {
      duration = ANIMATION_DURATION,
      easing = EASING$1,
      scale = 1,
      disablePitch = false,
      disableYaw = false
    } = {}) {
      super();
      this._screenScale = new THREE.Vector2(0, 0);
      this._prevPos = new THREE.Vector2(0, 0);
      this._isFirstTouch = false;
      this._scrolling = false;
      this._enabled = false;
      this._onMouseDown = evt => {
        if (evt.button !== MOUSE_BUTTON.LEFT) return;
        const targetEl = this._view3D.renderer.canvas;
        evt.preventDefault();
        if (!!targetEl.focus) {
          targetEl.focus();
        } else {
          window.focus();
        }
        this._prevPos.set(evt.clientX, evt.clientY);
        window.addEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.addEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this.trigger(CONTROL_EVENTS.HOLD, {
          inputType: INPUT_TYPE.ROTATE
        });
      };
      this._onMouseMove = evt => {
        evt.preventDefault();
        const prevPos = this._prevPos;
        const rotateDelta = new THREE.Vector2(evt.clientX, evt.clientY).sub(prevPos).multiplyScalar(this._scale);
        rotateDelta.multiply(this._screenScale);
        this._xMotion.setEndDelta(rotateDelta.x);
        this._yMotion.setEndDelta(rotateDelta.y);
        prevPos.set(evt.clientX, evt.clientY);
      };
      this._onMouseUp = () => {
        this._prevPos.set(0, 0);
        window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this.trigger(CONTROL_EVENTS.RELEASE, {
          inputType: INPUT_TYPE.ROTATE
        });
      };
      this._onTouchStart = evt => {
        const touch = evt.touches[0];
        this._isFirstTouch = true;
        this._prevPos.set(touch.clientX, touch.clientY);
        this.trigger(CONTROL_EVENTS.HOLD, {
          inputType: INPUT_TYPE.ROTATE
        });
      };
      this._onTouchMove = evt => {
        // Only the one finger motion should be considered
        if (evt.touches.length > 1 || this._scrolling) return;
        const touch = evt.touches[0];
        const scrollable = this._view3D.scrollable;
        if (this._isFirstTouch) {
          if (scrollable) {
            const delta = new THREE.Vector2(touch.clientX, touch.clientY).sub(this._prevPos);
            if (Math.abs(delta.y) > Math.abs(delta.x)) {
              // Assume Scrolling
              this._scrolling = true;
              return;
            }
          }
          this._isFirstTouch = false;
        }
        if (evt.cancelable !== false) {
          evt.preventDefault();
        }
        evt.stopPropagation();
        const prevPos = this._prevPos;
        const rotateDelta = new THREE.Vector2(touch.clientX, touch.clientY).sub(prevPos).multiplyScalar(this._scale);
        rotateDelta.multiply(this._screenScale);
        this._xMotion.setEndDelta(rotateDelta.x);
        this._yMotion.setEndDelta(rotateDelta.y);
        prevPos.set(touch.clientX, touch.clientY);
      };
      this._onTouchEnd = evt => {
        const touch = evt.touches[0];
        if (touch) {
          this._prevPos.set(touch.clientX, touch.clientY);
        } else {
          this._prevPos.set(0, 0);
          this.trigger(CONTROL_EVENTS.RELEASE, {
            inputType: INPUT_TYPE.ROTATE
          });
        }
        this._scrolling = false;
      };
      this._view3D = view3D;
      this._scale = scale;
      this._duration = duration;
      this._easing = easing;
      this._disablePitch = disablePitch;
      this._disableYaw = disableYaw;
      this._xMotion = new Motion({
        duration,
        range: INFINITE_RANGE,
        easing
      });
      this._yMotion = new Motion({
        duration,
        range: PITCH_RANGE,
        easing
      });
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     * @type {boolean}
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Whether this control is animating the camera
     * @readonly
     * @type {boolean}
     */
    get animating() {
      return this._xMotion.activated || this._yMotion.activated;
    }
    /**
     * Scale factor for rotation
     * @type {number}
     * @default 1
     */
    get scale() {
      return this._scale;
    }
    /**
     * Duration of the input animation (ms)
     * @type {number}
     * @default 300
     */
    get duration() {
      return this._duration;
    }
    /**
     * Easing function of the animation
     * @type {function}
     * @default EASING.EASE_OUT_CUBIC
     * @see EASING
     */
    get easing() {
      return this._easing;
    }
    /**
     * Disable X-axis(pitch) rotation
     * @type {boolean}
     * @default false
     */
    get disablePitch() {
      return this._disablePitch;
    }
    /**
     * Disable Y-axis(yaw) rotation
     * @type {boolean}
     * @default false
     */
    get disableYaw() {
      return this._disableYaw;
    }
    set scale(val) {
      this._scale = val;
    }
    set duration(val) {
      this._duration = val;
      this._xMotion.duration = val;
      this._yMotion.duration = val;
    }
    set easing(val) {
      this._easing = val;
      this._xMotion.easing = val;
      this._yMotion.easing = val;
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * @returns {void}
     */
    destroy() {
      this.disable();
      this.reset();
      this.off();
    }
    /**
     * Reset internal values
     * @returns {void}
     */
    reset() {
      this._isFirstTouch = false;
      this._scrolling = false;
    }
    /**
     * Update control by given deltaTime
     * @param {number} deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      const camera = this._view3D.camera;
      const xMotion = this._xMotion;
      const yMotion = this._yMotion;
      const newPose = camera.newPose;
      const yawEnabled = !this._disableYaw;
      const pitchEnabled = !this._disablePitch;
      const delta = new THREE.Vector2(xMotion.update(deltaTime), yMotion.update(deltaTime));
      if (yawEnabled) {
        newPose.yaw += delta.x;
      }
      if (pitchEnabled) {
        newPose.pitch += delta.y;
      }
    }
    /**
     * Resize control to match target size
     * @param {object} size New size to apply
     * @param {number} [size.width] New width
     * @param {number} [size.height] New height
     */
    resize(size) {
      this._screenScale.set(360 / size.width, 180 / size.height);
    }
    /**
     * Enable this input and add event listeners
     * @returns {void}
     */
    enable() {
      if (this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.addEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown);
      targetEl.addEventListener(EVENTS.TOUCH_START, this._onTouchStart, {
        passive: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, {
        passive: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_END, this._onTouchEnd);
      this._enabled = true;
      this.sync();
      this.trigger(CONTROL_EVENTS.ENABLE, {
        inputType: INPUT_TYPE.ROTATE
      });
    }
    /**
     * Disable this input and remove all event handlers
     * @returns {void}
     */
    disable() {
      if (!this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.removeEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown);
      window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
      window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
      targetEl.removeEventListener(EVENTS.TOUCH_START, this._onTouchStart);
      targetEl.removeEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove);
      targetEl.removeEventListener(EVENTS.TOUCH_END, this._onTouchEnd);
      this._enabled = false;
      this.trigger(CONTROL_EVENTS.DISABLE, {
        inputType: INPUT_TYPE.ROTATE
      });
    }
    /**
     * Synchronize this control's state to given camera position
     * @returns {void}
     */
    sync() {
      const camera = this._view3D.camera;
      this._xMotion.reset(camera.yaw);
      this._yMotion.reset(camera.pitch);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Model's translation control that supports both mouse & touch
   */
  class TranslateControl extends Component {
    /**
     * Create new TranslateControl instance
     * @param {View3D} view3D An instance of View3D
     * @param {TranslateControlOptions} options Options
     */
    constructor(view3D, {
      easing = EASING$1,
      duration = 0,
      scale = 1
    } = {}) {
      super();
      this._enabled = false;
      // Sometimes, touchstart for second finger doesn't triggered.
      // This flag checks whether that happened
      this._touchInitialized = false;
      this._prevPos = new THREE.Vector2(0, 0);
      this._screenSize = new THREE.Vector2(0, 0);
      this._onMouseDown = evt => {
        if (evt.button !== MOUSE_BUTTON.RIGHT) return;
        const targetEl = this._view3D.renderer.canvas;
        evt.preventDefault();
        if (!!targetEl.focus) {
          targetEl.focus();
        } else {
          window.focus();
        }
        this._prevPos.set(evt.clientX, evt.clientY);
        window.addEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.addEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        window.addEventListener(EVENTS.CONTEXT_MENU, this._onContextMenu, false);
        this.trigger(CONTROL_EVENTS.HOLD, {
          inputType: INPUT_TYPE.TRANSLATE
        });
      };
      this._onMouseMove = evt => {
        evt.preventDefault();
        const prevPos = this._prevPos;
        const delta = new THREE.Vector2(evt.clientX, evt.clientY).sub(prevPos).multiplyScalar(this._scale);
        // X value is negated to match cursor direction
        this._xMotion.setEndDelta(-delta.x);
        this._yMotion.setEndDelta(delta.y);
        prevPos.set(evt.clientX, evt.clientY);
      };
      this._onMouseUp = () => {
        this._prevPos.set(0, 0);
        window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this.trigger(CONTROL_EVENTS.RELEASE, {
          inputType: INPUT_TYPE.TRANSLATE
        });
      };
      this._onTouchStart = evt => {
        // Only the two finger motion should be considered
        if (evt.touches.length !== 2) return;
        if (evt.cancelable !== false) {
          evt.preventDefault();
        }
        this._prevPos.copy(this._getTouchesMiddle(evt.touches));
        this._touchInitialized = true;
        this.trigger(CONTROL_EVENTS.HOLD, {
          inputType: INPUT_TYPE.TRANSLATE
        });
      };
      this._onTouchMove = evt => {
        // Only the two finger motion should be considered
        if (evt.touches.length !== 2) return;
        if (evt.cancelable !== false) {
          evt.preventDefault();
        }
        evt.stopPropagation();
        const prevPos = this._prevPos;
        const middlePoint = this._getTouchesMiddle(evt.touches);
        if (!this._touchInitialized) {
          prevPos.copy(middlePoint);
          this._touchInitialized = true;
          return;
        }
        const delta = new THREE.Vector2().subVectors(middlePoint, prevPos).multiplyScalar(this._scale);
        // X value is negated to match cursor direction
        this._xMotion.setEndDelta(-delta.x);
        this._yMotion.setEndDelta(delta.y);
        prevPos.copy(middlePoint);
      };
      this._onTouchEnd = evt => {
        // Only the two finger motion should be considered
        if (evt.touches.length !== 2) {
          if (this._touchInitialized) {
            this._touchInitialized = false;
            this.trigger(CONTROL_EVENTS.RELEASE, {
              inputType: INPUT_TYPE.TRANSLATE
            });
          }
          return;
        }
        // Three fingers to two fingers
        this._prevPos.copy(this._getTouchesMiddle(evt.touches));
        this._touchInitialized = true;
      };
      this._onContextMenu = evt => {
        evt.preventDefault();
        window.removeEventListener(EVENTS.CONTEXT_MENU, this._onContextMenu, false);
      };
      this._view3D = view3D;
      this._xMotion = new Motion({
        duration,
        range: INFINITE_RANGE,
        easing
      });
      this._yMotion = new Motion({
        duration,
        range: INFINITE_RANGE,
        easing
      });
      this._scale = scale;
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     * @type {boolean}
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Whether this control is animating the camera
     * @readonly
     * @type {boolean}
     */
    get animating() {
      return this._xMotion.activated || this._yMotion.activated;
    }
    /**
     * Scale factor for translation
     * @type number
     * @default 1
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    get scale() {
      return this._scale;
    }
    /**
     * Duration of the input animation (ms)
     * @type {number}
     * @default 300
     */
    get duration() {
      return this._duration;
    }
    /**
     * Easing function of the animation
     * @type {function}
     * @default EASING.EASE_OUT_CUBIC
     * @see EASING
     */
    get easing() {
      return this._easing;
    }
    set scale(val) {
      this._scale = val;
    }
    set duration(val) {
      this._duration = val;
      this._xMotion.duration = val;
      this._yMotion.duration = val;
    }
    set easing(val) {
      this._easing = val;
      this._xMotion.easing = val;
      this._yMotion.easing = val;
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * @returns {void}
     */
    destroy() {
      this.disable();
      this.reset();
      this.off();
    }
    /**
     * Reset internal values
     * @returns {void}
     */
    reset() {
      this._touchInitialized = false;
    }
    /**
     * Update control by given deltaTime
     * @param {number} deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      const camera = this._view3D.camera;
      const newPose = camera.newPose;
      const screenSize = this._screenSize;
      const delta = new THREE.Vector2(this._xMotion.update(deltaTime), this._yMotion.update(deltaTime));
      const viewXDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.threeCamera.quaternion);
      const viewYDir = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.threeCamera.quaternion);
      const screenScale = new THREE.Vector2(camera.renderWidth, camera.renderHeight).divide(screenSize);
      delta.multiply(screenScale);
      const newPivot = newPose.pivot.clone();
      newPose.pivot = newPivot.add(viewXDir.multiplyScalar(delta.x)).add(viewYDir.multiplyScalar(delta.y));
    }
    /**
     * Resize control to match target size
     * @param {object} size New size to apply
     * @param {number} [size.width] New width
     * @param {number} [size.height] New height
     */
    resize(size) {
      const screenSize = this._screenSize;
      screenSize.copy(new THREE.Vector2(size.width, size.height));
    }
    /**
     * Enable this input and add event listeners
     * @returns {void}
     */
    enable() {
      if (this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.addEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown, false);
      targetEl.addEventListener(EVENTS.TOUCH_START, this._onTouchStart, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_END, this._onTouchEnd, {
        passive: false,
        capture: false
      });
      this._enabled = true;
      this.sync();
      this.trigger(CONTROL_EVENTS.ENABLE, {
        inputType: INPUT_TYPE.TRANSLATE
      });
    }
    /**
     * Disable this input and remove all event handlers
     * @returns {void}
     */
    disable() {
      if (!this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.removeEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown, false);
      window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
      window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
      targetEl.removeEventListener(EVENTS.TOUCH_START, this._onTouchStart, false);
      targetEl.removeEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, false);
      targetEl.removeEventListener(EVENTS.TOUCH_END, this._onTouchEnd, false);
      window.removeEventListener(EVENTS.CONTEXT_MENU, this._onContextMenu, false);
      this._enabled = false;
      this.trigger(CONTROL_EVENTS.DISABLE, {
        inputType: INPUT_TYPE.TRANSLATE
      });
    }
    /**
     * Synchronize this control's state to the camera position
     * @returns {void}
     */
    sync() {
      this._xMotion.reset(0);
      this._yMotion.reset(0);
    }
    _getTouchesMiddle(touches) {
      return new THREE.Vector2(touches[0].clientX + touches[1].clientX, touches[0].clientY + touches[1].clientY).multiplyScalar(0.5);
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Distance controller handling both mouse wheel and pinch zoom(fov)
   */
  class ZoomControl extends Component {
    /**
     * Create new ZoomControl instance
     * @param {View3D} view3D An instance of View3D
     * @param {ZoomControlOptions} [options={}] Options
     */
    constructor(view3D, {
      type = ZOOM_TYPE.FOV,
      scale = 1,
      duration = ANIMATION_DURATION,
      minFov = 1,
      maxFov = AUTO,
      minDistance = 0.1,
      maxDistance = 2,
      doubleTap = true,
      easing = EASING$1
    } = {}) {
      super();
      this._scaleModifier = 1;
      this._wheelModifier = 0.02;
      this._touchModifier = 0.05;
      this._prevTouchDistance = -1;
      this._enabled = false;
      this._isFirstTouch = true;
      this._isWheelScrolling = false;
      this._onWheel = evt => {
        const wheelScrollable = this._view3D.wheelScrollable;
        if (evt.deltaY === 0 || wheelScrollable) return;
        evt.preventDefault();
        evt.stopPropagation();
        const motion = this._motion;
        const delta = -this._scale * this._scaleModifier * this._wheelModifier * evt.deltaY;
        if (!this._isWheelScrolling) {
          this.trigger(CONTROL_EVENTS.HOLD, {
            inputType: INPUT_TYPE.ZOOM
          });
        }
        this._isWheelScrolling = true;
        motion.setEndDelta(delta);
      };
      this._onTouchMove = evt => {
        const touches = evt.touches;
        if (touches.length !== 2) return;
        if (evt.cancelable !== false) {
          evt.preventDefault();
        }
        evt.stopPropagation();
        const motion = this._motion;
        const prevTouchDistance = this._prevTouchDistance;
        const touchPoint1 = new THREE.Vector2(touches[0].pageX, touches[0].pageY);
        const touchPoint2 = new THREE.Vector2(touches[1].pageX, touches[1].pageY);
        const touchDiff = touchPoint1.sub(touchPoint2);
        const touchDistance = touchDiff.length() * this._scale * this._scaleModifier * this._touchModifier;
        const delta = this._isFirstTouch ? 0 : touchDistance - prevTouchDistance;
        this._prevTouchDistance = touchDistance;
        if (this._isFirstTouch) {
          this.trigger(CONTROL_EVENTS.HOLD, {
            inputType: INPUT_TYPE.ZOOM
          });
        }
        this._isFirstTouch = false;
        motion.setEndDelta(delta);
      };
      this._onTouchEnd = evt => {
        if (evt.touches.length !== 0) return;
        this.trigger(CONTROL_EVENTS.RELEASE, {
          inputType: INPUT_TYPE.ZOOM
        });
        this._prevTouchDistance = -1;
        this._isFirstTouch = true;
      };
      this._onDoubleClick = evt => {
        const view3D = this._view3D;
        if (!this._doubleTap || !view3D.model) return;
        const {
          zoomIn = 0.8,
          duration = ANIMATION_DURATION,
          easing = EASING$1,
          useZoomOut = true
        } = getObjectOption(this._doubleTap);
        const zoomRange = this._motion.range;
        const maxZoom = -zoomRange.min * zoomIn;
        if (view3D.camera.zoom >= maxZoom && useZoomOut) {
          const resetPose = view3D.camera.currentPose.clone();
          resetPose.zoom = 0;
          void view3D.camera.reset(duration, easing, resetPose);
          return;
        }
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const canvasSize = view3D.renderer.canvasSize;
        pointer.x = evt.offsetX / canvasSize.x * 2 - 1;
        pointer.y = -(evt.offsetY / canvasSize.y) * 2 + 1;
        raycaster.setFromCamera(pointer, view3D.camera.threeCamera);
        const intersects = raycaster.intersectObject(view3D.model.scene);
        if (!intersects.length) return;
        // Nearest
        const intersect = intersects[0];
        const newPivot = intersect.point;
        const {
          yaw,
          pitch
        } = view3D.camera;
        const resetPose = new Pose(yaw, pitch, maxZoom, newPivot.toArray());
        void view3D.camera.reset(duration, easing, resetPose);
      };
      this._view3D = view3D;
      this._type = type;
      this._scale = scale;
      this._duration = duration;
      this._minFov = minFov;
      this._maxFov = maxFov;
      this._minDistance = minDistance;
      this._maxDistance = maxDistance;
      this._doubleTap = doubleTap;
      this._easing = easing;
      this._motion = new Motion({
        duration,
        easing,
        range: {
          min: -Infinity,
          max: Infinity
        }
      });
    }
    /**
     * Whether this control is enabled or not
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Whether this control is animating the camera
     * @readonly
     * @type {boolean}
     */
    get animating() {
      return this._motion.activated;
    }
    /**
     * Currenet fov/distance range
     * @readonly
     * @type {Range}
     */
    get range() {
      return this._motion.range;
    }
    /**
     * Current control type
     * @readonly
     * @see {ZOOM_TYPE}
     * @default "fov"
     */
    get type() {
      return this._type;
    }
    /**
     * Scale factor of the zoom
     * @type number
     * @default 1
     */
    get scale() {
      return this._scale;
    }
    /**
     * Duration of the input animation (ms)
     * @type {number}
     * @default 300
     */
    get duration() {
      return this._duration;
    }
    /**
     * Minimum vertical fov(field of view).
     * Only available when type is "fov".
     * You can get a bigger image with the smaller value of this.
     * @type {number}
     * @default 1
     */
    get minFov() {
      return this._minFov;
    }
    /**
     * Maximum vertical fov(field of view).
     * Only available when type is "fov".
     * You can get a smaller image with the bigger value of this.
     * If `"auto"` is given, it will use Math.min(default fov + 45, 175).
     * @type {"auto" | number}
     * @default "auto"
     */
    get maxFov() {
      return this._maxFov;
    }
    /**
     * Minimum camera distance. This will be scaled to camera's default distance({@link camera.baseDistance Camera#baseDistance})
     * Only available when type is "distance".
     * @type {number}
     * @default 0.1
     */
    get minDistance() {
      return this._minDistance;
    }
    /**
     * Maximum camera distance. This will be scaled to camera's default distance({@link camera.baseDistance Camera#baseDistance})
     * Only available when type is "distance".
     * @type {number}
     * @default 2
     */
    get maxDistance() {
      return this._maxDistance;
    }
    get doubleTap() {
      return this._doubleTap;
    }
    /**
     * Easing function of the animation
     * @type {function}
     * @default EASING.EASE_OUT_CUBIC
     * @see EASING
     */
    get easing() {
      return this._easing;
    }
    set type(val) {
      this._type = val;
    }
    set scale(val) {
      this._scale = val;
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * @returns {void}
     */
    destroy() {
      this.disable();
      this.reset();
      this.off();
    }
    /**
     * Reset internal values
     * @returns {void}
     */
    reset() {
      this._prevTouchDistance = -1;
      this._isFirstTouch = true;
      this._isWheelScrolling = false;
    }
    /**
     * Update control by given deltaTime
     * @param deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      const camera = this._view3D.camera;
      const newPose = camera.newPose;
      const motion = this._motion;
      const prevProgress = motion.progress;
      const delta = motion.update(deltaTime);
      const newProgress = motion.progress;
      newPose.zoom -= delta;
      if (this._isWheelScrolling && prevProgress < 1 && newProgress >= 1) {
        this.trigger(CONTROL_EVENTS.RELEASE, {
          inputType: INPUT_TYPE.ZOOM
        });
        this._isWheelScrolling = false;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resize(size) {
      // DO NOTHING
    }
    /**
     * Enable this input and add event listeners
     * @returns {void}
     */
    enable() {
      if (this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.addEventListener(EVENTS.WHEEL, this._onWheel, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_END, this._onTouchEnd, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.DOUBLE_CLICK, this._onDoubleClick);
      this._enabled = true;
      this.sync();
      this.trigger(CONTROL_EVENTS.ENABLE, {
        inputType: INPUT_TYPE.ZOOM
      });
    }
    /**
     * Disable this input and remove all event handlers
     * @returns {void}
     */
    disable() {
      if (!this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.removeEventListener(EVENTS.WHEEL, this._onWheel, false);
      targetEl.removeEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, false);
      targetEl.removeEventListener(EVENTS.TOUCH_END, this._onTouchEnd, false);
      targetEl.removeEventListener(EVENTS.DOUBLE_CLICK, this._onDoubleClick);
      this._enabled = false;
      this.trigger(CONTROL_EVENTS.DISABLE, {
        inputType: INPUT_TYPE.ZOOM
      });
    }
    /**
     * Synchronize this control's state to given camera position
     * @returns {void}
     */
    sync() {
      const camera = this._view3D.camera;
      const motion = this._motion;
      motion.reset(-camera.zoom);
      if (this._type === ZOOM_TYPE.FOV) {
        this._scaleModifier = -1;
      } else {
        this._scaleModifier = -camera.baseDistance / 44;
      }
    }
    /**
     * Update fov range by the camera's current fov value
     * @returns {void}
     */
    updateRange() {
      const range = this._motion.range;
      const {
        camera
      } = this._view3D;
      if (this._type === ZOOM_TYPE.FOV) {
        const baseFov = camera.baseFov;
        const maxFov = this._maxFov;
        range.max = maxFov === AUTO ? Math.min(baseFov + 45, 175) - baseFov : maxFov - baseFov;
        range.min = this._minFov - baseFov;
      } else {
        range.max = camera.baseDistance * this._maxDistance - camera.baseDistance;
        range.min = camera.baseDistance * this._minDistance - camera.baseDistance;
      }
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Aggregation of {@link RotateControl}, {@link TranslateControl}, and {@link ZoomControl}.
   */
  class OrbitControl {
    /**
     * Create new OrbitControl instance
     * @param {View3D} view3D An instance of View3D
     */
    constructor(view3D) {
      this._onEnable = ({
        inputType
      }) => {
        if (inputType === INPUT_TYPE.ZOOM) return;
        const view3D = this._view3D;
        const canvas = view3D.renderer.canvas;
        const shouldSetGrabCursor = view3D.useGrabCursor && (this._rotateControl.enabled || this._translateControl.enabled) && canvas.style.cursor === CURSOR.NONE;
        if (shouldSetGrabCursor) {
          this._setCursor(CURSOR.GRAB);
        }
      };
      this._onDisable = ({
        inputType
      }) => {
        if (inputType === INPUT_TYPE.ZOOM) return;
        const canvas = this._view3D.renderer.canvas;
        const shouldRemoveGrabCursor = canvas.style.cursor !== CURSOR.NONE && !this._rotateControl.enabled && !this._translateControl.enabled;
        if (shouldRemoveGrabCursor) {
          this._setCursor(CURSOR.NONE);
        }
      };
      this._onHold = ({
        inputType
      }) => {
        const view3D = this._view3D;
        if (inputType !== INPUT_TYPE.ZOOM) {
          const grabCursorEnabled = view3D.useGrabCursor && (this._rotateControl.enabled || this._translateControl.enabled);
          if (grabCursorEnabled) {
            this._setCursor(CURSOR.GRABBING);
          }
        }
        view3D.trigger(EVENTS$1.INPUT_START, {
          type: EVENTS$1.INPUT_START,
          target: view3D,
          inputType
        });
      };
      this._onRelease = ({
        inputType
      }) => {
        const view3D = this._view3D;
        if (inputType !== INPUT_TYPE.ZOOM) {
          const grabCursorEnabled = view3D.useGrabCursor && (this._rotateControl.enabled || this._translateControl.enabled);
          if (grabCursorEnabled) {
            this._setCursor(CURSOR.GRAB);
          }
        }
        view3D.trigger(EVENTS$1.INPUT_END, {
          type: EVENTS$1.INPUT_END,
          target: view3D,
          inputType
        });
      };
      this._view3D = view3D;
      this._rotateControl = new RotateControl(view3D, getObjectOption(view3D.rotate));
      this._translateControl = new TranslateControl(view3D, getObjectOption(view3D.translate));
      this._zoomControl = new ZoomControl(view3D, getObjectOption(view3D.zoom));
      this._extraControls = [];
      [this._rotateControl, this._translateControl, this._zoomControl].forEach(control => {
        control.on({
          [CONTROL_EVENTS.HOLD]: this._onHold,
          [CONTROL_EVENTS.RELEASE]: this._onRelease,
          [CONTROL_EVENTS.ENABLE]: this._onEnable,
          [CONTROL_EVENTS.DISABLE]: this._onDisable
        });
      });
    }
    // Internal Values Getter
    /**
     * Rotate(left-click) part of this control
     * @type {RotateControl}
     * @readonly
     */
    get rotate() {
      return this._rotateControl;
    }
    /**
     * Translation(right-click) part of this control
     * @type {TranslateControl}
     * @readonly
     */
    get translate() {
      return this._translateControl;
    }
    /**
     * Zoom(mouse wheel) part of this control
     * @type {ZoomControl}
     * @readonly
     */
    get zoom() {
      return this._zoomControl;
    }
    /**
     * Base controls
     * @type {CameraControl[]}
     * @readonly
     */
    get controls() {
      return [this._rotateControl, this._translateControl, this._zoomControl];
    }
    /**
     * Extra camera controls added, like {@link AnimationControl}
     * @type {CameraControl[]}
     * @readonly
     */
    get extraControls() {
      return this._extraControls;
    }
    /**
     * Whether one of the controls is animating at the moment
     * @type {boolean}
     * @readonly
     */
    get animating() {
      return this._rotateControl.animating || this._translateControl.animating || this._zoomControl.animating || this._extraControls.some(control => control.animating);
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * This also will reset CSS cursor to intial
     * @returns {void}
     */
    destroy() {
      this._rotateControl.destroy();
      this._translateControl.destroy();
      this._zoomControl.destroy();
      this._extraControls.forEach(control => control.destroy());
      this._extraControls = [];
    }
    /**
     * Update control by given deltaTime
     * @param {number} deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      this._rotateControl.update(deltaTime);
      this._translateControl.update(deltaTime);
      this._zoomControl.update(deltaTime);
      this._extraControls.forEach(control => control.update(deltaTime));
    }
    /**
     * Resize control to match target size
     * @param {object} size New size to apply
     * @param {number} [size.width] New width
     * @param {number} [size.height] New height
     * @returns {void}
     */
    resize(size) {
      this._rotateControl.resize(size);
      this._translateControl.resize(size);
      this._zoomControl.resize(size);
      this._extraControls.forEach(control => control.resize(size));
    }
    /**
     * Enable this control and add event listeners
     * @returns {void}
     */
    enable() {
      const view3D = this._view3D;
      if (view3D.rotate) {
        this._rotateControl.enable();
      }
      if (view3D.translate) {
        this._translateControl.enable();
      }
      if (view3D.zoom) {
        this._zoomControl.enable();
      }
      this._extraControls.forEach(control => control.enable());
    }
    /**
     * Disable this control and remove all event handlers
     * @returns {void}
     */
    disable() {
      this._rotateControl.disable();
      this._translateControl.disable();
      this._zoomControl.disable();
      this._extraControls.forEach(control => control.disable());
    }
    /**
     * Synchronize this control's state to current camera position
     * @returns {void}
     */
    sync() {
      this._rotateControl.sync();
      this._translateControl.sync();
      this._zoomControl.sync();
      this._extraControls.forEach(control => control.sync());
    }
    /**
     * Add extra control
     * @param {CameraControl} control Control to add
     * @returns {void}
     */
    add(control) {
      this._extraControls.push(control);
    }
    /**
     * Remove extra control
     * @param {CameraControl} control Control to add
     * @returns {void}
     */
    remove(control) {
      const extraControls = this._extraControls;
      const controlIdx = extraControls.findIndex(ctrl => ctrl === control);
      if (controlIdx >= 0) {
        extraControls.splice(controlIdx, 1);
      }
    }
    /**
     * Update cursor to current option
     * @returns {void}
     */
    updateCursor() {
      const cursor = this._view3D.useGrabCursor ? CURSOR.GRAB : CURSOR.NONE;
      this._setCursor(cursor);
    }
    _setCursor(newCursor) {
      const view3D = this._view3D;
      if (!view3D.useGrabCursor && newCursor !== CURSOR.NONE) return;
      const targetEl = view3D.renderer.canvas;
      targetEl.style.cursor = newCursor;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Autoplayer that animates model without user input
   */
  class AutoPlayer {
    /**
     * Create new AutoPlayer instance
     * @param {View3D} view3D An instance of View3D
     * @param {object} options Options
     * @param {number} [options.delay=2000] Reactivation delay after mouse input in milisecond
     * @param {number} [options.delayOnMouseLeave=0] Reactivation delay after mouse leave
     * @param {number} [options.speed=1] Y-axis(yaw) rotation speed
     * @param {boolean} [options.pauseOnHover=false] Whether to pause rotation on mouse hover
     * @param {boolean} [options.canInterrupt=true] Whether user can interrupt the rotation with click/wheel input
     * @param {boolean} [options.disableOnInterrupt=false] Whether to disable autoplay on user interrupt
     */
    constructor(view3D, {
      delay = 2000,
      delayOnMouseLeave = 0,
      speed = 1,
      pauseOnHover = false,
      canInterrupt = true,
      disableOnInterrupt = false
    } = {}) {
      this._enabled = false;
      this._interrupted = false;
      this._interruptionTimer = -1;
      this._hovering = false;
      this._onMouseDown = evt => {
        if (!this._canInterrupt) return;
        if (evt.button !== MOUSE_BUTTON.LEFT && evt.button !== MOUSE_BUTTON.RIGHT) return;
        this._interrupted = true;
        this._clearTimeout();
        window.addEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
      };
      this._onMouseUp = () => {
        window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this._setUninterruptedAfterDelay(this._delay);
      };
      this._onTouchStart = () => {
        if (!this._canInterrupt) return;
        this._interrupted = true;
        this._clearTimeout();
      };
      this._onTouchEnd = () => {
        this._setUninterruptedAfterDelay(this._delay);
      };
      this._onMouseEnter = () => {
        if (!this._pauseOnHover) return;
        this._interrupted = true;
        this._hovering = true;
      };
      this._onMouseLeave = () => {
        if (!this._pauseOnHover) return;
        this._hovering = false;
        this._setUninterruptedAfterDelay(this._delayOnMouseLeave);
      };
      this._onWheel = () => {
        if (!this._canInterrupt) return;
        this._interrupted = true;
        this._setUninterruptedAfterDelay(this._delay);
      };
      this._view3D = view3D;
      this._delay = delay;
      this._delayOnMouseLeave = delayOnMouseLeave;
      this._speed = speed;
      this._pauseOnHover = pauseOnHover;
      this._canInterrupt = canInterrupt;
      this._disableOnInterrupt = disableOnInterrupt;
    }
    /**
     * Whether autoplay is enabled or not
     * @readonly
     */
    get enabled() {
      return this._enabled;
    }
    /**
     * Whether autoplay is updating the camera at the moment
     * @readonly
     */
    get animating() {
      return this._enabled && !this._interrupted;
    }
    /**
     * Reactivation delay after mouse input in milisecond
     */
    get delay() {
      return this._delay;
    }
    /**
     * Reactivation delay after mouse leave
     * This option only works when {@link AutoPlayer#pauseOnHover pauseOnHover} is activated
     */
    get delayOnMouseLeave() {
      return this._delayOnMouseLeave;
    }
    /**
     * Y-axis(yaw) rotation speed
     * @default 1
     */
    get speed() {
      return this._speed;
    }
    /**
     * Whether to pause rotation on mouse hover
     * @default false
     */
    get pauseOnHover() {
      return this._pauseOnHover;
    }
    /**
     * Whether user can interrupt the rotation with click/wheel input
     * @default true
     */
    get canInterrupt() {
      return this._canInterrupt;
    }
    /**
     * Whether to disable autoplay on user interrupt
     * @default false
     */
    get disableOnInterrupt() {
      return this._disableOnInterrupt;
    }
    set delay(val) {
      this._delay = val;
    }
    set delayOnMouseLeave(val) {
      this._delayOnMouseLeave = val;
    }
    set speed(val) {
      this._speed = val;
    }
    set pauseOnHover(val) {
      this._pauseOnHover = val;
    }
    set canInterrupt(val) {
      this._canInterrupt = val;
    }
    set disableOnInterrupt(val) {
      this._disableOnInterrupt = val;
    }
    /**
     * Destroy the instance and remove all event listeners attached
     * This also will reset CSS cursor to intial
     * @returns {void}
     */
    destroy() {
      this.disable();
    }
    /**
     * Update camera by given deltaTime
     * @param camera Camera to update position
     * @param deltaTime Number of milisec to update
     * @returns {void}
     */
    update(deltaTime) {
      if (!this._enabled) return;
      if (this._interrupted) {
        if (this._disableOnInterrupt) {
          this.disable();
        }
        return;
      }
      const newPose = this._view3D.camera.newPose;
      newPose.yaw += this._speed * deltaTime / 100;
    }
    /**
     * Enable autoplay and add event listeners
     * @returns {void}
     */
    enable() {
      if (this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.addEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown, false);
      targetEl.addEventListener(EVENTS.TOUCH_START, this._onTouchStart, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.TOUCH_END, this._onTouchEnd, {
        passive: false,
        capture: false
      });
      targetEl.addEventListener(EVENTS.MOUSE_ENTER, this._onMouseEnter, false);
      targetEl.addEventListener(EVENTS.MOUSE_LEAVE, this._onMouseLeave, false);
      targetEl.addEventListener(EVENTS.WHEEL, this._onWheel, {
        passive: false,
        capture: false
      });
      this._enabled = true;
    }
    /**
     * Enable autoplay after current delay value
     * @returns {void}
     */
    enableAfterDelay() {
      this.enable();
      this._interrupted = true;
      this._setUninterruptedAfterDelay(this._delay);
    }
    /**
     * Disable this input and remove all event handlers
     * @returns {void}
     */
    disable() {
      if (!this._enabled) return;
      const targetEl = this._view3D.renderer.canvas;
      targetEl.removeEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown, false);
      window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
      targetEl.removeEventListener(EVENTS.TOUCH_START, this._onTouchStart, false);
      targetEl.removeEventListener(EVENTS.TOUCH_END, this._onTouchEnd, false);
      targetEl.removeEventListener(EVENTS.MOUSE_ENTER, this._onMouseEnter, false);
      targetEl.removeEventListener(EVENTS.MOUSE_LEAVE, this._onMouseLeave, false);
      targetEl.removeEventListener(EVENTS.WHEEL, this._onWheel, false);
      this._enabled = false;
      this._interrupted = false;
      this._hovering = false;
      this._clearTimeout();
    }
    _setUninterruptedAfterDelay(delay) {
      if (this._hovering) return;
      this._clearTimeout();
      if (delay > 0) {
        this._interruptionTimer = window.setTimeout(() => {
          this._interrupted = false;
          this._interruptionTimer = -1;
        }, delay);
      } else {
        this._interrupted = false;
        this._interruptionTimer = -1;
      }
    }
    _clearTimeout() {
      if (this._interruptionTimer >= 0) {
        window.clearTimeout(this._interruptionTimer);
        this._interruptionTimer = -1;
      }
    }
  }

  class GLTFLoader extends THREE.Loader {
    constructor(manager) {
      super(manager);
      this.dracoLoader = null;
      this.ktx2Loader = null;
      this.meshoptDecoder = null;
      this.pluginCallbacks = [];
      this.register(function (parser) {
        return new GLTFMaterialsClearcoatExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFTextureBasisUExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFTextureWebPExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMaterialsSheenExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMaterialsTransmissionExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMaterialsVolumeExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMaterialsIorExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMaterialsSpecularExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFLightsExtension(parser);
      });
      this.register(function (parser) {
        return new GLTFMeshoptCompression(parser);
      });
    }
    load(url, onLoad, onProgress, onError) {
      var scope = this;
      var resourcePath;
      if (this.resourcePath !== '') {
        resourcePath = this.resourcePath;
      } else if (this.path !== '') {
        resourcePath = this.path;
      } else {
        resourcePath = THREE.LoaderUtils.extractUrlBase(url);
      }

      // Tells the LoadingManager to track an extra item, which resolves after
      // the model is fully loaded. This means the count of items loaded will
      // be incorrect, but ensures manager.onLoad() does not fire early.
      this.manager.itemStart(url);
      var _onError = function (e) {
        if (onError) {
          onError(e);
        } else {
          console.error(e);
        }
        scope.manager.itemError(url);
        scope.manager.itemEnd(url);
      };
      var loader = new THREE.FileLoader(this.manager);
      loader.setPath(this.path);
      loader.setResponseType('arraybuffer');
      loader.setRequestHeader(this.requestHeader);
      loader.setWithCredentials(this.withCredentials);
      loader.load(url, function (data) {
        try {
          scope.parse(data, resourcePath, function (gltf) {
            onLoad(gltf);
            scope.manager.itemEnd(url);
          }, _onError);
        } catch (e) {
          _onError(e);
        }
      }, onProgress, _onError);
    }
    setDRACOLoader(dracoLoader) {
      this.dracoLoader = dracoLoader;
      return this;
    }
    setDDSLoader() {
      throw new Error('THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".');
    }
    setKTX2Loader(ktx2Loader) {
      this.ktx2Loader = ktx2Loader;
      return this;
    }
    setMeshoptDecoder(meshoptDecoder) {
      this.meshoptDecoder = meshoptDecoder;
      return this;
    }
    register(callback) {
      if (this.pluginCallbacks.indexOf(callback) === -1) {
        this.pluginCallbacks.push(callback);
      }
      return this;
    }
    unregister(callback) {
      if (this.pluginCallbacks.indexOf(callback) !== -1) {
        this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
      }
      return this;
    }
    parse(data, path, onLoad, onError) {
      var content;
      var extensions = {};
      var plugins = {};
      if (typeof data === 'string') {
        content = data;
      } else {
        var magic = THREE.LoaderUtils.decodeText(new Uint8Array(data, 0, 4));
        if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
          try {
            extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data);
          } catch (error) {
            if (onError) onError(error);
            return;
          }
          content = extensions[EXTENSIONS.KHR_BINARY_GLTF].content;
        } else {
          content = THREE.LoaderUtils.decodeText(new Uint8Array(data));
        }
      }
      var json = JSON.parse(content);
      if (json.asset === undefined || json.asset.version[0] < 2) {
        if (onError) onError(new Error('THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.'));
        return;
      }
      var parser = new GLTFParser(json, {
        path: path || this.resourcePath || '',
        crossOrigin: this.crossOrigin,
        requestHeader: this.requestHeader,
        manager: this.manager,
        ktx2Loader: this.ktx2Loader,
        meshoptDecoder: this.meshoptDecoder
      });
      parser.fileLoader.setRequestHeader(this.requestHeader);
      for (var i = 0; i < this.pluginCallbacks.length; i++) {
        var plugin = this.pluginCallbacks[i](parser);
        plugins[plugin.name] = plugin;

        // Workaround to avoid determining as unknown extension
        // in addUnknownExtensionsToUserData().
        // Remove this workaround if we move all the existing
        // extension handlers to plugin system
        extensions[plugin.name] = true;
      }
      if (json.extensionsUsed) {
        for (var _i = 0; _i < json.extensionsUsed.length; ++_i) {
          var extensionName = json.extensionsUsed[_i];
          var extensionsRequired = json.extensionsRequired || [];
          switch (extensionName) {
            case EXTENSIONS.KHR_MATERIALS_UNLIT:
              extensions[extensionName] = new GLTFMaterialsUnlitExtension();
              break;
            case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
              extensions[extensionName] = new GLTFMaterialsPbrSpecularGlossinessExtension();
              break;
            case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
              extensions[extensionName] = new GLTFDracoMeshCompressionExtension(json, this.dracoLoader);
              break;
            case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
              extensions[extensionName] = new GLTFTextureTransformExtension();
              break;
            case EXTENSIONS.KHR_MESH_QUANTIZATION:
              extensions[extensionName] = new GLTFMeshQuantizationExtension();
              break;
            default:
              if (extensionsRequired.indexOf(extensionName) >= 0 && plugins[extensionName] === undefined) {
                console.warn('THREE.GLTFLoader: Unknown extension "' + extensionName + '".');
              }
          }
        }
      }
      parser.setExtensions(extensions);
      parser.setPlugins(plugins);
      parser.parse(onLoad, onError);
    }
  }

  /* GLTFREGISTRY */

  function GLTFRegistry() {
    var objects = {};
    return {
      get: function (key) {
        return objects[key];
      },
      add: function (key, object) {
        objects[key] = object;
      },
      remove: function (key) {
        delete objects[key];
      },
      removeAll: function () {
        objects = {};
      }
    };
  }

  /*********************************/
  /********** EXTENSIONS ***********/
  /*********************************/

  var EXTENSIONS = {
    KHR_BINARY_GLTF: 'KHR_binary_glTF',
    KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
    KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
    KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
    KHR_MATERIALS_IOR: 'KHR_materials_ior',
    KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
    KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
    KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
    KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
    KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
    KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
    KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
    KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
    KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
    EXT_TEXTURE_WEBP: 'EXT_texture_webp',
    EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression'
  };

  /**
   * Punctual Lights Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
   */
  class GLTFLightsExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;

      // Object3D instance caches
      this.cache = {
        refs: {},
        uses: {}
      };
    }
    _markDefs() {
      var parser = this.parser;
      var nodeDefs = this.parser.json.nodes || [];
      for (var nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
        var nodeDef = nodeDefs[nodeIndex];
        if (nodeDef.extensions && nodeDef.extensions[this.name] && nodeDef.extensions[this.name].light !== undefined) {
          parser._addNodeRef(this.cache, nodeDef.extensions[this.name].light);
        }
      }
    }
    _loadLight(lightIndex) {
      var parser = this.parser;
      var cacheKey = 'light:' + lightIndex;
      var dependency = parser.cache.get(cacheKey);
      if (dependency) return dependency;
      var json = parser.json;
      var extensions = json.extensions && json.extensions[this.name] || {};
      var lightDefs = extensions.lights || [];
      var lightDef = lightDefs[lightIndex];
      var lightNode;
      var color = new THREE.Color(0xffffff);
      if (lightDef.color !== undefined) color.fromArray(lightDef.color);
      var range = lightDef.range !== undefined ? lightDef.range : 0;
      switch (lightDef.type) {
        case 'directional':
          lightNode = new THREE.DirectionalLight(color);
          lightNode.target.position.set(0, 0, -1);
          lightNode.add(lightNode.target);
          break;
        case 'point':
          lightNode = new THREE.PointLight(color);
          lightNode.distance = range;
          break;
        case 'spot':
          lightNode = new THREE.SpotLight(color);
          lightNode.distance = range;
          // Handle spotlight properties.
          lightDef.spot = lightDef.spot || {};
          lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
          lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
          lightNode.angle = lightDef.spot.outerConeAngle;
          lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
          lightNode.target.position.set(0, 0, -1);
          lightNode.add(lightNode.target);
          break;
        default:
          throw new Error('THREE.GLTFLoader: Unexpected light type: ' + lightDef.type);
      }

      // Some lights (e.g. spot) default to a position other than the origin. Reset the position
      // here, because node-level parsing will only override position if explicitly specified.
      lightNode.position.set(0, 0, 0);
      lightNode.decay = 2;
      if (lightDef.intensity !== undefined) lightNode.intensity = lightDef.intensity;
      lightNode.name = parser.createUniqueName(lightDef.name || 'light_' + lightIndex);
      dependency = Promise.resolve(lightNode);
      parser.cache.add(cacheKey, dependency);
      return dependency;
    }
    createNodeAttachment(nodeIndex) {
      var self = this;
      var parser = this.parser;
      var json = parser.json;
      var nodeDef = json.nodes[nodeIndex];
      var lightDef = nodeDef.extensions && nodeDef.extensions[this.name] || {};
      var lightIndex = lightDef.light;
      if (lightIndex === undefined) return null;
      return this._loadLight(lightIndex).then(function (light) {
        return parser._getNodeRef(self.cache, lightIndex, light);
      });
    }
  }

  /**
   * Unlit Materials Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
   */
  class GLTFMaterialsUnlitExtension {
    constructor() {
      this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;
    }
    getMaterialType() {
      return THREE.MeshBasicMaterial;
    }
    extendParams(materialParams, materialDef, parser) {
      var pending = [];
      materialParams.color = new THREE.Color(1.0, 1.0, 1.0);
      materialParams.opacity = 1.0;
      var metallicRoughness = materialDef.pbrMetallicRoughness;
      if (metallicRoughness) {
        if (Array.isArray(metallicRoughness.baseColorFactor)) {
          var array = metallicRoughness.baseColorFactor;
          materialParams.color.fromArray(array);
          materialParams.opacity = array[3];
        }
        if (metallicRoughness.baseColorTexture !== undefined) {
          pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture));
        }
      }
      return Promise.all(pending);
    }
  }

  /**
   * Clearcoat Materials Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat
   */
  class GLTFMaterialsClearcoatExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var pending = [];
      var extension = materialDef.extensions[this.name];
      if (extension.clearcoatFactor !== undefined) {
        materialParams.clearcoat = extension.clearcoatFactor;
      }
      if (extension.clearcoatTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'clearcoatMap', extension.clearcoatTexture));
      }
      if (extension.clearcoatRoughnessFactor !== undefined) {
        materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;
      }
      if (extension.clearcoatRoughnessTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'clearcoatRoughnessMap', extension.clearcoatRoughnessTexture));
      }
      if (extension.clearcoatNormalTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'clearcoatNormalMap', extension.clearcoatNormalTexture));
        if (extension.clearcoatNormalTexture.scale !== undefined) {
          var scale = extension.clearcoatNormalTexture.scale;
          materialParams.clearcoatNormalScale = new THREE.Vector2(scale, scale);
        }
      }
      return Promise.all(pending);
    }
  }

  /**
   * Sheen Materials Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_sheen
   */
  class GLTFMaterialsSheenExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_SHEEN;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var pending = [];
      materialParams.sheenColor = new THREE.Color(0, 0, 0);
      materialParams.sheenRoughness = 0;
      materialParams.sheen = 1;
      var extension = materialDef.extensions[this.name];
      if (extension.sheenColorFactor !== undefined) {
        materialParams.sheenColor.fromArray(extension.sheenColorFactor);
      }
      if (extension.sheenRoughnessFactor !== undefined) {
        materialParams.sheenRoughness = extension.sheenRoughnessFactor;
      }
      if (extension.sheenColorTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'sheenColorMap', extension.sheenColorTexture));
      }
      if (extension.sheenRoughnessTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'sheenRoughnessMap', extension.sheenRoughnessTexture));
      }
      return Promise.all(pending);
    }
  }

  /**
   * Transmission Materials Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
   * Draft: https://github.com/KhronosGroup/glTF/pull/1698
   */
  class GLTFMaterialsTransmissionExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var pending = [];
      var extension = materialDef.extensions[this.name];
      if (extension.transmissionFactor !== undefined) {
        materialParams.transmission = extension.transmissionFactor;
      }
      if (extension.transmissionTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'transmissionMap', extension.transmissionTexture));
      }
      return Promise.all(pending);
    }
  }

  /**
   * Materials Volume Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_volume
   */
  class GLTFMaterialsVolumeExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_VOLUME;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var pending = [];
      var extension = materialDef.extensions[this.name];
      materialParams.thickness = extension.thicknessFactor !== undefined ? extension.thicknessFactor : 0;
      if (extension.thicknessTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'thicknessMap', extension.thicknessTexture));
      }
      materialParams.attenuationDistance = extension.attenuationDistance || 0;
      var colorArray = extension.attenuationColor || [1, 1, 1];
      materialParams.attenuationColor = new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);
      return Promise.all(pending);
    }
  }

  /**
   * Materials ior Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_ior
   */
  class GLTFMaterialsIorExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_IOR;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var extension = materialDef.extensions[this.name];
      materialParams.ior = extension.ior !== undefined ? extension.ior : 1.5;
      return Promise.resolve();
    }
  }

  /**
   * Materials specular Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_specular
   */
  class GLTFMaterialsSpecularExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_MATERIALS_SPECULAR;
    }
    getMaterialType(materialIndex) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
      return THREE.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
      var parser = this.parser;
      var materialDef = parser.json.materials[materialIndex];
      if (!materialDef.extensions || !materialDef.extensions[this.name]) {
        return Promise.resolve();
      }
      var pending = [];
      var extension = materialDef.extensions[this.name];
      materialParams.specularIntensity = extension.specularFactor !== undefined ? extension.specularFactor : 1.0;
      if (extension.specularTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'specularIntensityMap', extension.specularTexture));
      }
      var colorArray = extension.specularColorFactor || [1, 1, 1];
      materialParams.specularColor = new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);
      if (extension.specularColorTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'specularColorMap', extension.specularColorTexture).then(function (texture) {
          texture.encoding = THREE.sRGBEncoding;
        }));
      }
      return Promise.all(pending);
    }
  }

  /**
   * BasisU Texture Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu
   */
  class GLTFTextureBasisUExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.KHR_TEXTURE_BASISU;
    }
    loadTexture(textureIndex) {
      var parser = this.parser;
      var json = parser.json;
      var textureDef = json.textures[textureIndex];
      if (!textureDef.extensions || !textureDef.extensions[this.name]) {
        return null;
      }
      var extension = textureDef.extensions[this.name];
      var source = json.images[extension.source];
      var loader = parser.options.ktx2Loader;
      if (!loader) {
        if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
          throw new Error('THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures');
        } else {
          // Assumes that the extension is optional and that a fallback texture is present
          return null;
        }
      }
      return parser.loadTextureImage(textureIndex, source, loader);
    }
  }

  /**
   * WebP Texture Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp
   */
  class GLTFTextureWebPExtension {
    constructor(parser) {
      this.parser = parser;
      this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
      this.isSupported = null;
    }
    loadTexture(textureIndex) {
      var name = this.name;
      var parser = this.parser;
      var json = parser.json;
      var textureDef = json.textures[textureIndex];
      if (!textureDef.extensions || !textureDef.extensions[name]) {
        return null;
      }
      var extension = textureDef.extensions[name];
      var source = json.images[extension.source];
      var loader = parser.textureLoader;
      if (source.uri) {
        var handler = parser.options.manager.getHandler(source.uri);
        if (handler !== null) loader = handler;
      }
      return this.detectSupport().then(function (isSupported) {
        if (isSupported) return parser.loadTextureImage(textureIndex, source, loader);
        if (json.extensionsRequired && json.extensionsRequired.indexOf(name) >= 0) {
          throw new Error('THREE.GLTFLoader: WebP required by asset but unsupported.');
        }

        // Fall back to PNG or JPEG.
        return parser.loadTexture(textureIndex);
      });
    }
    detectSupport() {
      if (!this.isSupported) {
        this.isSupported = new Promise(function (resolve) {
          var image = new Image();

          // Lossy test image. Support for lossy images doesn't guarantee support for all
          // WebP images, unfortunately.
          image.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
          image.onload = image.onerror = function () {
            resolve(image.height === 1);
          };
        });
      }
      return this.isSupported;
    }
  }

  /**
   * meshopt BufferView Compression Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_meshopt_compression
   */
  class GLTFMeshoptCompression {
    constructor(parser) {
      this.name = EXTENSIONS.EXT_MESHOPT_COMPRESSION;
      this.parser = parser;
    }
    loadBufferView(index) {
      var json = this.parser.json;
      var bufferView = json.bufferViews[index];
      if (bufferView.extensions && bufferView.extensions[this.name]) {
        var extensionDef = bufferView.extensions[this.name];
        var buffer = this.parser.getDependency('buffer', extensionDef.buffer);
        var decoder = this.parser.options.meshoptDecoder;
        if (!decoder || !decoder.supported) {
          if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
            throw new Error('THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files');
          } else {
            // Assumes that the extension is optional and that fallback buffer data is present
            return null;
          }
        }
        return Promise.all([buffer, decoder.ready]).then(function (res) {
          var byteOffset = extensionDef.byteOffset || 0;
          var byteLength = extensionDef.byteLength || 0;
          var count = extensionDef.count;
          var stride = extensionDef.byteStride;
          var result = new ArrayBuffer(count * stride);
          var source = new Uint8Array(res[0], byteOffset, byteLength);
          decoder.decodeGltfBuffer(new Uint8Array(result), count, stride, source, extensionDef.mode, extensionDef.filter);
          return result;
        });
      } else {
        return null;
      }
    }
  }

  /* BINARY EXTENSION */
  var BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
  var BINARY_EXTENSION_HEADER_LENGTH = 12;
  var BINARY_EXTENSION_CHUNK_TYPES = {
    JSON: 0x4E4F534A,
    BIN: 0x004E4942
  };
  class GLTFBinaryExtension {
    constructor(data) {
      this.name = EXTENSIONS.KHR_BINARY_GLTF;
      this.content = null;
      this.body = null;
      var headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
      this.header = {
        magic: THREE.LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4))),
        version: headerView.getUint32(4, true),
        length: headerView.getUint32(8, true)
      };
      if (this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC) {
        throw new Error('THREE.GLTFLoader: Unsupported glTF-Binary header.');
      } else if (this.header.version < 2.0) {
        throw new Error('THREE.GLTFLoader: Legacy binary file detected.');
      }
      var chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
      var chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
      var chunkIndex = 0;
      while (chunkIndex < chunkContentsLength) {
        var chunkLength = chunkView.getUint32(chunkIndex, true);
        chunkIndex += 4;
        var chunkType = chunkView.getUint32(chunkIndex, true);
        chunkIndex += 4;
        if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {
          var contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength);
          this.content = THREE.LoaderUtils.decodeText(contentArray);
        } else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {
          var byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
          this.body = data.slice(byteOffset, byteOffset + chunkLength);
        }

        // Clients must ignore chunks with unknown types.

        chunkIndex += chunkLength;
      }
      if (this.content === null) {
        throw new Error('THREE.GLTFLoader: JSON content not found.');
      }
    }
  }

  /**
   * DRACO Mesh Compression Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression
   */
  class GLTFDracoMeshCompressionExtension {
    constructor(json, dracoLoader) {
      if (!dracoLoader) {
        throw new Error('THREE.GLTFLoader: No DRACOLoader instance provided.');
      }
      this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
      this.json = json;
      this.dracoLoader = dracoLoader;
      this.dracoLoader.preload();
    }
    decodePrimitive(primitive, parser) {
      var json = this.json;
      var dracoLoader = this.dracoLoader;
      var bufferViewIndex = primitive.extensions[this.name].bufferView;
      var gltfAttributeMap = primitive.extensions[this.name].attributes;
      var threeAttributeMap = {};
      var attributeNormalizedMap = {};
      var attributeTypeMap = {};
      for (var attributeName in gltfAttributeMap) {
        var threeAttributeName = ATTRIBUTES[attributeName] || attributeName.toLowerCase();
        threeAttributeMap[threeAttributeName] = gltfAttributeMap[attributeName];
      }
      for (var _attributeName in primitive.attributes) {
        var _threeAttributeName = ATTRIBUTES[_attributeName] || _attributeName.toLowerCase();
        if (gltfAttributeMap[_attributeName] !== undefined) {
          var accessorDef = json.accessors[primitive.attributes[_attributeName]];
          var componentType = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
          attributeTypeMap[_threeAttributeName] = componentType;
          attributeNormalizedMap[_threeAttributeName] = accessorDef.normalized === true;
        }
      }
      return parser.getDependency('bufferView', bufferViewIndex).then(function (bufferView) {
        return new Promise(function (resolve) {
          dracoLoader.decodeDracoFile(bufferView, function (geometry) {
            for (var _attributeName2 in geometry.attributes) {
              var attribute = geometry.attributes[_attributeName2];
              var normalized = attributeNormalizedMap[_attributeName2];
              if (normalized !== undefined) attribute.normalized = normalized;
            }
            resolve(geometry);
          }, threeAttributeMap, attributeTypeMap);
        });
      });
    }
  }

  /**
   * Texture Transform Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform
   */
  class GLTFTextureTransformExtension {
    constructor() {
      this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;
    }
    extendTexture(texture, transform) {
      if (transform.texCoord !== undefined) {
        console.warn('THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.');
      }
      if (transform.offset === undefined && transform.rotation === undefined && transform.scale === undefined) {
        // See https://github.com/mrdoob/three.js/issues/21819.
        return texture;
      }
      texture = texture.clone();
      if (transform.offset !== undefined) {
        texture.offset.fromArray(transform.offset);
      }
      if (transform.rotation !== undefined) {
        texture.rotation = transform.rotation;
      }
      if (transform.scale !== undefined) {
        texture.repeat.fromArray(transform.scale);
      }
      texture.needsUpdate = true;
      return texture;
    }
  }

  /**
   * Specular-Glossiness Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness
   */

  /**
   * A sub class of StandardMaterial with some of the functionality
   * changed via the `onBeforeCompile` callback
   * @pailhead
   */
  class GLTFMeshStandardSGMaterial extends THREE.MeshStandardMaterial {
    constructor(params) {
      super();
      this.isGLTFSpecularGlossinessMaterial = true;

      //various chunks that need replacing
      var specularMapParsFragmentChunk = ['#ifdef USE_SPECULARMAP', '	uniform sampler2D specularMap;', '#endif'].join('\n');
      var glossinessMapParsFragmentChunk = ['#ifdef USE_GLOSSINESSMAP', '	uniform sampler2D glossinessMap;', '#endif'].join('\n');
      var specularMapFragmentChunk = ['vec3 specularFactor = specular;', '#ifdef USE_SPECULARMAP', '	vec4 texelSpecular = texture2D( specularMap, vUv );', '	texelSpecular = sRGBToLinear( texelSpecular );', '	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture', '	specularFactor *= texelSpecular.rgb;', '#endif'].join('\n');
      var glossinessMapFragmentChunk = ['float glossinessFactor = glossiness;', '#ifdef USE_GLOSSINESSMAP', '	vec4 texelGlossiness = texture2D( glossinessMap, vUv );', '	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture', '	glossinessFactor *= texelGlossiness.a;', '#endif'].join('\n');
      var lightPhysicalFragmentChunk = ['PhysicalMaterial material;', 'material.diffuseColor = diffuseColor.rgb * ( 1. - max( specularFactor.r, max( specularFactor.g, specularFactor.b ) ) );', 'vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );', 'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );', 'material.roughness = max( 1.0 - glossinessFactor, 0.0525 ); // 0.0525 corresponds to the base mip of a 256 cubemap.', 'material.roughness += geometryRoughness;', 'material.roughness = min( material.roughness, 1.0 );', 'material.specularColor = specularFactor;'].join('\n');
      var uniforms = {
        specular: {
          value: new THREE.Color().setHex(0xffffff)
        },
        glossiness: {
          value: 1
        },
        specularMap: {
          value: null
        },
        glossinessMap: {
          value: null
        }
      };
      this._extraUniforms = uniforms;
      this.onBeforeCompile = function (shader) {
        for (var uniformName in uniforms) {
          shader.uniforms[uniformName] = uniforms[uniformName];
        }
        shader.fragmentShader = shader.fragmentShader.replace('uniform float roughness;', 'uniform vec3 specular;').replace('uniform float metalness;', 'uniform float glossiness;').replace('#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk).replace('#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk).replace('#include <roughnessmap_fragment>', specularMapFragmentChunk).replace('#include <metalnessmap_fragment>', glossinessMapFragmentChunk).replace('#include <lights_physical_fragment>', lightPhysicalFragmentChunk);
      };
      Object.defineProperties(this, {
        specular: {
          get: function () {
            return uniforms.specular.value;
          },
          set: function (v) {
            uniforms.specular.value = v;
          }
        },
        specularMap: {
          get: function () {
            return uniforms.specularMap.value;
          },
          set: function (v) {
            uniforms.specularMap.value = v;
            if (v) {
              this.defines.USE_SPECULARMAP = ''; // USE_UV is set by the renderer for specular maps
            } else {
              delete this.defines.USE_SPECULARMAP;
            }
          }
        },
        glossiness: {
          get: function () {
            return uniforms.glossiness.value;
          },
          set: function (v) {
            uniforms.glossiness.value = v;
          }
        },
        glossinessMap: {
          get: function () {
            return uniforms.glossinessMap.value;
          },
          set: function (v) {
            uniforms.glossinessMap.value = v;
            if (v) {
              this.defines.USE_GLOSSINESSMAP = '';
              this.defines.USE_UV = '';
            } else {
              delete this.defines.USE_GLOSSINESSMAP;
              delete this.defines.USE_UV;
            }
          }
        }
      });
      delete this.metalness;
      delete this.roughness;
      delete this.metalnessMap;
      delete this.roughnessMap;
      this.setValues(params);
    }
    copy(source) {
      super.copy(source);
      this.specularMap = source.specularMap;
      this.specular.copy(source.specular);
      this.glossinessMap = source.glossinessMap;
      this.glossiness = source.glossiness;
      delete this.metalness;
      delete this.roughness;
      delete this.metalnessMap;
      delete this.roughnessMap;
      return this;
    }
  }
  class GLTFMaterialsPbrSpecularGlossinessExtension {
    constructor() {
      this.name = EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
      this.specularGlossinessParams = ['color', 'map', 'lightMap', 'lightMapIntensity', 'aoMap', 'aoMapIntensity', 'emissive', 'emissiveIntensity', 'emissiveMap', 'bumpMap', 'bumpScale', 'normalMap', 'normalMapType', 'displacementMap', 'displacementScale', 'displacementBias', 'specularMap', 'specular', 'glossinessMap', 'glossiness', 'alphaMap', 'envMap', 'envMapIntensity', 'refractionRatio'];
    }
    getMaterialType() {
      return GLTFMeshStandardSGMaterial;
    }
    extendParams(materialParams, materialDef, parser) {
      var pbrSpecularGlossiness = materialDef.extensions[this.name];
      materialParams.color = new THREE.Color(1.0, 1.0, 1.0);
      materialParams.opacity = 1.0;
      var pending = [];
      if (Array.isArray(pbrSpecularGlossiness.diffuseFactor)) {
        var array = pbrSpecularGlossiness.diffuseFactor;
        materialParams.color.fromArray(array);
        materialParams.opacity = array[3];
      }
      if (pbrSpecularGlossiness.diffuseTexture !== undefined) {
        pending.push(parser.assignTexture(materialParams, 'map', pbrSpecularGlossiness.diffuseTexture));
      }
      materialParams.emissive = new THREE.Color(0.0, 0.0, 0.0);
      materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
      materialParams.specular = new THREE.Color(1.0, 1.0, 1.0);
      if (Array.isArray(pbrSpecularGlossiness.specularFactor)) {
        materialParams.specular.fromArray(pbrSpecularGlossiness.specularFactor);
      }
      if (pbrSpecularGlossiness.specularGlossinessTexture !== undefined) {
        var specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
        pending.push(parser.assignTexture(materialParams, 'glossinessMap', specGlossMapDef));
        pending.push(parser.assignTexture(materialParams, 'specularMap', specGlossMapDef));
      }
      return Promise.all(pending);
    }
    createMaterial(materialParams) {
      var material = new GLTFMeshStandardSGMaterial(materialParams);
      material.fog = true;
      material.color = materialParams.color;
      material.map = materialParams.map === undefined ? null : materialParams.map;
      material.lightMap = null;
      material.lightMapIntensity = 1.0;
      material.aoMap = materialParams.aoMap === undefined ? null : materialParams.aoMap;
      material.aoMapIntensity = 1.0;
      material.emissive = materialParams.emissive;
      material.emissiveIntensity = 1.0;
      material.emissiveMap = materialParams.emissiveMap === undefined ? null : materialParams.emissiveMap;
      material.bumpMap = materialParams.bumpMap === undefined ? null : materialParams.bumpMap;
      material.bumpScale = 1;
      material.normalMap = materialParams.normalMap === undefined ? null : materialParams.normalMap;
      material.normalMapType = THREE.TangentSpaceNormalMap;
      if (materialParams.normalScale) material.normalScale = materialParams.normalScale;
      material.displacementMap = null;
      material.displacementScale = 1;
      material.displacementBias = 0;
      material.specularMap = materialParams.specularMap === undefined ? null : materialParams.specularMap;
      material.specular = materialParams.specular;
      material.glossinessMap = materialParams.glossinessMap === undefined ? null : materialParams.glossinessMap;
      material.glossiness = materialParams.glossiness;
      material.alphaMap = null;
      material.envMap = materialParams.envMap === undefined ? null : materialParams.envMap;
      material.envMapIntensity = 1.0;
      material.refractionRatio = 0.98;
      return material;
    }
  }

  /**
   * Mesh Quantization Extension
   *
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
   */
  class GLTFMeshQuantizationExtension {
    constructor() {
      this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;
    }
  }

  /*********************************/
  /********** INTERPOLATION ********/
  /*********************************/

  // Spline Interpolation
  // Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-c-spline-interpolation
  class GLTFCubicSplineInterpolant extends THREE.Interpolant {
    constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
      super(parameterPositions, sampleValues, sampleSize, resultBuffer);
    }
    copySampleValue_(index) {
      // Copies a sample value to the result buffer. See description of glTF
      // CUBICSPLINE values layout in interpolate_() function below.

      var result = this.resultBuffer,
        values = this.sampleValues,
        valueSize = this.valueSize,
        offset = index * valueSize * 3 + valueSize;
      for (var i = 0; i !== valueSize; i++) {
        result[i] = values[offset + i];
      }
      return result;
    }
  }
  GLTFCubicSplineInterpolant.prototype.beforeStart_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;
  GLTFCubicSplineInterpolant.prototype.afterEnd_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;
  GLTFCubicSplineInterpolant.prototype.interpolate_ = function (i1, t0, t, t1) {
    var result = this.resultBuffer;
    var values = this.sampleValues;
    var stride = this.valueSize;
    var stride2 = stride * 2;
    var stride3 = stride * 3;
    var td = t1 - t0;
    var p = (t - t0) / td;
    var pp = p * p;
    var ppp = pp * p;
    var offset1 = i1 * stride3;
    var offset0 = offset1 - stride3;
    var s2 = -2 * ppp + 3 * pp;
    var s3 = ppp - pp;
    var s0 = 1 - s2;
    var s1 = s3 - pp + p;

    // Layout of keyframe output values for CUBICSPLINE animations:
    //   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]
    for (var i = 0; i !== stride; i++) {
      var p0 = values[offset0 + i + stride]; // splineVertex_k
      var m0 = values[offset0 + i + stride2] * td; // outTangent_k * (t_k+1 - t_k)
      var p1 = values[offset1 + i + stride]; // splineVertex_k+1
      var m1 = values[offset1 + i] * td; // inTangent_k+1 * (t_k+1 - t_k)

      result[i] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;
    }
    return result;
  };
  var _q = new THREE.Quaternion();
  class GLTFCubicSplineQuaternionInterpolant extends GLTFCubicSplineInterpolant {
    interpolate_(i1, t0, t, t1) {
      var result = super.interpolate_(i1, t0, t, t1);
      _q.fromArray(result).normalize().toArray(result);
      return result;
    }
  }

  /*********************************/
  /********** INTERNALS ************/
  /*********************************/

  /* CONSTANTS */

  var WEBGL_CONSTANTS = {
    FLOAT: 5126,
    //FLOAT_MAT2: 35674,
    FLOAT_MAT3: 35675,
    FLOAT_MAT4: 35676,
    FLOAT_VEC2: 35664,
    FLOAT_VEC3: 35665,
    FLOAT_VEC4: 35666,
    LINEAR: 9729,
    REPEAT: 10497,
    SAMPLER_2D: 35678,
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123
  };
  var WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
  };
  var WEBGL_FILTERS = {
    9728: THREE.NearestFilter,
    9729: THREE.LinearFilter,
    9984: THREE.NearestMipmapNearestFilter,
    9985: THREE.LinearMipmapNearestFilter,
    9986: THREE.NearestMipmapLinearFilter,
    9987: THREE.LinearMipmapLinearFilter
  };
  var WEBGL_WRAPPINGS = {
    33071: THREE.ClampToEdgeWrapping,
    33648: THREE.MirroredRepeatWrapping,
    10497: THREE.RepeatWrapping
  };
  var WEBGL_TYPE_SIZES = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
  };
  var ATTRIBUTES = {
    POSITION: 'position',
    NORMAL: 'normal',
    TANGENT: 'tangent',
    TEXCOORD_0: 'uv',
    TEXCOORD_1: 'uv2',
    COLOR_0: 'color',
    WEIGHTS_0: 'skinWeight',
    JOINTS_0: 'skinIndex'
  };
  var PATH_PROPERTIES = {
    scale: 'scale',
    translation: 'position',
    rotation: 'quaternion',
    weights: 'morphTargetInfluences'
  };
  var INTERPOLATION = {
    CUBICSPLINE: undefined,
    // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
    // keyframe track will be initialized with a default interpolation type, then modified.
    LINEAR: THREE.InterpolateLinear,
    STEP: THREE.InterpolateDiscrete
  };
  var ALPHA_MODES = {
    OPAQUE: 'OPAQUE',
    MASK: 'MASK',
    BLEND: 'BLEND'
  };

  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
   */
  function createDefaultMaterial(cache) {
    if (cache['DefaultMaterial'] === undefined) {
      cache['DefaultMaterial'] = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0x000000,
        metalness: 1,
        roughness: 1,
        transparent: false,
        depthTest: true,
        side: THREE.FrontSide
      });
    }
    return cache['DefaultMaterial'];
  }
  function addUnknownExtensionsToUserData(knownExtensions, object, objectDef) {
    // Add unknown glTF extensions to an object's userData.

    for (var name in objectDef.extensions) {
      if (knownExtensions[name] === undefined) {
        object.userData.gltfExtensions = object.userData.gltfExtensions || {};
        object.userData.gltfExtensions[name] = objectDef.extensions[name];
      }
    }
  }

  /**
   * @param {Object3D|Material|BufferGeometry} object
   * @param {GLTF.definition} gltfDef
   */
  function assignExtrasToUserData(object, gltfDef) {
    if (gltfDef.extras !== undefined) {
      if (typeof gltfDef.extras === 'object') {
        Object.assign(object.userData, gltfDef.extras);
      } else {
        console.warn('THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras);
      }
    }
  }

  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets
   *
   * @param {BufferGeometry} geometry
   * @param {Array<GLTF.Target>} targets
   * @param {GLTFParser} parser
   * @return {Promise<BufferGeometry>}
   */
  function addMorphTargets(geometry, targets, parser) {
    var hasMorphPosition = false;
    var hasMorphNormal = false;
    for (var i = 0, il = targets.length; i < il; i++) {
      var target = targets[i];
      if (target.POSITION !== undefined) hasMorphPosition = true;
      if (target.NORMAL !== undefined) hasMorphNormal = true;
      if (hasMorphPosition && hasMorphNormal) break;
    }
    if (!hasMorphPosition && !hasMorphNormal) return Promise.resolve(geometry);
    var pendingPositionAccessors = [];
    var pendingNormalAccessors = [];
    for (var _i2 = 0, _il = targets.length; _i2 < _il; _i2++) {
      var _target = targets[_i2];
      if (hasMorphPosition) {
        var pendingAccessor = _target.POSITION !== undefined ? parser.getDependency('accessor', _target.POSITION) : geometry.attributes.position;
        pendingPositionAccessors.push(pendingAccessor);
      }
      if (hasMorphNormal) {
        var _pendingAccessor = _target.NORMAL !== undefined ? parser.getDependency('accessor', _target.NORMAL) : geometry.attributes.normal;
        pendingNormalAccessors.push(_pendingAccessor);
      }
    }
    return Promise.all([Promise.all(pendingPositionAccessors), Promise.all(pendingNormalAccessors)]).then(function (accessors) {
      var morphPositions = accessors[0];
      var morphNormals = accessors[1];
      if (hasMorphPosition) geometry.morphAttributes.position = morphPositions;
      if (hasMorphNormal) geometry.morphAttributes.normal = morphNormals;
      geometry.morphTargetsRelative = true;
      return geometry;
    });
  }

  /**
   * @param {Mesh} mesh
   * @param {GLTF.Mesh} meshDef
   */
  function updateMorphTargets(mesh, meshDef) {
    mesh.updateMorphTargets();
    if (meshDef.weights !== undefined) {
      for (var i = 0, il = meshDef.weights.length; i < il; i++) {
        mesh.morphTargetInfluences[i] = meshDef.weights[i];
      }
    }

    // .extras has user-defined data, so check that .extras.targetNames is an array.
    if (meshDef.extras && Array.isArray(meshDef.extras.targetNames)) {
      var targetNames = meshDef.extras.targetNames;
      if (mesh.morphTargetInfluences.length === targetNames.length) {
        mesh.morphTargetDictionary = {};
        for (var _i3 = 0, _il2 = targetNames.length; _i3 < _il2; _i3++) {
          mesh.morphTargetDictionary[targetNames[_i3]] = _i3;
        }
      } else {
        console.warn('THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.');
      }
    }
  }
  function createPrimitiveKey(primitiveDef) {
    var dracoExtension = primitiveDef.extensions && primitiveDef.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION];
    var geometryKey;
    if (dracoExtension) {
      geometryKey = 'draco:' + dracoExtension.bufferView + ':' + dracoExtension.indices + ':' + createAttributesKey(dracoExtension.attributes);
    } else {
      geometryKey = primitiveDef.indices + ':' + createAttributesKey(primitiveDef.attributes) + ':' + primitiveDef.mode;
    }
    return geometryKey;
  }
  function createAttributesKey(attributes) {
    var attributesKey = '';
    var keys = Object.keys(attributes).sort();
    for (var i = 0, il = keys.length; i < il; i++) {
      attributesKey += keys[i] + ':' + attributes[keys[i]] + ';';
    }
    return attributesKey;
  }
  function getNormalizedComponentScale(constructor) {
    // Reference:
    // https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data

    switch (constructor) {
      case Int8Array:
        return 1 / 127;
      case Uint8Array:
        return 1 / 255;
      case Int16Array:
        return 1 / 32767;
      case Uint16Array:
        return 1 / 65535;
      default:
        throw new Error('THREE.GLTFLoader: Unsupported normalized accessor component type.');
    }
  }

  /* GLTF PARSER */

  class GLTFParser {
    constructor() {
      var json = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      this.json = json;
      this.extensions = {};
      this.plugins = {};
      this.options = options;

      // loader object cache
      this.cache = new GLTFRegistry();

      // associations between Three.js objects and glTF elements
      this.associations = new Map();

      // BufferGeometry caching
      this.primitiveCache = {};

      // Object3D instance caches
      this.meshCache = {
        refs: {},
        uses: {}
      };
      this.cameraCache = {
        refs: {},
        uses: {}
      };
      this.lightCache = {
        refs: {},
        uses: {}
      };
      this.textureCache = {};

      // Track node names, to ensure no duplicates
      this.nodeNamesUsed = {};

      // Use an ImageBitmapLoader if imageBitmaps are supported. Moves much of the
      // expensive work of uploading a texture to the GPU off the main thread.
      if (typeof createImageBitmap !== 'undefined' && /Firefox/.test(navigator.userAgent) === false) {
        this.textureLoader = new THREE.ImageBitmapLoader(this.options.manager);
      } else {
        this.textureLoader = new THREE.TextureLoader(this.options.manager);
      }
      this.textureLoader.setCrossOrigin(this.options.crossOrigin);
      this.textureLoader.setRequestHeader(this.options.requestHeader);
      this.fileLoader = new THREE.FileLoader(this.options.manager);
      this.fileLoader.setResponseType('arraybuffer');
      if (this.options.crossOrigin === 'use-credentials') {
        this.fileLoader.setWithCredentials(true);
      }
    }
    setExtensions(extensions) {
      this.extensions = extensions;
    }
    setPlugins(plugins) {
      this.plugins = plugins;
    }
    parse(onLoad, onError) {
      var parser = this;
      var json = this.json;
      var extensions = this.extensions;

      // Clear the loader cache
      this.cache.removeAll();

      // Mark the special nodes/meshes in json for efficient parse
      this._invokeAll(function (ext) {
        return ext._markDefs && ext._markDefs();
      });
      Promise.all(this._invokeAll(function (ext) {
        return ext.beforeRoot && ext.beforeRoot();
      })).then(function () {
        return Promise.all([parser.getDependencies('scene'), parser.getDependencies('animation'), parser.getDependencies('camera')]);
      }).then(function (dependencies) {
        var result = {
          scene: dependencies[0][json.scene || 0],
          scenes: dependencies[0],
          animations: dependencies[1],
          cameras: dependencies[2],
          asset: json.asset,
          parser: parser,
          userData: {}
        };
        addUnknownExtensionsToUserData(extensions, result, json);
        assignExtrasToUserData(result, json);
        Promise.all(parser._invokeAll(function (ext) {
          return ext.afterRoot && ext.afterRoot(result);
        })).then(function () {
          onLoad(result);
        });
      }).catch(onError);
    }

    /**
     * Marks the special nodes/meshes in json for efficient parse.
     */
    _markDefs() {
      var nodeDefs = this.json.nodes || [];
      var skinDefs = this.json.skins || [];
      var meshDefs = this.json.meshes || [];

      // Nothing in the node definition indicates whether it is a Bone or an
      // Object3D. Use the skins' joint references to mark bones.
      for (var skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex++) {
        var joints = skinDefs[skinIndex].joints;
        for (var i = 0, il = joints.length; i < il; i++) {
          nodeDefs[joints[i]].isBone = true;
        }
      }

      // Iterate over all nodes, marking references to shared resources,
      // as well as skeleton joints.
      for (var nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
        var nodeDef = nodeDefs[nodeIndex];
        if (nodeDef.mesh !== undefined) {
          this._addNodeRef(this.meshCache, nodeDef.mesh);

          // Nothing in the mesh definition indicates whether it is
          // a SkinnedMesh or Mesh. Use the node's mesh reference
          // to mark SkinnedMesh if node has skin.
          if (nodeDef.skin !== undefined) {
            meshDefs[nodeDef.mesh].isSkinnedMesh = true;
          }
        }
        if (nodeDef.camera !== undefined) {
          this._addNodeRef(this.cameraCache, nodeDef.camera);
        }
      }
    }

    /**
     * Counts references to shared node / Object3D resources. These resources
     * can be reused, or "instantiated", at multiple nodes in the scene
     * hierarchy. Mesh, Camera, and Light instances are instantiated and must
     * be marked. Non-scenegraph resources (like Materials, Geometries, and
     * Textures) can be reused directly and are not marked here.
     *
     * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
     */
    _addNodeRef(cache, index) {
      if (index === undefined) return;
      if (cache.refs[index] === undefined) {
        cache.refs[index] = cache.uses[index] = 0;
      }
      cache.refs[index]++;
    }

    /** Returns a reference to a shared resource, cloning it if necessary. */
    _getNodeRef(cache, index, object) {
      if (cache.refs[index] <= 1) return object;
      var ref = object.clone();

      // Propagates mappings to the cloned object, prevents mappings on the
      // original object from being lost.
      var updateMappings = (original, clone) => {
        var mappings = this.associations.get(original);
        if (mappings != null) {
          this.associations.set(clone, mappings);
        }
        for (var [i, child] of original.children.entries()) {
          updateMappings(child, clone.children[i]);
        }
      };
      updateMappings(object, ref);
      ref.name += '_instance_' + cache.uses[index]++;
      return ref;
    }
    _invokeOne(func) {
      var extensions = Object.values(this.plugins);
      extensions.push(this);
      for (var i = 0; i < extensions.length; i++) {
        var result = func(extensions[i]);
        if (result) return result;
      }
      return null;
    }
    _invokeAll(func) {
      var extensions = Object.values(this.plugins);
      extensions.unshift(this);
      var pending = [];
      for (var i = 0; i < extensions.length; i++) {
        var result = func(extensions[i]);
        if (result) pending.push(result);
      }
      return pending;
    }

    /**
     * Requests the specified dependency asynchronously, with caching.
     * @param {string} type
     * @param {number} index
     * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
     */
    getDependency(type, index) {
      var cacheKey = type + ':' + index;
      var dependency = this.cache.get(cacheKey);
      if (!dependency) {
        switch (type) {
          case 'scene':
            dependency = this.loadScene(index);
            break;
          case 'node':
            dependency = this.loadNode(index);
            break;
          case 'mesh':
            dependency = this._invokeOne(function (ext) {
              return ext.loadMesh && ext.loadMesh(index);
            });
            break;
          case 'accessor':
            dependency = this.loadAccessor(index);
            break;
          case 'bufferView':
            dependency = this._invokeOne(function (ext) {
              return ext.loadBufferView && ext.loadBufferView(index);
            });
            break;
          case 'buffer':
            dependency = this.loadBuffer(index);
            break;
          case 'material':
            dependency = this._invokeOne(function (ext) {
              return ext.loadMaterial && ext.loadMaterial(index);
            });
            break;
          case 'texture':
            dependency = this._invokeOne(function (ext) {
              return ext.loadTexture && ext.loadTexture(index);
            });
            break;
          case 'skin':
            dependency = this.loadSkin(index);
            break;
          case 'animation':
            dependency = this.loadAnimation(index);
            break;
          case 'camera':
            dependency = this.loadCamera(index);
            break;
          default:
            throw new Error('Unknown type: ' + type);
        }
        this.cache.add(cacheKey, dependency);
      }
      return dependency;
    }

    /**
     * Requests all dependencies of the specified type asynchronously, with caching.
     * @param {string} type
     * @return {Promise<Array<Object>>}
     */
    getDependencies(type) {
      var dependencies = this.cache.get(type);
      if (!dependencies) {
        var parser = this;
        var defs = this.json[type + (type === 'mesh' ? 'es' : 's')] || [];
        dependencies = Promise.all(defs.map(function (def, index) {
          return parser.getDependency(type, index);
        }));
        this.cache.add(type, dependencies);
      }
      return dependencies;
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
     * @param {number} bufferIndex
     * @return {Promise<ArrayBuffer>}
     */
    loadBuffer(bufferIndex) {
      var bufferDef = this.json.buffers[bufferIndex];
      var loader = this.fileLoader;
      if (bufferDef.type && bufferDef.type !== 'arraybuffer') {
        throw new Error('THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.');
      }

      // If present, GLB container is required to be the first buffer.
      if (bufferDef.uri === undefined && bufferIndex === 0) {
        return Promise.resolve(this.extensions[EXTENSIONS.KHR_BINARY_GLTF].body);
      }
      var options = this.options;
      return new Promise(function (resolve, reject) {
        loader.load(THREE.LoaderUtils.resolveURL(bufferDef.uri, options.path), resolve, undefined, function () {
          reject(new Error('THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".'));
        });
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
     * @param {number} bufferViewIndex
     * @return {Promise<ArrayBuffer>}
     */
    loadBufferView(bufferViewIndex) {
      var bufferViewDef = this.json.bufferViews[bufferViewIndex];
      return this.getDependency('buffer', bufferViewDef.buffer).then(function (buffer) {
        var byteLength = bufferViewDef.byteLength || 0;
        var byteOffset = bufferViewDef.byteOffset || 0;
        return buffer.slice(byteOffset, byteOffset + byteLength);
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
     * @param {number} accessorIndex
     * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
     */
    loadAccessor(accessorIndex) {
      var parser = this;
      var json = this.json;
      var accessorDef = this.json.accessors[accessorIndex];
      if (accessorDef.bufferView === undefined && accessorDef.sparse === undefined) {
        // Ignore empty accessors, which may be used to declare runtime
        // information about attributes coming from another source (e.g. Draco
        // compression extension).
        return Promise.resolve(null);
      }
      var pendingBufferViews = [];
      if (accessorDef.bufferView !== undefined) {
        pendingBufferViews.push(this.getDependency('bufferView', accessorDef.bufferView));
      } else {
        pendingBufferViews.push(null);
      }
      if (accessorDef.sparse !== undefined) {
        pendingBufferViews.push(this.getDependency('bufferView', accessorDef.sparse.indices.bufferView));
        pendingBufferViews.push(this.getDependency('bufferView', accessorDef.sparse.values.bufferView));
      }
      return Promise.all(pendingBufferViews).then(function (bufferViews) {
        var bufferView = bufferViews[0];
        var itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
        var TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];

        // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
        var elementBytes = TypedArray.BYTES_PER_ELEMENT;
        var itemBytes = elementBytes * itemSize;
        var byteOffset = accessorDef.byteOffset || 0;
        var byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[accessorDef.bufferView].byteStride : undefined;
        var normalized = accessorDef.normalized === true;
        var array, bufferAttribute;

        // The buffer is not interleaved if the stride is the item size in bytes.
        if (byteStride && byteStride !== itemBytes) {
          // Each "slice" of the buffer, as defined by 'count' elements of 'byteStride' bytes, gets its own InterleavedBuffer
          // This makes sure that IBA.count reflects accessor.count properly
          var ibSlice = Math.floor(byteOffset / byteStride);
          var ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
          var ib = parser.cache.get(ibCacheKey);
          if (!ib) {
            array = new TypedArray(bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes);

            // Integer parameters to IB/IBA are in array elements, not bytes.
            ib = new THREE.InterleavedBuffer(array, byteStride / elementBytes);
            parser.cache.add(ibCacheKey, ib);
          }
          bufferAttribute = new THREE.InterleavedBufferAttribute(ib, itemSize, byteOffset % byteStride / elementBytes, normalized);
        } else {
          if (bufferView === null) {
            array = new TypedArray(accessorDef.count * itemSize);
          } else {
            array = new TypedArray(bufferView, byteOffset, accessorDef.count * itemSize);
          }
          bufferAttribute = new THREE.BufferAttribute(array, itemSize, normalized);
        }

        // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#sparse-accessors
        if (accessorDef.sparse !== undefined) {
          var itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
          var TypedArrayIndices = WEBGL_COMPONENT_TYPES[accessorDef.sparse.indices.componentType];
          var byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
          var byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
          var sparseIndices = new TypedArrayIndices(bufferViews[1], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices);
          var sparseValues = new TypedArray(bufferViews[2], byteOffsetValues, accessorDef.sparse.count * itemSize);
          if (bufferView !== null) {
            // Avoid modifying the original ArrayBuffer, if the bufferView wasn't initialized with zeroes.
            bufferAttribute = new THREE.BufferAttribute(bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized);
          }
          for (var i = 0, il = sparseIndices.length; i < il; i++) {
            var index = sparseIndices[i];
            bufferAttribute.setX(index, sparseValues[i * itemSize]);
            if (itemSize >= 2) bufferAttribute.setY(index, sparseValues[i * itemSize + 1]);
            if (itemSize >= 3) bufferAttribute.setZ(index, sparseValues[i * itemSize + 2]);
            if (itemSize >= 4) bufferAttribute.setW(index, sparseValues[i * itemSize + 3]);
            if (itemSize >= 5) throw new Error('THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.');
          }
        }
        return bufferAttribute;
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
     * @param {number} textureIndex
     * @return {Promise<THREE.Texture>}
     */
    loadTexture(textureIndex) {
      var json = this.json;
      var options = this.options;
      var textureDef = json.textures[textureIndex];
      var source = json.images[textureDef.source];
      var loader = this.textureLoader;
      if (source.uri) {
        var handler = options.manager.getHandler(source.uri);
        if (handler !== null) loader = handler;
      }
      return this.loadTextureImage(textureIndex, source, loader);
    }
    loadTextureImage(textureIndex, source, loader) {
      var parser = this;
      var json = this.json;
      var options = this.options;
      var textureDef = json.textures[textureIndex];
      var cacheKey = (source.uri || source.bufferView) + ':' + textureDef.sampler;
      if (this.textureCache[cacheKey]) {
        // See https://github.com/mrdoob/three.js/issues/21559.
        return this.textureCache[cacheKey];
      }
      var URL = self.URL || self.webkitURL;
      var sourceURI = source.uri || '';
      var isObjectURL = false;
      if (source.bufferView !== undefined) {
        // Load binary image data from bufferView, if provided.

        sourceURI = parser.getDependency('bufferView', source.bufferView).then(function (bufferView) {
          isObjectURL = true;
          var blob = new Blob([bufferView], {
            type: source.mimeType
          });
          sourceURI = URL.createObjectURL(blob);
          return sourceURI;
        });
      } else if (source.uri === undefined) {
        throw new Error('THREE.GLTFLoader: Image ' + textureIndex + ' is missing URI and bufferView');
      }
      var promise = Promise.resolve(sourceURI).then(function (sourceURI) {
        return new Promise(function (resolve, reject) {
          var onLoad = resolve;
          if (loader.isImageBitmapLoader === true) {
            onLoad = function (imageBitmap) {
              var texture = new THREE.Texture(imageBitmap);
              texture.needsUpdate = true;
              resolve(texture);
            };
          }
          loader.load(THREE.LoaderUtils.resolveURL(sourceURI, options.path), onLoad, undefined, reject);
        });
      }).then(function (texture) {
        // Clean up resources and configure Texture.

        if (isObjectURL === true) {
          URL.revokeObjectURL(sourceURI);
        }
        texture.flipY = false;
        if (textureDef.name) texture.name = textureDef.name;
        var samplers = json.samplers || {};
        var sampler = samplers[textureDef.sampler] || {};
        texture.magFilter = WEBGL_FILTERS[sampler.magFilter] || THREE.LinearFilter;
        texture.minFilter = WEBGL_FILTERS[sampler.minFilter] || THREE.LinearMipmapLinearFilter;
        texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS] || THREE.RepeatWrapping;
        texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT] || THREE.RepeatWrapping;
        parser.associations.set(texture, {
          textures: textureIndex
        });
        return texture;
      }).catch(function () {
        console.error('THREE.GLTFLoader: Couldn\'t load texture', sourceURI);
        return null;
      });
      this.textureCache[cacheKey] = promise;
      return promise;
    }

    /**
     * Asynchronously assigns a texture to the given material parameters.
     * @param {Object} materialParams
     * @param {string} mapName
     * @param {Object} mapDef
     * @return {Promise<Texture>}
     */
    assignTexture(materialParams, mapName, mapDef) {
      var parser = this;
      return this.getDependency('texture', mapDef.index).then(function (texture) {
        // Materials sample aoMap from UV set 1 and other maps from UV set 0 - this can't be configured
        // However, we will copy UV set 0 to UV set 1 on demand for aoMap
        if (mapDef.texCoord !== undefined && mapDef.texCoord != 0 && !(mapName === 'aoMap' && mapDef.texCoord == 1)) {
          console.warn('THREE.GLTFLoader: Custom UV set ' + mapDef.texCoord + ' for texture ' + mapName + ' not yet supported.');
        }
        if (parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM]) {
          var transform = mapDef.extensions !== undefined ? mapDef.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM] : undefined;
          if (transform) {
            var gltfReference = parser.associations.get(texture);
            texture = parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM].extendTexture(texture, transform);
            parser.associations.set(texture, gltfReference);
          }
        }
        materialParams[mapName] = texture;
        return texture;
      });
    }

    /**
     * Assigns final material to a Mesh, Line, or Points instance. The instance
     * already has a material (generated from the glTF material options alone)
     * but reuse of the same glTF material may require multiple threejs materials
     * to accommodate different primitive types, defines, etc. New materials will
     * be created if necessary, and reused from a cache.
     * @param  {Object3D} mesh Mesh, Line, or Points instance.
     */
    assignFinalMaterial(mesh) {
      var geometry = mesh.geometry;
      var material = mesh.material;
      var useDerivativeTangents = geometry.attributes.tangent === undefined;
      var useVertexColors = geometry.attributes.color !== undefined;
      var useFlatShading = geometry.attributes.normal === undefined;
      if (mesh.isPoints) {
        var cacheKey = 'PointsMaterial:' + material.uuid;
        var pointsMaterial = this.cache.get(cacheKey);
        if (!pointsMaterial) {
          pointsMaterial = new THREE.PointsMaterial();
          THREE.Material.prototype.copy.call(pointsMaterial, material);
          pointsMaterial.color.copy(material.color);
          pointsMaterial.map = material.map;
          pointsMaterial.sizeAttenuation = false; // glTF spec says points should be 1px

          this.cache.add(cacheKey, pointsMaterial);
        }
        material = pointsMaterial;
      } else if (mesh.isLine) {
        var _cacheKey = 'LineBasicMaterial:' + material.uuid;
        var lineMaterial = this.cache.get(_cacheKey);
        if (!lineMaterial) {
          lineMaterial = new THREE.LineBasicMaterial();
          THREE.Material.prototype.copy.call(lineMaterial, material);
          lineMaterial.color.copy(material.color);
          this.cache.add(_cacheKey, lineMaterial);
        }
        material = lineMaterial;
      }

      // Clone the material if it will be modified
      if (useDerivativeTangents || useVertexColors || useFlatShading) {
        var _cacheKey2 = 'ClonedMaterial:' + material.uuid + ':';
        if (material.isGLTFSpecularGlossinessMaterial) _cacheKey2 += 'specular-glossiness:';
        if (useDerivativeTangents) _cacheKey2 += 'derivative-tangents:';
        if (useVertexColors) _cacheKey2 += 'vertex-colors:';
        if (useFlatShading) _cacheKey2 += 'flat-shading:';
        var cachedMaterial = this.cache.get(_cacheKey2);
        if (!cachedMaterial) {
          cachedMaterial = material.clone();
          if (useVertexColors) cachedMaterial.vertexColors = true;
          if (useFlatShading) cachedMaterial.flatShading = true;
          if (useDerivativeTangents) {
            // https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
            if (cachedMaterial.normalScale) cachedMaterial.normalScale.y *= -1;
            if (cachedMaterial.clearcoatNormalScale) cachedMaterial.clearcoatNormalScale.y *= -1;
          }
          this.cache.add(_cacheKey2, cachedMaterial);
          this.associations.set(cachedMaterial, this.associations.get(material));
        }
        material = cachedMaterial;
      }

      // workarounds for mesh and geometry

      if (material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined) {
        geometry.setAttribute('uv2', geometry.attributes.uv);
      }
      mesh.material = material;
    }
    getMaterialType( /* materialIndex */
    ) {
      return THREE.MeshStandardMaterial;
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
     * @param {number} materialIndex
     * @return {Promise<Material>}
     */
    loadMaterial(materialIndex) {
      var parser = this;
      var json = this.json;
      var extensions = this.extensions;
      var materialDef = json.materials[materialIndex];
      var materialType;
      var materialParams = {};
      var materialExtensions = materialDef.extensions || {};
      var pending = [];
      if (materialExtensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]) {
        var sgExtension = extensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS];
        materialType = sgExtension.getMaterialType();
        pending.push(sgExtension.extendParams(materialParams, materialDef, parser));
      } else if (materialExtensions[EXTENSIONS.KHR_MATERIALS_UNLIT]) {
        var kmuExtension = extensions[EXTENSIONS.KHR_MATERIALS_UNLIT];
        materialType = kmuExtension.getMaterialType();
        pending.push(kmuExtension.extendParams(materialParams, materialDef, parser));
      } else {
        // Specification:
        // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#metallic-roughness-material

        var metallicRoughness = materialDef.pbrMetallicRoughness || {};
        materialParams.color = new THREE.Color(1.0, 1.0, 1.0);
        materialParams.opacity = 1.0;
        if (Array.isArray(metallicRoughness.baseColorFactor)) {
          var array = metallicRoughness.baseColorFactor;
          materialParams.color.fromArray(array);
          materialParams.opacity = array[3];
        }
        if (metallicRoughness.baseColorTexture !== undefined) {
          pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture));
        }
        materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
        materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;
        if (metallicRoughness.metallicRoughnessTexture !== undefined) {
          pending.push(parser.assignTexture(materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture));
          pending.push(parser.assignTexture(materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture));
        }
        materialType = this._invokeOne(function (ext) {
          return ext.getMaterialType && ext.getMaterialType(materialIndex);
        });
        pending.push(Promise.all(this._invokeAll(function (ext) {
          return ext.extendMaterialParams && ext.extendMaterialParams(materialIndex, materialParams);
        })));
      }
      if (materialDef.doubleSided === true) {
        materialParams.side = THREE.DoubleSide;
      }
      var alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;
      if (alphaMode === ALPHA_MODES.BLEND) {
        materialParams.transparent = true;

        // See: https://github.com/mrdoob/three.js/issues/17706
        materialParams.depthWrite = false;
      } else {
        materialParams.format = THREE.RGBFormat;
        materialParams.transparent = false;
        if (alphaMode === ALPHA_MODES.MASK) {
          materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;
        }
      }
      if (materialDef.normalTexture !== undefined && materialType !== THREE.MeshBasicMaterial) {
        pending.push(parser.assignTexture(materialParams, 'normalMap', materialDef.normalTexture));
        materialParams.normalScale = new THREE.Vector2(1, 1);
        if (materialDef.normalTexture.scale !== undefined) {
          var scale = materialDef.normalTexture.scale;
          materialParams.normalScale.set(scale, scale);
        }
      }
      if (materialDef.occlusionTexture !== undefined && materialType !== THREE.MeshBasicMaterial) {
        pending.push(parser.assignTexture(materialParams, 'aoMap', materialDef.occlusionTexture));
        if (materialDef.occlusionTexture.strength !== undefined) {
          materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;
        }
      }
      if (materialDef.emissiveFactor !== undefined && materialType !== THREE.MeshBasicMaterial) {
        materialParams.emissive = new THREE.Color().fromArray(materialDef.emissiveFactor);
      }
      if (materialDef.emissiveTexture !== undefined && materialType !== THREE.MeshBasicMaterial) {
        pending.push(parser.assignTexture(materialParams, 'emissiveMap', materialDef.emissiveTexture));
      }
      return Promise.all(pending).then(function () {
        var material;
        if (materialType === GLTFMeshStandardSGMaterial) {
          material = extensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS].createMaterial(materialParams);
        } else {
          material = new materialType(materialParams);
        }
        if (materialDef.name) material.name = materialDef.name;

        // baseColorTexture, emissiveTexture, and specularGlossinessTexture use sRGB encoding.
        if (material.map) material.map.encoding = THREE.sRGBEncoding;
        if (material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;
        assignExtrasToUserData(material, materialDef);
        parser.associations.set(material, {
          materials: materialIndex
        });
        if (materialDef.extensions) addUnknownExtensionsToUserData(extensions, material, materialDef);
        return material;
      });
    }

    /** When Object3D instances are targeted by animation, they need unique names. */
    createUniqueName(originalName) {
      var sanitizedName = THREE.PropertyBinding.sanitizeNodeName(originalName || '');
      var name = sanitizedName;
      for (var i = 1; this.nodeNamesUsed[name]; ++i) {
        name = sanitizedName + '_' + i;
      }
      this.nodeNamesUsed[name] = true;
      return name;
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
     *
     * Creates BufferGeometries from primitives.
     *
     * @param {Array<GLTF.Primitive>} primitives
     * @return {Promise<Array<BufferGeometry>>}
     */
    loadGeometries(primitives) {
      var parser = this;
      var extensions = this.extensions;
      var cache = this.primitiveCache;
      function createDracoPrimitive(primitive) {
        return extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(primitive, parser).then(function (geometry) {
          return addPrimitiveAttributes(geometry, primitive, parser);
        });
      }
      var pending = [];
      for (var i = 0, il = primitives.length; i < il; i++) {
        var primitive = primitives[i];
        var cacheKey = createPrimitiveKey(primitive);

        // See if we've already created this geometry
        var cached = cache[cacheKey];
        if (cached) {
          // Use the cached geometry if it exists
          pending.push(cached.promise);
        } else {
          var geometryPromise = void 0;
          if (primitive.extensions && primitive.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION]) {
            // Use DRACO geometry if available
            geometryPromise = createDracoPrimitive(primitive);
          } else {
            // Otherwise create a new geometry
            geometryPromise = addPrimitiveAttributes(new THREE.BufferGeometry(), primitive, parser);
          }

          // Cache this geometry
          cache[cacheKey] = {
            primitive: primitive,
            promise: geometryPromise
          };
          pending.push(geometryPromise);
        }
      }
      return Promise.all(pending);
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
     * @param {number} meshIndex
     * @return {Promise<Group|Mesh|SkinnedMesh>}
     */
    loadMesh(meshIndex) {
      var parser = this;
      var json = this.json;
      var extensions = this.extensions;
      var meshDef = json.meshes[meshIndex];
      var primitives = meshDef.primitives;
      var pending = [];
      for (var i = 0, il = primitives.length; i < il; i++) {
        var material = primitives[i].material === undefined ? createDefaultMaterial(this.cache) : this.getDependency('material', primitives[i].material);
        pending.push(material);
      }
      pending.push(parser.loadGeometries(primitives));
      return Promise.all(pending).then(function (results) {
        var materials = results.slice(0, results.length - 1);
        var geometries = results[results.length - 1];
        var meshes = [];
        for (var _i4 = 0, _il3 = geometries.length; _i4 < _il3; _i4++) {
          var geometry = geometries[_i4];
          var primitive = primitives[_i4];

          // 1. create Mesh

          var mesh = void 0;
          var _material = materials[_i4];
          if (primitive.mode === WEBGL_CONSTANTS.TRIANGLES || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN || primitive.mode === undefined) {
            // .isSkinnedMesh isn't in glTF spec. See ._markDefs()
            mesh = meshDef.isSkinnedMesh === true ? new THREE.SkinnedMesh(geometry, _material) : new THREE.Mesh(geometry, _material);
            if (mesh.isSkinnedMesh === true && !mesh.geometry.attributes.skinWeight.normalized) {
              // we normalize floating point skin weight array to fix malformed assets (see #15319)
              // it's important to skip this for non-float32 data since normalizeSkinWeights assumes non-normalized inputs
              mesh.normalizeSkinWeights();
            }
            if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP) {
              mesh.geometry = toTrianglesDrawMode(mesh.geometry, THREE.TriangleStripDrawMode);
            } else if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN) {
              mesh.geometry = toTrianglesDrawMode(mesh.geometry, THREE.TriangleFanDrawMode);
            }
          } else if (primitive.mode === WEBGL_CONSTANTS.LINES) {
            mesh = new THREE.LineSegments(geometry, _material);
          } else if (primitive.mode === WEBGL_CONSTANTS.LINE_STRIP) {
            mesh = new THREE.Line(geometry, _material);
          } else if (primitive.mode === WEBGL_CONSTANTS.LINE_LOOP) {
            mesh = new THREE.LineLoop(geometry, _material);
          } else if (primitive.mode === WEBGL_CONSTANTS.POINTS) {
            mesh = new THREE.Points(geometry, _material);
          } else {
            throw new Error('THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode);
          }
          if (Object.keys(mesh.geometry.morphAttributes).length > 0) {
            updateMorphTargets(mesh, meshDef);
          }
          mesh.name = parser.createUniqueName(meshDef.name || 'mesh_' + meshIndex);
          assignExtrasToUserData(mesh, meshDef);
          if (primitive.extensions) addUnknownExtensionsToUserData(extensions, mesh, primitive);
          parser.assignFinalMaterial(mesh);
          meshes.push(mesh);
        }
        for (var _i5 = 0, _il4 = meshes.length; _i5 < _il4; _i5++) {
          parser.associations.set(meshes[_i5], {
            meshes: meshIndex,
            primitives: _i5
          });
        }
        if (meshes.length === 1) {
          return meshes[0];
        }
        var group = new THREE.Group();
        parser.associations.set(group, {
          meshes: meshIndex
        });
        for (var _i6 = 0, _il5 = meshes.length; _i6 < _il5; _i6++) {
          group.add(meshes[_i6]);
        }
        return group;
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
     * @param {number} cameraIndex
     * @return {Promise<THREE.Camera>}
     */
    loadCamera(cameraIndex) {
      var camera;
      var cameraDef = this.json.cameras[cameraIndex];
      var params = cameraDef[cameraDef.type];
      if (!params) {
        console.warn('THREE.GLTFLoader: Missing camera parameters.');
        return;
      }
      if (cameraDef.type === 'perspective') {
        camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(params.yfov), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6);
      } else if (cameraDef.type === 'orthographic') {
        camera = new THREE.OrthographicCamera(-params.xmag, params.xmag, params.ymag, -params.ymag, params.znear, params.zfar);
      }
      if (cameraDef.name) camera.name = this.createUniqueName(cameraDef.name);
      assignExtrasToUserData(camera, cameraDef);
      return Promise.resolve(camera);
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
     * @param {number} skinIndex
     * @return {Promise<Object>}
     */
    loadSkin(skinIndex) {
      var skinDef = this.json.skins[skinIndex];
      var skinEntry = {
        joints: skinDef.joints
      };
      if (skinDef.inverseBindMatrices === undefined) {
        return Promise.resolve(skinEntry);
      }
      return this.getDependency('accessor', skinDef.inverseBindMatrices).then(function (accessor) {
        skinEntry.inverseBindMatrices = accessor;
        return skinEntry;
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
     * @param {number} animationIndex
     * @return {Promise<AnimationClip>}
     */
    loadAnimation(animationIndex) {
      var json = this.json;
      var animationDef = json.animations[animationIndex];
      var pendingNodes = [];
      var pendingInputAccessors = [];
      var pendingOutputAccessors = [];
      var pendingSamplers = [];
      var pendingTargets = [];
      for (var i = 0, il = animationDef.channels.length; i < il; i++) {
        var channel = animationDef.channels[i];
        var sampler = animationDef.samplers[channel.sampler];
        var target = channel.target;
        var name = target.node !== undefined ? target.node : target.id; // NOTE: target.id is deprecated.
        var input = animationDef.parameters !== undefined ? animationDef.parameters[sampler.input] : sampler.input;
        var output = animationDef.parameters !== undefined ? animationDef.parameters[sampler.output] : sampler.output;
        pendingNodes.push(this.getDependency('node', name));
        pendingInputAccessors.push(this.getDependency('accessor', input));
        pendingOutputAccessors.push(this.getDependency('accessor', output));
        pendingSamplers.push(sampler);
        pendingTargets.push(target);
      }
      return Promise.all([Promise.all(pendingNodes), Promise.all(pendingInputAccessors), Promise.all(pendingOutputAccessors), Promise.all(pendingSamplers), Promise.all(pendingTargets)]).then(function (dependencies) {
        var nodes = dependencies[0];
        var inputAccessors = dependencies[1];
        var outputAccessors = dependencies[2];
        var samplers = dependencies[3];
        var targets = dependencies[4];
        var tracks = [];
        var _loop = function (_i7, _il6) {
          var node = nodes[_i7];
          var inputAccessor = inputAccessors[_i7];
          var outputAccessor = outputAccessors[_i7];
          var sampler = samplers[_i7];
          var target = targets[_i7];
          if (node === undefined) return "continue";
          node.updateMatrix();
          node.matrixAutoUpdate = true;
          var TypedKeyframeTrack = void 0;
          switch (PATH_PROPERTIES[target.path]) {
            case PATH_PROPERTIES.weights:
              TypedKeyframeTrack = THREE.NumberKeyframeTrack;
              break;
            case PATH_PROPERTIES.rotation:
              TypedKeyframeTrack = THREE.QuaternionKeyframeTrack;
              break;
            case PATH_PROPERTIES.position:
            case PATH_PROPERTIES.scale:
            default:
              TypedKeyframeTrack = THREE.VectorKeyframeTrack;
              break;
          }
          var targetName = node.name ? node.name : node.uuid;
          var interpolation = sampler.interpolation !== undefined ? INTERPOLATION[sampler.interpolation] : THREE.InterpolateLinear;
          var targetNames = [];
          if (PATH_PROPERTIES[target.path] === PATH_PROPERTIES.weights) {
            // Node may be a Group (glTF mesh with several primitives) or a Mesh.
            node.traverse(function (object) {
              if (object.isMesh === true && object.morphTargetInfluences) {
                targetNames.push(object.name ? object.name : object.uuid);
              }
            });
          } else {
            targetNames.push(targetName);
          }
          var outputArray = outputAccessor.array;
          if (outputAccessor.normalized) {
            var scale = getNormalizedComponentScale(outputArray.constructor);
            var scaled = new Float32Array(outputArray.length);
            for (var j = 0, jl = outputArray.length; j < jl; j++) {
              scaled[j] = outputArray[j] * scale;
            }
            outputArray = scaled;
          }
          for (var _j = 0, _jl = targetNames.length; _j < _jl; _j++) {
            var track = new TypedKeyframeTrack(targetNames[_j] + '.' + PATH_PROPERTIES[target.path], inputAccessor.array, outputArray, interpolation);

            // Override interpolation with custom factory method.
            if (sampler.interpolation === 'CUBICSPLINE') {
              track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline(result) {
                // A CUBICSPLINE keyframe in glTF has three output values for each input value,
                // representing inTangent, splineVertex, and outTangent. As a result, track.getValueSize()
                // must be divided by three to get the interpolant's sampleSize argument.

                var interpolantType = this instanceof THREE.QuaternionKeyframeTrack ? GLTFCubicSplineQuaternionInterpolant : GLTFCubicSplineInterpolant;
                return new interpolantType(this.times, this.values, this.getValueSize() / 3, result);
              };

              // Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.
              track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;
            }
            tracks.push(track);
          }
        };
        for (var _i7 = 0, _il6 = nodes.length; _i7 < _il6; _i7++) {
          var _ret = _loop(_i7);
          if (_ret === "continue") continue;
        }
        var name = animationDef.name ? animationDef.name : 'animation_' + animationIndex;
        return new THREE.AnimationClip(name, undefined, tracks);
      });
    }
    createNodeMesh(nodeIndex) {
      var json = this.json;
      var parser = this;
      var nodeDef = json.nodes[nodeIndex];
      if (nodeDef.mesh === undefined) return null;
      return parser.getDependency('mesh', nodeDef.mesh).then(function (mesh) {
        var node = parser._getNodeRef(parser.meshCache, nodeDef.mesh, mesh);

        // if weights are provided on the node, override weights on the mesh.
        if (nodeDef.weights !== undefined) {
          node.traverse(function (o) {
            if (!o.isMesh) return;
            for (var i = 0, il = nodeDef.weights.length; i < il; i++) {
              o.morphTargetInfluences[i] = nodeDef.weights[i];
            }
          });
        }
        return node;
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
     * @param {number} nodeIndex
     * @return {Promise<Object3D>}
     */
    loadNode(nodeIndex) {
      var json = this.json;
      var extensions = this.extensions;
      var parser = this;
      var nodeDef = json.nodes[nodeIndex];

      // reserve node's name before its dependencies, so the root has the intended name.
      var nodeName = nodeDef.name ? parser.createUniqueName(nodeDef.name) : '';
      return function () {
        var pending = [];
        var meshPromise = parser._invokeOne(function (ext) {
          return ext.createNodeMesh && ext.createNodeMesh(nodeIndex);
        });
        if (meshPromise) {
          pending.push(meshPromise);
        }
        if (nodeDef.camera !== undefined) {
          pending.push(parser.getDependency('camera', nodeDef.camera).then(function (camera) {
            return parser._getNodeRef(parser.cameraCache, nodeDef.camera, camera);
          }));
        }
        parser._invokeAll(function (ext) {
          return ext.createNodeAttachment && ext.createNodeAttachment(nodeIndex);
        }).forEach(function (promise) {
          pending.push(promise);
        });
        return Promise.all(pending);
      }().then(function (objects) {
        var node;

        // .isBone isn't in glTF spec. See ._markDefs
        if (nodeDef.isBone === true) {
          node = new THREE.Bone();
        } else if (objects.length > 1) {
          node = new THREE.Group();
        } else if (objects.length === 1) {
          node = objects[0];
        } else {
          node = new THREE.Object3D();
        }
        if (node !== objects[0]) {
          for (var i = 0, il = objects.length; i < il; i++) {
            node.add(objects[i]);
          }
        }
        if (nodeDef.name) {
          node.userData.name = nodeDef.name;
          node.name = nodeName;
        }
        assignExtrasToUserData(node, nodeDef);
        if (nodeDef.extensions) addUnknownExtensionsToUserData(extensions, node, nodeDef);
        if (nodeDef.matrix !== undefined) {
          var matrix = new THREE.Matrix4();
          matrix.fromArray(nodeDef.matrix);
          node.applyMatrix4(matrix);
        } else {
          if (nodeDef.translation !== undefined) {
            node.position.fromArray(nodeDef.translation);
          }
          if (nodeDef.rotation !== undefined) {
            node.quaternion.fromArray(nodeDef.rotation);
          }
          if (nodeDef.scale !== undefined) {
            node.scale.fromArray(nodeDef.scale);
          }
        }
        if (!parser.associations.has(node)) {
          parser.associations.set(node, {});
        }
        parser.associations.get(node).nodes = nodeIndex;
        return node;
      });
    }

    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
     * @param {number} sceneIndex
     * @return {Promise<Group>}
     */
    loadScene(sceneIndex) {
      var json = this.json;
      var extensions = this.extensions;
      var sceneDef = this.json.scenes[sceneIndex];
      var parser = this;

      // Loader returns Group, not Scene.
      // See: https://github.com/mrdoob/three.js/issues/18342#issuecomment-578981172
      var scene = new THREE.Group();
      if (sceneDef.name) scene.name = parser.createUniqueName(sceneDef.name);
      assignExtrasToUserData(scene, sceneDef);
      if (sceneDef.extensions) addUnknownExtensionsToUserData(extensions, scene, sceneDef);
      var nodeIds = sceneDef.nodes || [];
      var pending = [];
      for (var i = 0, il = nodeIds.length; i < il; i++) {
        pending.push(buildNodeHierarchy(nodeIds[i], scene, json, parser));
      }
      return Promise.all(pending).then(function () {
        // Removes dangling associations, associations that reference a node that
        // didn't make it into the scene.
        var reduceAssociations = node => {
          var reducedAssociations = new Map();
          for (var [key, value] of parser.associations) {
            if (key instanceof THREE.Material || key instanceof THREE.Texture) {
              reducedAssociations.set(key, value);
            }
          }
          node.traverse(node => {
            var mappings = parser.associations.get(node);
            if (mappings != null) {
              reducedAssociations.set(node, mappings);
            }
          });
          return reducedAssociations;
        };
        parser.associations = reduceAssociations(scene);
        return scene;
      });
    }
  }
  function buildNodeHierarchy(nodeId, parentObject, json, parser) {
    var nodeDef = json.nodes[nodeId];
    return parser.getDependency('node', nodeId).then(function (node) {
      if (nodeDef.skin === undefined) return node;

      // build skeleton here as well

      var skinEntry;
      return parser.getDependency('skin', nodeDef.skin).then(function (skin) {
        skinEntry = skin;
        var pendingJoints = [];
        for (var i = 0, il = skinEntry.joints.length; i < il; i++) {
          pendingJoints.push(parser.getDependency('node', skinEntry.joints[i]));
        }
        return Promise.all(pendingJoints);
      }).then(function (jointNodes) {
        node.traverse(function (mesh) {
          if (!mesh.isMesh) return;
          var bones = [];
          var boneInverses = [];
          for (var j = 0, jl = jointNodes.length; j < jl; j++) {
            var jointNode = jointNodes[j];
            if (jointNode) {
              bones.push(jointNode);
              var mat = new THREE.Matrix4();
              if (skinEntry.inverseBindMatrices !== undefined) {
                mat.fromArray(skinEntry.inverseBindMatrices.array, j * 16);
              }
              boneInverses.push(mat);
            } else {
              console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[j]);
            }
          }
          mesh.bind(new THREE.Skeleton(bones, boneInverses), mesh.matrixWorld);
        });
        return node;
      });
    }).then(function (node) {
      // build node hierachy

      parentObject.add(node);
      var pending = [];
      if (nodeDef.children) {
        var children = nodeDef.children;
        for (var i = 0, il = children.length; i < il; i++) {
          var child = children[i];
          pending.push(buildNodeHierarchy(child, node, json, parser));
        }
      }
      return Promise.all(pending);
    });
  }

  /**
   * @param {BufferGeometry} geometry
   * @param {GLTF.Primitive} primitiveDef
   * @param {GLTFParser} parser
   */
  function computeBounds(geometry, primitiveDef, parser) {
    var attributes = primitiveDef.attributes;
    var box = new THREE.Box3();
    if (attributes.POSITION !== undefined) {
      var accessor = parser.json.accessors[attributes.POSITION];
      var min = accessor.min;
      var max = accessor.max;

      // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

      if (min !== undefined && max !== undefined) {
        box.set(new THREE.Vector3(min[0], min[1], min[2]), new THREE.Vector3(max[0], max[1], max[2]));
        if (accessor.normalized) {
          var boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);
          box.min.multiplyScalar(boxScale);
          box.max.multiplyScalar(boxScale);
        }
      } else {
        console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');
        return;
      }
    } else {
      return;
    }
    var targets = primitiveDef.targets;
    if (targets !== undefined) {
      var maxDisplacement = new THREE.Vector3();
      var vector = new THREE.Vector3();
      for (var i = 0, il = targets.length; i < il; i++) {
        var target = targets[i];
        if (target.POSITION !== undefined) {
          var _accessor = parser.json.accessors[target.POSITION];
          var _min = _accessor.min;
          var _max = _accessor.max;

          // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

          if (_min !== undefined && _max !== undefined) {
            // we need to get max of absolute components because target weight is [-1,1]
            vector.setX(Math.max(Math.abs(_min[0]), Math.abs(_max[0])));
            vector.setY(Math.max(Math.abs(_min[1]), Math.abs(_max[1])));
            vector.setZ(Math.max(Math.abs(_min[2]), Math.abs(_max[2])));
            if (_accessor.normalized) {
              var _boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[_accessor.componentType]);
              vector.multiplyScalar(_boxScale);
            }

            // Note: this assumes that the sum of all weights is at most 1. This isn't quite correct - it's more conservative
            // to assume that each target can have a max weight of 1. However, for some use cases - notably, when morph targets
            // are used to implement key-frame animations and as such only two are active at a time - this results in very large
            // boxes. So for now we make a box that's sometimes a touch too small but is hopefully mostly of reasonable size.
            maxDisplacement.max(vector);
          } else {
            console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');
          }
        }
      }

      // As per comment above this box isn't conservative, but has a reasonable size for a very large number of morph targets.
      box.expandByVector(maxDisplacement);
    }
    geometry.boundingBox = box;
    var sphere = new THREE.Sphere();
    box.getCenter(sphere.center);
    sphere.radius = box.min.distanceTo(box.max) / 2;
    geometry.boundingSphere = sphere;
  }

  /**
   * @param {BufferGeometry} geometry
   * @param {GLTF.Primitive} primitiveDef
   * @param {GLTFParser} parser
   * @return {Promise<BufferGeometry>}
   */
  function addPrimitiveAttributes(geometry, primitiveDef, parser) {
    var attributes = primitiveDef.attributes;
    var pending = [];
    function assignAttributeAccessor(accessorIndex, attributeName) {
      return parser.getDependency('accessor', accessorIndex).then(function (accessor) {
        geometry.setAttribute(attributeName, accessor);
      });
    }
    for (var gltfAttributeName in attributes) {
      var threeAttributeName = ATTRIBUTES[gltfAttributeName] || gltfAttributeName.toLowerCase();

      // Skip attributes already provided by e.g. Draco extension.
      if (threeAttributeName in geometry.attributes) continue;
      pending.push(assignAttributeAccessor(attributes[gltfAttributeName], threeAttributeName));
    }
    if (primitiveDef.indices !== undefined && !geometry.index) {
      var accessor = parser.getDependency('accessor', primitiveDef.indices).then(function (accessor) {
        geometry.setIndex(accessor);
      });
      pending.push(accessor);
    }
    assignExtrasToUserData(geometry, primitiveDef);
    computeBounds(geometry, primitiveDef, parser);
    return Promise.all(pending).then(function () {
      return primitiveDef.targets !== undefined ? addMorphTargets(geometry, primitiveDef.targets, parser) : geometry;
    });
  }

  /**
   * @param {BufferGeometry} geometry
   * @param {Number} drawMode
   * @return {BufferGeometry}
   */
  function toTrianglesDrawMode(geometry, drawMode) {
    var index = geometry.getIndex();

    // generate index if not present

    if (index === null) {
      var indices = [];
      var position = geometry.getAttribute('position');
      if (position !== undefined) {
        for (var i = 0; i < position.count; i++) {
          indices.push(i);
        }
        geometry.setIndex(indices);
        index = geometry.getIndex();
      } else {
        console.error('THREE.GLTFLoader.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.');
        return geometry;
      }
    }

    //

    var numberOfTriangles = index.count - 2;
    var newIndices = [];
    if (drawMode === THREE.TriangleFanDrawMode) {
      // gl.TRIANGLE_FAN

      for (var _i8 = 1; _i8 <= numberOfTriangles; _i8++) {
        newIndices.push(index.getX(0));
        newIndices.push(index.getX(_i8));
        newIndices.push(index.getX(_i8 + 1));
      }
    } else {
      // gl.TRIANGLE_STRIP

      for (var _i9 = 0; _i9 < numberOfTriangles; _i9++) {
        if (_i9 % 2 === 0) {
          newIndices.push(index.getX(_i9));
          newIndices.push(index.getX(_i9 + 1));
          newIndices.push(index.getX(_i9 + 2));
        } else {
          newIndices.push(index.getX(_i9 + 2));
          newIndices.push(index.getX(_i9 + 1));
          newIndices.push(index.getX(_i9));
        }
      }
    }
    if (newIndices.length / 3 !== numberOfTriangles) {
      console.error('THREE.GLTFLoader.toTrianglesDrawMode(): Unable to generate correct amount of triangles.');
    }

    // build final geometry

    var newGeometry = geometry.clone();
    newGeometry.setIndex(newIndices);
    return newGeometry;
  }

  var _taskCache = new WeakMap();
  class DRACOLoader extends THREE.Loader {
    constructor(manager) {
      super(manager);
      this.decoderPath = '';
      this.decoderConfig = {};
      this.decoderBinary = null;
      this.decoderPending = null;
      this.workerLimit = 4;
      this.workerPool = [];
      this.workerNextTaskID = 1;
      this.workerSourceURL = '';
      this.defaultAttributeIDs = {
        position: 'POSITION',
        normal: 'NORMAL',
        color: 'COLOR',
        uv: 'TEX_COORD'
      };
      this.defaultAttributeTypes = {
        position: 'Float32Array',
        normal: 'Float32Array',
        color: 'Float32Array',
        uv: 'Float32Array'
      };
    }
    setDecoderPath(path) {
      this.decoderPath = path;
      return this;
    }
    setDecoderConfig(config) {
      this.decoderConfig = config;
      return this;
    }
    setWorkerLimit(workerLimit) {
      this.workerLimit = workerLimit;
      return this;
    }
    load(url, onLoad, onProgress, onError) {
      var loader = new THREE.FileLoader(this.manager);
      loader.setPath(this.path);
      loader.setResponseType('arraybuffer');
      loader.setRequestHeader(this.requestHeader);
      loader.setWithCredentials(this.withCredentials);
      loader.load(url, buffer => {
        var taskConfig = {
          attributeIDs: this.defaultAttributeIDs,
          attributeTypes: this.defaultAttributeTypes,
          useUniqueIDs: false
        };
        this.decodeGeometry(buffer, taskConfig).then(onLoad).catch(onError);
      }, onProgress, onError);
    }

    /** @deprecated Kept for backward-compatibility with previous DRACOLoader versions. */
    decodeDracoFile(buffer, callback, attributeIDs, attributeTypes) {
      var taskConfig = {
        attributeIDs: attributeIDs || this.defaultAttributeIDs,
        attributeTypes: attributeTypes || this.defaultAttributeTypes,
        useUniqueIDs: !!attributeIDs
      };
      this.decodeGeometry(buffer, taskConfig).then(callback);
    }
    decodeGeometry(buffer, taskConfig) {
      // TODO: For backward-compatibility, support 'attributeTypes' objects containing
      // references (rather than names) to typed array constructors. These must be
      // serialized before sending them to the worker.
      for (var attribute in taskConfig.attributeTypes) {
        var type = taskConfig.attributeTypes[attribute];
        if (type.BYTES_PER_ELEMENT !== undefined) {
          taskConfig.attributeTypes[attribute] = type.name;
        }
      }

      //

      var taskKey = JSON.stringify(taskConfig);

      // Check for an existing task using this buffer. A transferred buffer cannot be transferred
      // again from this thread.
      if (_taskCache.has(buffer)) {
        var cachedTask = _taskCache.get(buffer);
        if (cachedTask.key === taskKey) {
          return cachedTask.promise;
        } else if (buffer.byteLength === 0) {
          // Technically, it would be possible to wait for the previous task to complete,
          // transfer the buffer back, and decode again with the second configuration. That
          // is complex, and I don't know of any reason to decode a Draco buffer twice in
          // different ways, so this is left unimplemented.
          throw new Error('THREE.DRACOLoader: Unable to re-decode a buffer with different ' + 'settings. Buffer has already been transferred.');
        }
      }

      //

      var worker;
      var taskID = this.workerNextTaskID++;
      var taskCost = buffer.byteLength;

      // Obtain a worker and assign a task, and construct a geometry instance
      // when the task completes.
      var geometryPending = this._getWorker(taskID, taskCost).then(_worker => {
        worker = _worker;
        return new Promise((resolve, reject) => {
          worker._callbacks[taskID] = {
            resolve,
            reject
          };
          worker.postMessage({
            type: 'decode',
            id: taskID,
            taskConfig,
            buffer
          }, [buffer]);

          // this.debug();
        });
      }).then(message => this._createGeometry(message.geometry));

      // Remove task from the task list.
      // Note: replaced '.finally()' with '.catch().then()' block - iOS 11 support (#19416)
      geometryPending.catch(() => true).then(() => {
        if (worker && taskID) {
          this._releaseTask(worker, taskID);

          // this.debug();
        }
      });

      // Cache the task result.
      _taskCache.set(buffer, {
        key: taskKey,
        promise: geometryPending
      });
      return geometryPending;
    }
    _createGeometry(geometryData) {
      var geometry = new THREE.BufferGeometry();
      if (geometryData.index) {
        geometry.setIndex(new THREE.BufferAttribute(geometryData.index.array, 1));
      }
      for (var i = 0; i < geometryData.attributes.length; i++) {
        var attribute = geometryData.attributes[i];
        var name = attribute.name;
        var array = attribute.array;
        var itemSize = attribute.itemSize;
        geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
      }
      return geometry;
    }
    _loadLibrary(url, responseType) {
      var loader = new THREE.FileLoader(this.manager);
      loader.setPath(this.decoderPath);
      loader.setResponseType(responseType);
      loader.setWithCredentials(this.withCredentials);
      return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    }
    preload() {
      this._initDecoder();
      return this;
    }
    _initDecoder() {
      if (this.decoderPending) return this.decoderPending;
      var useJS = typeof WebAssembly !== 'object' || this.decoderConfig.type === 'js';
      var librariesPending = [];
      if (useJS) {
        librariesPending.push(this._loadLibrary('draco_decoder.js', 'text'));
      } else {
        librariesPending.push(this._loadLibrary('draco_wasm_wrapper.js', 'text'));
        librariesPending.push(this._loadLibrary('draco_decoder.wasm', 'arraybuffer'));
      }
      this.decoderPending = Promise.all(librariesPending).then(libraries => {
        var jsContent = libraries[0];
        if (!useJS) {
          this.decoderConfig.wasmBinary = libraries[1];
        }
        var fn = DRACOWorker.toString();
        var body = ['/* draco decoder */', jsContent, '', '/* worker */', fn.substring(fn.indexOf('{') + 1, fn.lastIndexOf('}'))].join('\n');
        this.workerSourceURL = URL.createObjectURL(new Blob([body]));
      });
      return this.decoderPending;
    }
    _getWorker(taskID, taskCost) {
      return this._initDecoder().then(() => {
        if (this.workerPool.length < this.workerLimit) {
          var _worker2 = new Worker(this.workerSourceURL);
          _worker2._callbacks = {};
          _worker2._taskCosts = {};
          _worker2._taskLoad = 0;
          _worker2.postMessage({
            type: 'init',
            decoderConfig: this.decoderConfig
          });
          _worker2.onmessage = function (e) {
            var message = e.data;
            switch (message.type) {
              case 'decode':
                _worker2._callbacks[message.id].resolve(message);
                break;
              case 'error':
                _worker2._callbacks[message.id].reject(message);
                break;
              default:
                console.error('THREE.DRACOLoader: Unexpected message, "' + message.type + '"');
            }
          };
          this.workerPool.push(_worker2);
        } else {
          this.workerPool.sort(function (a, b) {
            return a._taskLoad > b._taskLoad ? -1 : 1;
          });
        }
        var worker = this.workerPool[this.workerPool.length - 1];
        worker._taskCosts[taskID] = taskCost;
        worker._taskLoad += taskCost;
        return worker;
      });
    }
    _releaseTask(worker, taskID) {
      worker._taskLoad -= worker._taskCosts[taskID];
      delete worker._callbacks[taskID];
      delete worker._taskCosts[taskID];
    }
    debug() {
      console.log('Task load: ', this.workerPool.map(worker => worker._taskLoad));
    }
    dispose() {
      for (var i = 0; i < this.workerPool.length; ++i) {
        this.workerPool[i].terminate();
      }
      this.workerPool.length = 0;
      return this;
    }
  }

  /* WEB WORKER */

  function DRACOWorker() {
    var decoderConfig;
    var decoderPending;
    onmessage = function (e) {
      var message = e.data;
      switch (message.type) {
        case 'init':
          decoderConfig = message.decoderConfig;
          decoderPending = new Promise(function (resolve /*, reject*/) {
            decoderConfig.onModuleLoaded = function (draco) {
              // Module is Promise-like. Wrap before resolving to avoid loop.
              resolve({
                draco: draco
              });
            };
            DracoDecoderModule(decoderConfig); // eslint-disable-line no-undef
          });

          break;
        case 'decode':
          var buffer = message.buffer;
          var taskConfig = message.taskConfig;
          decoderPending.then(module => {
            var draco = module.draco;
            var decoder = new draco.Decoder();
            var decoderBuffer = new draco.DecoderBuffer();
            decoderBuffer.Init(new Int8Array(buffer), buffer.byteLength);
            try {
              var geometry = decodeGeometry(draco, decoder, decoderBuffer, taskConfig);
              var buffers = geometry.attributes.map(attr => attr.array.buffer);
              if (geometry.index) buffers.push(geometry.index.array.buffer);
              self.postMessage({
                type: 'decode',
                id: message.id,
                geometry
              }, buffers);
            } catch (error) {
              console.error(error);
              self.postMessage({
                type: 'error',
                id: message.id,
                error: error.message
              });
            } finally {
              draco.destroy(decoderBuffer);
              draco.destroy(decoder);
            }
          });
          break;
      }
    };
    function decodeGeometry(draco, decoder, decoderBuffer, taskConfig) {
      var attributeIDs = taskConfig.attributeIDs;
      var attributeTypes = taskConfig.attributeTypes;
      var dracoGeometry;
      var decodingStatus;
      var geometryType = decoder.GetEncodedGeometryType(decoderBuffer);
      if (geometryType === draco.TRIANGULAR_MESH) {
        dracoGeometry = new draco.Mesh();
        decodingStatus = decoder.DecodeBufferToMesh(decoderBuffer, dracoGeometry);
      } else if (geometryType === draco.POINT_CLOUD) {
        dracoGeometry = new draco.PointCloud();
        decodingStatus = decoder.DecodeBufferToPointCloud(decoderBuffer, dracoGeometry);
      } else {
        throw new Error('THREE.DRACOLoader: Unexpected geometry type.');
      }
      if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
        throw new Error('THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg());
      }
      var geometry = {
        index: null,
        attributes: []
      };

      // Gather all vertex attributes.
      for (var attributeName in attributeIDs) {
        var attributeType = self[attributeTypes[attributeName]];
        var attribute = void 0;
        var attributeID = void 0;

        // A Draco file may be created with default vertex attributes, whose attribute IDs
        // are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
        // a Draco file may contain a custom set of attributes, identified by known unique
        // IDs. glTF files always do the latter, and `.drc` files typically do the former.
        if (taskConfig.useUniqueIDs) {
          attributeID = attributeIDs[attributeName];
          attribute = decoder.GetAttributeByUniqueId(dracoGeometry, attributeID);
        } else {
          attributeID = decoder.GetAttributeId(dracoGeometry, draco[attributeIDs[attributeName]]);
          if (attributeID === -1) continue;
          attribute = decoder.GetAttribute(dracoGeometry, attributeID);
        }
        geometry.attributes.push(decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute));
      }

      // Add index.
      if (geometryType === draco.TRIANGULAR_MESH) {
        geometry.index = decodeIndex(draco, decoder, dracoGeometry);
      }
      draco.destroy(dracoGeometry);
      return geometry;
    }
    function decodeIndex(draco, decoder, dracoGeometry) {
      var numFaces = dracoGeometry.num_faces();
      var numIndices = numFaces * 3;
      var byteLength = numIndices * 4;
      var ptr = draco._malloc(byteLength);
      decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
      var index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice();
      draco._free(ptr);
      return {
        array: index,
        itemSize: 1
      };
    }
    function decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute) {
      var numComponents = attribute.num_components();
      var numPoints = dracoGeometry.num_points();
      var numValues = numPoints * numComponents;
      var byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
      var dataType = getDracoDataType(draco, attributeType);
      var ptr = draco._malloc(byteLength);
      decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dataType, byteLength, ptr);
      var array = new attributeType(draco.HEAPF32.buffer, ptr, numValues).slice();
      draco._free(ptr);
      return {
        name: attributeName,
        array: array,
        itemSize: numComponents
      };
    }
    function getDracoDataType(draco, attributeType) {
      switch (attributeType) {
        case Float32Array:
          return draco.DT_FLOAT32;
        case Int8Array:
          return draco.DT_INT8;
        case Int16Array:
          return draco.DT_INT16;
        case Int32Array:
          return draco.DT_INT32;
        case Uint8Array:
          return draco.DT_UINT8;
        case Uint16Array:
          return draco.DT_UINT16;
        case Uint32Array:
          return draco.DT_UINT32;
      }
    }
  }

  /**
   * @author Deepkolos / https://github.com/deepkolos
   */

  class WorkerPool {
    constructor() {
      var pool = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 4;
      this.pool = pool;
      this.queue = [];
      this.workers = [];
      this.workersResolve = [];
      this.workerStatus = 0;
    }
    _initWorker(workerId) {
      if (!this.workers[workerId]) {
        var worker = this.workerCreator();
        worker.addEventListener('message', this._onMessage.bind(this, workerId));
        this.workers[workerId] = worker;
      }
    }
    _getIdleWorker() {
      for (var i = 0; i < this.pool; i++) {
        if (!(this.workerStatus & 1 << i)) return i;
      }
      return -1;
    }
    _onMessage(workerId, msg) {
      var resolve = this.workersResolve[workerId];
      resolve && resolve(msg);
      if (this.queue.length) {
        var {
          resolve: _resolve,
          msg: _msg,
          transfer
        } = this.queue.shift();
        this.workersResolve[workerId] = _resolve;
        this.workers[workerId].postMessage(_msg, transfer);
      } else {
        this.workerStatus ^= 1 << workerId;
      }
    }
    setWorkerCreator(workerCreator) {
      this.workerCreator = workerCreator;
    }
    setWorkerLimit(pool) {
      this.pool = pool;
    }
    postMessage(msg, transfer) {
      return new Promise(resolve => {
        var workerId = this._getIdleWorker();
        if (workerId !== -1) {
          this._initWorker(workerId);
          this.workerStatus |= 1 << workerId;
          this.workersResolve[workerId] = resolve;
          this.workers[workerId].postMessage(msg, transfer);
        } else {
          this.queue.push({
            resolve,
            msg,
            transfer
          });
        }
      });
    }
    dispose() {
      this.workers.forEach(worker => worker.terminate());
      this.workersResolve.length = 0;
      this.workers.length = 0;
      this.queue.length = 0;
      this.workerStatus = 0;
    }
  }

  /**
   * Loader for KTX 2.0 GPU Texture containers.
   *
   * KTX 2.0 is a container format for various GPU texture formats. The loader
   * supports Basis Universal GPU textures, which can be quickly transcoded to
   * a wide variety of GPU texture compression formats. While KTX 2.0 also allows
   * other hardware-specific formats, this loader does not yet parse them.
   *
   * References:
   * - KTX: http://github.khronos.org/KTX-Specification/
   * - DFD: https://www.khronos.org/registry/DataFormat/specs/1.3/dataformat.1.3.html#basicdescriptor
   */
  var KTX2TransferSRGB = 2;
  var KTX2_ALPHA_PREMULTIPLIED = 1;
  var _taskCache$1 = new WeakMap();
  var _activeLoaders = 0;
  class KTX2Loader extends THREE.Loader {
    constructor(manager) {
      super(manager);
      this.transcoderPath = '';
      this.transcoderBinary = null;
      this.transcoderPending = null;
      this.workerPool = new WorkerPool();
      this.workerSourceURL = '';
      this.workerConfig = null;
      if (typeof MSC_TRANSCODER !== 'undefined') {
        console.warn('THREE.KTX2Loader: Please update to latest "basis_transcoder".' + ' "msc_basis_transcoder" is no longer supported in three.js r125+.');
      }
    }
    setTranscoderPath(path) {
      this.transcoderPath = path;
      return this;
    }
    setWorkerLimit(num) {
      this.workerPool.setWorkerLimit(num);
      return this;
    }
    detectSupport(renderer) {
      this.workerConfig = {
        astcSupported: renderer.extensions.has('WEBGL_compressed_texture_astc'),
        etc1Supported: renderer.extensions.has('WEBGL_compressed_texture_etc1'),
        etc2Supported: renderer.extensions.has('WEBGL_compressed_texture_etc'),
        dxtSupported: renderer.extensions.has('WEBGL_compressed_texture_s3tc'),
        bptcSupported: renderer.extensions.has('EXT_texture_compression_bptc'),
        pvrtcSupported: renderer.extensions.has('WEBGL_compressed_texture_pvrtc') || renderer.extensions.has('WEBKIT_WEBGL_compressed_texture_pvrtc')
      };
      return this;
    }
    dispose() {
      this.workerPool.dispose();
      if (this.workerSourceURL) URL.revokeObjectURL(this.workerSourceURL);
      return this;
    }
    init() {
      if (!this.transcoderPending) {
        // Load transcoder wrapper.
        var jsLoader = new THREE.FileLoader(this.manager);
        jsLoader.setPath(this.transcoderPath);
        jsLoader.setWithCredentials(this.withCredentials);
        var jsContent = jsLoader.loadAsync('basis_transcoder.js');

        // Load transcoder WASM binary.
        var binaryLoader = new THREE.FileLoader(this.manager);
        binaryLoader.setPath(this.transcoderPath);
        binaryLoader.setResponseType('arraybuffer');
        binaryLoader.setWithCredentials(this.withCredentials);
        var binaryContent = binaryLoader.loadAsync('basis_transcoder.wasm');
        this.transcoderPending = Promise.all([jsContent, binaryContent]).then(_ref => {
          var [jsContent, binaryContent] = _ref;
          var fn = KTX2Loader.BasisWorker.toString();
          var body = ['/* constants */', 'let _EngineFormat = ' + JSON.stringify(KTX2Loader.EngineFormat), 'let _TranscoderFormat = ' + JSON.stringify(KTX2Loader.TranscoderFormat), 'let _BasisFormat = ' + JSON.stringify(KTX2Loader.BasisFormat), '/* basis_transcoder.js */', jsContent, '/* worker */', fn.substring(fn.indexOf('{') + 1, fn.lastIndexOf('}'))].join('\n');
          this.workerSourceURL = URL.createObjectURL(new Blob([body]));
          this.transcoderBinary = binaryContent;
          this.workerPool.setWorkerCreator(() => {
            var worker = new Worker(this.workerSourceURL);
            var transcoderBinary = this.transcoderBinary.slice(0);
            worker.postMessage({
              type: 'init',
              config: this.workerConfig,
              transcoderBinary
            }, [transcoderBinary]);
            return worker;
          });
        });
        if (_activeLoaders > 0) {
          // Each instance loads a transcoder and allocates workers, increasing network and memory cost.

          console.warn('THREE.KTX2Loader: Multiple active KTX2 loaders may cause performance issues.' + ' Use a single KTX2Loader instance, or call .dispose() on old instances.');
        }
        _activeLoaders++;
      }
      return this.transcoderPending;
    }
    load(url, onLoad, onProgress, onError) {
      if (this.workerConfig === null) {
        throw new Error('THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.');
      }
      var loader = new THREE.FileLoader(this.manager);
      loader.setResponseType('arraybuffer');
      loader.setWithCredentials(this.withCredentials);
      var texture = new THREE.CompressedTexture();
      loader.load(url, buffer => {
        // Check for an existing task using this buffer. A transferred buffer cannot be transferred
        // again from this thread.
        if (_taskCache$1.has(buffer)) {
          var cachedTask = _taskCache$1.get(buffer);
          return cachedTask.promise.then(onLoad).catch(onError);
        }
        this._createTexture([buffer]).then(function (_texture) {
          texture.copy(_texture);
          texture.needsUpdate = true;
          if (onLoad) onLoad(texture);
        }).catch(onError);
      }, onProgress, onError);
      return texture;
    }
    _createTextureFrom(transcodeResult) {
      var {
        mipmaps,
        width,
        height,
        format,
        type,
        error,
        dfdTransferFn,
        dfdFlags
      } = transcodeResult;
      if (type === 'error') return Promise.reject(error);
      var texture = new THREE.CompressedTexture(mipmaps, width, height, format, THREE.UnsignedByteType);
      texture.minFilter = mipmaps.length === 1 ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      texture.encoding = dfdTransferFn === KTX2TransferSRGB ? THREE.sRGBEncoding : THREE.LinearEncoding;
      texture.premultiplyAlpha = !!(dfdFlags & KTX2_ALPHA_PREMULTIPLIED);
      return texture;
    }

    /**
     * @param {ArrayBuffer[]} buffers
     * @param {object?} config
     * @return {Promise<CompressedTexture>}
     */
    _createTexture(buffers) {
      var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var taskConfig = config;
      var texturePending = this.init().then(() => {
        return this.workerPool.postMessage({
          type: 'transcode',
          buffers,
          taskConfig: taskConfig
        }, buffers);
      }).then(e => this._createTextureFrom(e.data));

      // Cache the task result.
      _taskCache$1.set(buffers[0], {
        promise: texturePending
      });
      return texturePending;
    }
    dispose() {
      URL.revokeObjectURL(this.workerSourceURL);
      this.workerPool.dispose();
      _activeLoaders--;
      return this;
    }
  }

  /* CONSTANTS */

  KTX2Loader.BasisFormat = {
    ETC1S: 0,
    UASTC_4x4: 1
  };
  KTX2Loader.TranscoderFormat = {
    ETC1: 0,
    ETC2: 1,
    BC1: 2,
    BC3: 3,
    BC4: 4,
    BC5: 5,
    BC7_M6_OPAQUE_ONLY: 6,
    BC7_M5: 7,
    PVRTC1_4_RGB: 8,
    PVRTC1_4_RGBA: 9,
    ASTC_4x4: 10,
    ATC_RGB: 11,
    ATC_RGBA_INTERPOLATED_ALPHA: 12,
    RGBA32: 13,
    RGB565: 14,
    BGR565: 15,
    RGBA4444: 16
  };
  KTX2Loader.EngineFormat = {
    RGBAFormat: THREE.RGBAFormat,
    RGBA_ASTC_4x4_Format: THREE.RGBA_ASTC_4x4_Format,
    RGBA_BPTC_Format: THREE.RGBA_BPTC_Format,
    RGBA_ETC2_EAC_Format: THREE.RGBA_ETC2_EAC_Format,
    RGBA_PVRTC_4BPPV1_Format: THREE.RGBA_PVRTC_4BPPV1_Format,
    RGBA_S3TC_DXT5_Format: THREE.RGBA_S3TC_DXT5_Format,
    RGB_ETC1_Format: THREE.RGB_ETC1_Format,
    RGB_ETC2_Format: THREE.RGB_ETC2_Format,
    RGB_PVRTC_4BPPV1_Format: THREE.RGB_PVRTC_4BPPV1_Format,
    RGB_S3TC_DXT1_Format: THREE.RGB_S3TC_DXT1_Format
  };

  /* WEB WORKER */

  KTX2Loader.BasisWorker = function () {
    var config;
    var transcoderPending;
    var BasisModule;
    var EngineFormat = _EngineFormat; // eslint-disable-line no-undef
    var TranscoderFormat = _TranscoderFormat; // eslint-disable-line no-undef
    var BasisFormat = _BasisFormat; // eslint-disable-line no-undef

    self.addEventListener('message', function (e) {
      var message = e.data;
      switch (message.type) {
        case 'init':
          config = message.config;
          init(message.transcoderBinary);
          break;
        case 'transcode':
          transcoderPending.then(() => {
            try {
              var {
                width,
                height,
                hasAlpha,
                mipmaps,
                format,
                dfdTransferFn,
                dfdFlags
              } = transcode(message.buffers[0]);
              var buffers = [];
              for (var i = 0; i < mipmaps.length; ++i) {
                buffers.push(mipmaps[i].data.buffer);
              }
              self.postMessage({
                type: 'transcode',
                id: message.id,
                width,
                height,
                hasAlpha,
                mipmaps,
                format,
                dfdTransferFn,
                dfdFlags
              }, buffers);
            } catch (error) {
              console.error(error);
              self.postMessage({
                type: 'error',
                id: message.id,
                error: error.message
              });
            }
          });
          break;
      }
    });
    function init(wasmBinary) {
      transcoderPending = new Promise(resolve => {
        BasisModule = {
          wasmBinary,
          onRuntimeInitialized: resolve
        };
        BASIS(BasisModule); // eslint-disable-line no-undef
      }).then(() => {
        BasisModule.initializeBasis();
        if (BasisModule.KTX2File === undefined) {
          console.warn('THREE.KTX2Loader: Please update Basis Universal transcoder.');
        }
      });
    }
    function transcode(buffer) {
      var ktx2File = new BasisModule.KTX2File(new Uint8Array(buffer));
      function cleanup() {
        ktx2File.close();
        ktx2File.delete();
      }
      if (!ktx2File.isValid()) {
        cleanup();
        throw new Error('THREE.KTX2Loader:	Invalid or unsupported .ktx2 file');
      }
      var basisFormat = ktx2File.isUASTC() ? BasisFormat.UASTC_4x4 : BasisFormat.ETC1S;
      var width = ktx2File.getWidth();
      var height = ktx2File.getHeight();
      var levels = ktx2File.getLevels();
      var hasAlpha = ktx2File.getHasAlpha();
      var dfdTransferFn = ktx2File.getDFDTransferFunc();
      var dfdFlags = ktx2File.getDFDFlags();
      var {
        transcoderFormat,
        engineFormat
      } = getTranscoderFormat(basisFormat, width, height, hasAlpha);
      if (!width || !height || !levels) {
        cleanup();
        throw new Error('THREE.KTX2Loader:	Invalid texture');
      }
      if (!ktx2File.startTranscoding()) {
        cleanup();
        throw new Error('THREE.KTX2Loader: .startTranscoding failed');
      }
      var mipmaps = [];
      for (var mip = 0; mip < levels; mip++) {
        var levelInfo = ktx2File.getImageLevelInfo(mip, 0, 0);
        var mipWidth = levelInfo.origWidth;
        var mipHeight = levelInfo.origHeight;
        var dst = new Uint8Array(ktx2File.getImageTranscodedSizeInBytes(mip, 0, 0, transcoderFormat));
        var status = ktx2File.transcodeImage(dst, mip, 0, 0, transcoderFormat, 0, -1, -1);
        if (!status) {
          cleanup();
          throw new Error('THREE.KTX2Loader: .transcodeImage failed.');
        }
        mipmaps.push({
          data: dst,
          width: mipWidth,
          height: mipHeight
        });
      }
      cleanup();
      return {
        width,
        height,
        hasAlpha,
        mipmaps,
        format: engineFormat,
        dfdTransferFn,
        dfdFlags
      };
    }

    //

    // Optimal choice of a transcoder target format depends on the Basis format (ETC1S or UASTC),
    // device capabilities, and texture dimensions. The list below ranks the formats separately
    // for ETC1S and UASTC.
    //
    // In some cases, transcoding UASTC to RGBA32 might be preferred for higher quality (at
    // significant memory cost) compared to ETC1/2, BC1/3, and PVRTC. The transcoder currently
    // chooses RGBA32 only as a last resort and does not expose that option to the caller.
    var FORMAT_OPTIONS = [{
      if: 'astcSupported',
      basisFormat: [BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.ASTC_4x4, TranscoderFormat.ASTC_4x4],
      engineFormat: [EngineFormat.RGBA_ASTC_4x4_Format, EngineFormat.RGBA_ASTC_4x4_Format],
      priorityETC1S: Infinity,
      priorityUASTC: 1,
      needsPowerOfTwo: false
    }, {
      if: 'bptcSupported',
      basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.BC7_M5, TranscoderFormat.BC7_M5],
      engineFormat: [EngineFormat.RGBA_BPTC_Format, EngineFormat.RGBA_BPTC_Format],
      priorityETC1S: 3,
      priorityUASTC: 2,
      needsPowerOfTwo: false
    }, {
      if: 'dxtSupported',
      basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.BC1, TranscoderFormat.BC3],
      engineFormat: [EngineFormat.RGB_S3TC_DXT1_Format, EngineFormat.RGBA_S3TC_DXT5_Format],
      priorityETC1S: 4,
      priorityUASTC: 5,
      needsPowerOfTwo: false
    }, {
      if: 'etc2Supported',
      basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.ETC1, TranscoderFormat.ETC2],
      engineFormat: [EngineFormat.RGB_ETC2_Format, EngineFormat.RGBA_ETC2_EAC_Format],
      priorityETC1S: 1,
      priorityUASTC: 3,
      needsPowerOfTwo: false
    }, {
      if: 'etc1Supported',
      basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.ETC1, TranscoderFormat.ETC1],
      engineFormat: [EngineFormat.RGB_ETC1_Format, EngineFormat.RGB_ETC1_Format],
      priorityETC1S: 2,
      priorityUASTC: 4,
      needsPowerOfTwo: false
    }, {
      if: 'pvrtcSupported',
      basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
      transcoderFormat: [TranscoderFormat.PVRTC1_4_RGB, TranscoderFormat.PVRTC1_4_RGBA],
      engineFormat: [EngineFormat.RGB_PVRTC_4BPPV1_Format, EngineFormat.RGBA_PVRTC_4BPPV1_Format],
      priorityETC1S: 5,
      priorityUASTC: 6,
      needsPowerOfTwo: true
    }];
    var ETC1S_OPTIONS = FORMAT_OPTIONS.sort(function (a, b) {
      return a.priorityETC1S - b.priorityETC1S;
    });
    var UASTC_OPTIONS = FORMAT_OPTIONS.sort(function (a, b) {
      return a.priorityUASTC - b.priorityUASTC;
    });
    function getTranscoderFormat(basisFormat, width, height, hasAlpha) {
      var transcoderFormat;
      var engineFormat;
      var options = basisFormat === BasisFormat.ETC1S ? ETC1S_OPTIONS : UASTC_OPTIONS;
      for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        if (!config[opt.if]) continue;
        if (!opt.basisFormat.includes(basisFormat)) continue;
        if (opt.needsPowerOfTwo && !(isPowerOfTwo(width) && isPowerOfTwo(height))) continue;
        transcoderFormat = opt.transcoderFormat[hasAlpha ? 1 : 0];
        engineFormat = opt.engineFormat[hasAlpha ? 1 : 0];
        return {
          transcoderFormat,
          engineFormat
        };
      }
      console.warn('THREE.KTX2Loader: No suitable compressed texture format found. Decoding to RGBA32.');
      transcoderFormat = TranscoderFormat.RGBA32;
      engineFormat = EngineFormat.RGBAFormat;
      return {
        transcoderFormat,
        engineFormat
      };
    }
    function isPowerOfTwo(value) {
      if (value <= 2) return true;
      return (value & value - 1) === 0 && value !== 0;
    }
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Data class for loaded 3d model
   */
  class Model {
    /**
     * Create new Model instance
     */
    constructor({
      src,
      scenes,
      center = AUTO,
      parser = null,
      animations = [],
      annotations = [],
      variants = [],
      fixSkinnedBbox = false,
      castShadow = true,
      receiveShadow = false
    }) {
      this._src = src;
      const scene = new THREE.Group();
      scene.add(...scenes);
      this._scene = scene;
      this._parser = parser;
      this._animations = animations;
      this._annotations = annotations;
      this._variants = variants;
      const bbox = this._getInitialBbox(fixSkinnedBbox);
      // Move to position where bbox.min.y = 0
      const offset = bbox.min.y;
      scene.translateY(-offset);
      scene.updateMatrixWorld();
      bbox.translate(new THREE.Vector3(0, -offset, 0));
      this._fixSkinnedBbox = fixSkinnedBbox;
      this._bbox = bbox;
      this._center = center === AUTO ? bbox.getCenter(new THREE.Vector3()) : parseAsBboxRatio(center, bbox);
      this.castShadow = castShadow;
      this.receiveShadow = receiveShadow;
    }
    /**
     * Source URL of this model
     * @type {string}
     * @readonly
     */
    get src() {
      return this._src;
    }
    /**
     * Scene of the model, see {@link https://threejs.org/docs/#api/en/objects/Group THREE.Group}
     * @readonly
     */
    get scene() {
      return this._scene;
    }
    /**
     * {@link https://threejs.org/docs/#api/en/animation/AnimationClip THREE.AnimationClip}s inside model
     * @readonly
     */
    get animations() {
      return this._animations;
    }
    /**
     * {@link Annotation}s included inside the model
     * @readonly
     */
    get annotations() {
      return this._annotations;
    }
    /**
     * {@link https://threejs.org/docs/#api/en/objects/Mesh THREE.Mesh}es inside model if there's any.
     * @readonly
     */
    get meshes() {
      return this._getAllMeshes();
    }
    /**
     * Get a copy of model's current bounding box
     * @type THREE#Box3
     * @readonly
     * @see https://threejs.org/docs/#api/en/math/Box3
     */
    get bbox() {
      return this._bbox;
    }
    /**
     * Center of the model
     * @type THREE#Vector3
     * @readonly
     * @see https://threejs.org/docs/#api/en/math/Vector3
     */
    get center() {
      return this._center;
    }
    /**
     * Whether the model's meshes gets rendered into shadow map
     * @type boolean
     * @example
     * ```ts
     * model.castShadow = true;
     * ```
     */
    set castShadow(val) {
      const meshes = this.meshes;
      meshes.forEach(mesh => mesh.castShadow = val);
    }
    /**
     * Whether the model's mesh materials receive shadows
     * @type boolean
     * @example
     * ```ts
     * model.receiveShadow = true;
     * ```
     */
    set receiveShadow(val) {
      const meshes = this.meshes;
      meshes.forEach(mesh => mesh.receiveShadow = val);
    }
    selectVariant(variant) {
      return __awaiter(this, void 0, void 0, function* () {
        const variants = this._variants;
        const parser = this._parser;
        if (variants.length <= 0 || !parser) return;
        let variantIndex = 0;
        if (variant != null) {
          if (isString(variant)) {
            variantIndex = variants.findIndex(({
              name
            }) => name === variant);
          } else {
            variantIndex = variant;
          }
        }
        const scene = this._scene;
        const matLoadPromises = [];
        scene.traverse(obj => __awaiter(this, void 0, void 0, function* () {
          if (!obj.isMesh || !obj.userData.gltfExtensions) return;
          const meshVariantDef = obj.userData.gltfExtensions[VARIANT_EXTENSION];
          if (!meshVariantDef) return;
          if (!obj.userData.originalMaterial) {
            obj.userData.originalMaterial = obj.material;
          }
          const mapping = meshVariantDef.mappings.find(mapping => mapping.variants.includes(variantIndex));
          if (mapping) {
            const loadMat = parser.getDependency("material", mapping.material);
            matLoadPromises.push(loadMat);
            obj.material = yield loadMat;
            parser.assignFinalMaterial(obj);
          } else {
            obj.material = obj.userData.originalMaterial;
          }
        }));
        return Promise.all(matLoadPromises);
      });
    }
    /**
     * Executes a user-supplied "reducer" callback function on each vertex of the model, in order, passing in the return value from the calculation on the preceding element.
     */
    reduceVertices(callbackfn, initialVal) {
      const meshes = this.meshes;
      let result = initialVal;
      meshes.forEach(mesh => {
        const {
          position
        } = mesh.geometry.attributes;
        if (!position) return;
        mesh.updateMatrixWorld();
        if (this._fixSkinnedBbox && mesh.isSkinnedMesh) {
          this._forEachSkinnedVertices(mesh, vertex => {
            result = callbackfn(result, vertex);
          });
        } else {
          const posScale = getAttributeScale(position);
          for (let idx = 0; idx < position.count; idx++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
            if (position.normalized) {
              vertex.multiplyScalar(posScale);
            }
            vertex.applyMatrix4(mesh.matrixWorld);
            result = callbackfn(result, vertex);
          }
        }
      });
      return result;
    }
    _getInitialBbox(fixSkinnedBbox) {
      this._scene.updateMatrixWorld();
      if (fixSkinnedBbox && this._hasSkinnedMesh()) {
        return this._getSkeletonBbox();
      } else {
        return new THREE.Box3().setFromObject(this._scene);
      }
    }
    _getSkeletonBbox() {
      const bbox = new THREE.Box3();
      this.meshes.forEach(mesh => {
        if (!mesh.isSkinnedMesh) {
          bbox.expandByObject(mesh);
          return;
        }
        this._forEachSkinnedVertices(mesh, vertex => bbox.expandByPoint(vertex));
      });
      return bbox;
    }
    /**
     * Get all {@link https://threejs.org/docs/#api/en/objects/Mesh THREE.Mesh}es inside model if there's any.
     * @private
     * @returns Meshes found at model's scene
     */
    _getAllMeshes() {
      const meshes = [];
      this._scene.traverse(obj => {
        if (obj.isMesh) {
          meshes.push(obj);
        }
      });
      return meshes.sort((a, b) => a.name.localeCompare(b.name));
    }
    _hasSkinnedMesh() {
      return this._getAllMeshes().some(mesh => mesh.isSkinnedMesh);
    }
    _forEachSkinnedVertices(mesh, callback) {
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position;
      const skinWeights = geometry.attributes.skinWeight;
      const skeleton = mesh.skeleton;
      skeleton.update();
      const positionScale = getAttributeScale(positions);
      const skinWeightScale = getAttributeScale(skinWeights);
      for (let posIdx = 0; posIdx < positions.count; posIdx++) {
        const transformed = getSkinnedVertex(posIdx, mesh, positionScale, skinWeightScale);
        callback(transformed);
      }
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  const dracoLoader = new DRACOLoader();
  const ktx2Loader = new KTX2Loader();
  /**
   * glTF/glb 3D model loader
   */
  class GLTFLoader$1 extends Loader {
    /**
     * Create a new instance of GLTFLoader
     */
    constructor(view3D) {
      super(view3D);
      this._loader = new GLTFLoader();
      const loader = this._loader;
      loader.setCrossOrigin("anonymous");
      loader.setDRACOLoader(dracoLoader);
      loader.setKTX2Loader(ktx2Loader.detectSupport(view3D.renderer.threeRenderer));
    }
    static setMeshoptDecoder(meshoptPath) {
      return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
          const scriptTag = document.createElement("script");
          scriptTag.addEventListener("load", () => __awaiter(this, void 0, void 0, function* () {
            yield window.MeshoptDecoder.ready;
            GLTFLoader$1.meshoptDecoder = window.MeshoptDecoder;
            document.body.removeChild(scriptTag);
            resolve();
          }));
          scriptTag.addEventListener("error", () => {
            document.body.removeChild(scriptTag);
            reject();
          });
          scriptTag.src = new URL(meshoptPath, location.href).href;
          document.body.appendChild(scriptTag);
        });
      });
    }
    /**
     * Load new GLTF model from the given url
     * @param {string} url URL to fetch glTF/glb file
     * @returns Promise that resolves {@link Model}
     */
    load(url) {
      const view3D = this._view3D;
      const loader = this._loader;
      const loadingContext = createLoadingContext(view3D, url);
      dracoLoader.setDecoderPath(view3D.dracoPath);
      ktx2Loader.setTranscoderPath(view3D.ktxPath);
      if (GLTFLoader$1.meshoptDecoder) {
        loader.setMeshoptDecoder(GLTFLoader$1.meshoptDecoder);
      }
      loader.manager = THREE.DefaultLoadingManager;
      return new Promise((resolve, reject) => {
        try {
          loader.load(url, gltf => __awaiter(this, void 0, void 0, function* () {
            const model = yield this._parseToModel(gltf, url);
            resolve(model);
          }), evt => this._onLoadingProgress(evt, url, loadingContext), err => {
            loadingContext.initialized = true;
            reject(err);
          });
        } catch (err) {
          reject(err);
        }
      });
    }
    /**
     * Load new GLTF model from the given files
     * @param files Files that has glTF/glb and all its associated resources like textures and .bin data files
     * @returns Promise that resolves {@link Model}
     */
    loadFromFiles(files) {
      const view3D = this._view3D;
      const loader = this._loader;
      const objectURLs = [];
      const revokeURLs = () => {
        objectURLs.forEach(url => {
          URL.revokeObjectURL(url);
        });
      };
      dracoLoader.setDecoderPath(view3D.dracoPath);
      ktx2Loader.setTranscoderPath(view3D.ktxPath);
      if (GLTFLoader$1.meshoptDecoder) {
        loader.setMeshoptDecoder(GLTFLoader$1.meshoptDecoder);
      }
      return new Promise((resolve, reject) => {
        if (files.length <= 0) {
          reject(new Error("No files found"));
          return;
        }
        const gltfFile = files.find(file => /\.(gltf|glb)$/i.test(file.name));
        if (!gltfFile) {
          reject(new Error("No glTF file found"));
          return;
        }
        const filesMap = new Map();
        files.forEach(file => {
          filesMap.set(file.name, file);
        });
        const gltfURL = URL.createObjectURL(gltfFile);
        objectURLs.push(gltfURL);
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(fileURL => {
          if (/^data:.*,.*$/i.test(fileURL)) return fileURL;
          const fileNameResult = /[^\/|\\]+$/.exec(fileURL);
          const fileName = fileNameResult && fileNameResult[0] || "";
          if (filesMap.has(fileName)) {
            const blob = filesMap.get(fileName);
            const blobURL = URL.createObjectURL(blob);
            objectURLs.push(blobURL);
            return blobURL;
          }
          return fileURL;
        });
        const loadingContext = createLoadingContext(view3D, gltfURL);
        loader.manager = manager;
        loader.load(gltfURL, gltf => __awaiter(this, void 0, void 0, function* () {
          const model = yield this._parseToModel(gltf, gltfFile.name);
          revokeURLs();
          resolve(model);
        }), evt => this._onLoadingProgress(evt, gltfURL, loadingContext), err => {
          loadingContext.initialized = true;
          revokeURLs();
          reject(err);
        });
      });
    }
    _parseToModel(gltf, src) {
      var _a, _b;
      return __awaiter(this, void 0, void 0, function* () {
        const view3D = this._view3D;
        const fixSkinnedBbox = view3D.fixSkinnedBbox;
        gltf.scenes.forEach(scene => {
          scene.traverse(obj => {
            obj.frustumCulled = false;
          });
        });
        const maxTextureSize = view3D.renderer.threeRenderer.capabilities.maxTextureSize;
        const meshes = [];
        gltf.scenes.forEach(scene => {
          scene.traverse(obj => {
            if (obj.isMesh) {
              meshes.push(obj);
            }
          });
        });
        const materials = meshes.reduce((allMaterials, mesh) => {
          return [...allMaterials, ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material])];
        }, []);
        const textures = materials.reduce((allTextures, material) => {
          return [...allTextures, ...STANDARD_MAPS.filter(map => material[map]).map(mapName => material[mapName])];
        }, []);
        const associations = gltf.parser.associations;
        const gltfJSON = gltf.parser.json;
        const gltfTextures = textures.filter(texture => associations.has(texture)).map(texture => {
          return gltfJSON.textures[associations.get(texture).textures];
        });
        const texturesByLevel = Array.from(new Set(gltfTextures).values()).reduce((levels, texture, texIdx) => {
          const hasExtension = texture.extensions && texture.extensions[CUSTOM_TEXTURE_LOD_EXTENSION];
          const hasExtra = texture.extras && texture.extras[TEXTURE_LOD_EXTRA];
          if (!hasExtension && !hasExtra) return levels;
          const currentTexture = textures[texIdx];
          const lodLevels = hasExtension ? texture.extensions[CUSTOM_TEXTURE_LOD_EXTENSION].levels : texture.extras[TEXTURE_LOD_EXTRA].levels;
          lodLevels.forEach(({
            index,
            size
          }, level) => {
            if (size > maxTextureSize) return;
            if (!levels[level]) {
              levels[level] = [];
            }
            levels[level].push({
              index,
              texture: currentTexture
            });
          });
          return levels;
        }, []);
        const loaded = texturesByLevel.map(() => false);
        texturesByLevel.forEach((levelTextures, level) => __awaiter(this, void 0, void 0, function* () {
          // Change textures when all texture of the level loaded
          const texturesLoaded = yield Promise.all(levelTextures.map(({
            index
          }) => gltf.parser.getDependency("texture", index)));
          const higherLevelLoaded = loaded.slice(level + 1).some(val => !!val);
          loaded[level] = true;
          if (higherLevelLoaded) return;
          texturesLoaded.forEach((texture, index) => {
            const origTexture = levelTextures[index].texture;
            origTexture.image = texture.image;
            origTexture.needsUpdate = true;
            view3D.renderer.renderSingleFrame();
          });
        }));
        const annotations = [];
        if (gltf.parser.json.extras && gltf.parser.json.extras[ANNOTATION_EXTRA]) {
          const data = gltf.parser.json.extras[ANNOTATION_EXTRA];
          annotations.push(...view3D.annotation.parse(data));
        }
        const userData = (_a = gltf.userData) !== null && _a !== void 0 ? _a : {};
        const extensions = (_b = userData.gltfExtensions) !== null && _b !== void 0 ? _b : {};
        const variants = extensions[VARIANT_EXTENSION] ? extensions[VARIANT_EXTENSION].variants : [];
        const model = new Model({
          src,
          scenes: gltf.scenes,
          center: view3D.center,
          annotations,
          parser: gltf.parser,
          animations: gltf.animations,
          variants,
          fixSkinnedBbox
        });
        if (view3D.variant) {
          yield model.selectVariant(view3D.variant);
        }
        return model;
      });
    }
  }

  /**
   * @extends Component
   * @see https://naver.github.io/egjs-component/
   */
  class View3D extends Component {
    /**
     * Creates new View3D instance.
     * @param root A root element or selector of it to initialize View3D
     * @param {View3DOptions} [options={}] An options object for View3D
     * @throws {View3DError}
     */
    constructor(root, {
      src = null,
      iosSrc = null,
      variant = null,
      dracoPath = DRACO_DECODER_URL,
      ktxPath = KTX_TRANSCODER_URL,
      meshoptPath = null,
      fixSkinnedBbox = false,
      fov = AUTO,
      center = AUTO,
      yaw = 0,
      pitch = 0,
      pivot = AUTO,
      initialZoom = 0,
      rotate = true,
      translate = true,
      zoom = true,
      autoplay = false,
      scrollable = true,
      wheelScrollable = false,
      useGrabCursor = true,
      ignoreCenterOnFit = false,
      skybox = null,
      envmap = null,
      background = null,
      exposure = 1,
      shadow = true,
      skyboxBlur = false,
      toneMapping = TONE_MAPPING.LINEAR,
      useDefaultEnv = true,
      defaultAnimationIndex = 0,
      animationRepeatMode = ANIMATION_REPEAT_MODE.ONE,
      annotationURL = null,
      annotationWrapper = `.${DEFAULT_CLASS.ANNOTATION_WRAPPER}`,
      annotationSelector = `.${DEFAULT_CLASS.ANNOTATION}`,
      annotationBreakpoints = ANNOTATION_BREAKPOINT,
      annotationAutoUnfocus = true,
      webAR = true,
      sceneViewer = true,
      quickLook = true,
      arPriority = AR_PRIORITY,
      poster = null,
      canvasSelector = "canvas",
      autoInit = true,
      autoResize = true,
      useResizeObserver = true,
      maintainSize = false,
      on = {},
      plugins = [],
      maxDeltaTime = 1 / 30
    } = {}) {
      super();
      this._rootEl = getElement(root);
      // Bind options
      this._src = src;
      this._iosSrc = iosSrc;
      this._variant = variant;
      this._dracoPath = dracoPath;
      this._ktxPath = ktxPath;
      this._meshoptPath = meshoptPath;
      this._fixSkinnedBbox = fixSkinnedBbox;
      this._fov = fov;
      this._center = center;
      this._yaw = yaw;
      this._pitch = pitch;
      this._pivot = pivot;
      this._initialZoom = initialZoom;
      this._rotate = rotate;
      this._translate = translate;
      this._zoom = zoom;
      this._autoplay = autoplay;
      this._scrollable = scrollable;
      this._wheelScrollable = wheelScrollable;
      this._useGrabCursor = useGrabCursor;
      this._ignoreCenterOnFit = ignoreCenterOnFit;
      this._skybox = skybox;
      this._envmap = envmap;
      this._background = background;
      this._exposure = exposure;
      this._shadow = shadow;
      this._skyboxBlur = skyboxBlur;
      this._toneMapping = toneMapping;
      this._useDefaultEnv = useDefaultEnv;
      this._defaultAnimationIndex = defaultAnimationIndex;
      this._animationRepeatMode = animationRepeatMode;
      this._annotationURL = annotationURL;
      this._annotationWrapper = annotationWrapper;
      this._annotationSelector = annotationSelector;
      this._annotationBreakpoints = annotationBreakpoints;
      this._annotationAutoUnfocus = annotationAutoUnfocus;
      this._webAR = webAR;
      this._sceneViewer = sceneViewer;
      this._quickLook = quickLook;
      this._arPriority = arPriority;
      this._poster = poster;
      this._canvasSelector = canvasSelector;
      this._autoInit = autoInit;
      this._autoResize = autoResize;
      this._useResizeObserver = useResizeObserver;
      this._maintainSize = maintainSize;
      this._model = null;
      this._initialized = false;
      this._loadingContext = [];
      this._plugins = plugins;
      this._maxDeltaTime = maxDeltaTime;
      // Create internal components
      this._renderer = new Renderer(this);
      this._camera = new Camera(this);
      this._control = new OrbitControl(this);
      this._scene = new Scene(this);
      this._animator = new ModelAnimator(this);
      this._autoPlayer = new AutoPlayer(this, getObjectOption(autoplay));
      this._autoResizer = new AutoResizer(this);
      this._arManager = new ARManager(this);
      this._annotationManager = new AnnotationManager(this);
      this._addEventHandlers(on);
      this._addPosterImage();
      void (() => __awaiter(this, void 0, void 0, function* () {
        yield this._initPlugins(plugins);
        if (src && autoInit) {
          yield this.init();
        }
      }))();
    }
    // Internal Components Getter
    /**
     * {@link Renderer} instance of the View3D
     * @type {Renderer}
     * @readonly
     */
    get renderer() {
      return this._renderer;
    }
    /**
     * {@link Scene} instance of the View3D
     * @type {Scene}
     * @readonly
     */
    get scene() {
      return this._scene;
    }
    /**
     * {@link Camera} instance of the View3D
     * @type {Camera}
     * @readonly
     */
    get camera() {
      return this._camera;
    }
    /**
     * {@link OrbitControl} instance of the View3D
     * @type {OrbitControl}
     * @readonly
     */
    get control() {
      return this._control;
    }
    /**
     * {@link AutoPlayer} instance of the View3D
     * @type {AutoPlayer}
     * @readonly
     */
    get autoPlayer() {
      return this._autoPlayer;
    }
    /**
     * Current {@link Model} displaying. `null` if nothing is displayed on the canvas.
     * @type {Model | null}
     * @readonly
     */
    get model() {
      return this._model;
    }
    /**
     * {@link ModelAnimator} instance of the View3D
     * @type {ModelAnimator}
     * @readonly
     */
    get animator() {
      return this._animator;
    }
    /**
     * {@link ARManager} instance of the View3D
     * @type {ARManager}
     * @readonly
     */
    get ar() {
      return this._arManager;
    }
    /**
     * {@link AnnotationManager} instance of the View3D
     * @type {AnnotationManager}
     */
    get annotation() {
      return this._annotationManager;
    }
    // Internal State Getter
    /**
     * Root(Wrapper) element of View3D that given in the constructor
     * @type {HTMLElement}
     * @readonly
     */
    get rootEl() {
      return this._rootEl;
    }
    /**
     * Whether the View3D is initialized. This is set to `true` just before triggering "ready" event.
     * @type {boolean}
     * @readonly
     */
    get initialized() {
      return this._initialized;
    }
    /**
     * An array of loading status of assets.
     * @type {LoadingItem[]}
     * @readonly
     * @internal
     */
    get loadingContext() {
      return this._loadingContext;
    }
    /**
     * Active plugins of view3D
     * @type {View3DPlugin[]}
     * @readonly
     */
    get plugins() {
      return this._plugins;
    }
    // Options Getter
    /**
     * Source URL to fetch 3D model. `glb` / `glTF` models are supported.
     * @type {string | null}
     * @default null
     */
    get src() {
      return this._src;
    }
    /**
     * Source URL to fetch 3D model in iOS AR Quick Look. `usdz` models are supported.
     * @type {string | null}
     * @default null
     */
    get iosSrc() {
      return this._iosSrc;
    }
    /**
     * Active material variant of the model.
     * Either can be index of the variant(number), or the name of the variant(string)
     * Changing this value will change the material of the model
     * @default null
     * @see https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_variants/README.md
     */
    get variant() {
      return this._variant;
    }
    /**
     * URL to {@link https://github.com/google/draco Draco} decoder location.
     * @type {string}
     * @default https://www.gstatic.com/draco/versioned/decoders/1.4.1/
     */
    get dracoPath() {
      return this._dracoPath;
    }
    /**
     * URL to {@link http://github.khronos.org/KTX-Specification/#basisu_gd KTX2 texture} transcoder location.
     * @type {string}
     * @default https://unpkg.com/three@0.134.0/examples/js/libs/basis/
     */
    get ktxPath() {
      return this._ktxPath;
    }
    /**
     * URL to {@link https://github.com/zeux/meshoptimizer Meshoptimizer} decoder js path.
     * @type {string | null}
     * @default null
     */
    get meshoptPath() {
      return this._meshoptPath;
    }
    /**
     * Sometimes, some rigged model has the wrong bounding box that when displaying on three.js (usually converted glTF model from Sketchfab)
     * Enabling this option can resolve that issue by recalculating bounding box size with the influence of the skeleton weight.
     * @type {boolean}
     * @default false
     */
    get fixSkinnedBbox() {
      return this._fixSkinnedBbox;
    }
    /**
     * A vertical FOV(Field of View) value of the camera frustum, in degrees.
     * If `"auto"` is used, View3D will try to find the appropriate FOV value that model is not clipped at any angle.
     * @type {"auto" | number}
     * @default "auto"
     */
    get fov() {
      return this._fov;
    }
    /**
     * Specifies the center of the model.
     * If `"auto"` is given, it will use the center of the model's bounding box.
     * Else, you can use a number array as any world position.
     * Or, you can use a string array as a relative position to bounding box min/max. ex) ["0%", "100%", "50%"]
     * The difference to {@link View3D#pivot pivot} is model's bounding box and center position will be shown on screen at every rotation angle.
     * @type {"auto" | Array<number | string>}
     * @default "auto"
     */
    get center() {
      return this._center;
    }
    /**
     * Initial Y-axis rotation of the camera, in degrees.
     * Use {@link Camera#yaw view3D.camera.yaw} instead if you want current yaw value.
     * @type {number}
     * @default 0
     */
    get yaw() {
      return this._yaw;
    }
    /**
     * Initial X-axis rotation of the camera, in degrees.
     * Should be a value from -90 to 90.
     * Use {@link Camera#pitch view3D.camera.pitch} instead if you want current pitch value.
     * @type {number}
     * @default 0
     */
    get pitch() {
      return this._pitch;
    }
    /**
     * Initial origin point of rotation of the camera.
     * If `"auto"` is given, it will use {@link View3D#center model's center} as pivot.
     * Else, you can use a number array as any world position.
     * Or, you can use a string array as a relative position to bounding box min/max. ex) ["0%", "100%", "50%"]
     * Use {@link Camera#pivot view3D.camera.pivot} instead if you want current pivot value.
     * @type {"auto" | Array<number | string>}
     * @default "auto"
     */
    get pivot() {
      return this._pivot;
    }
    /**
     * Initial zoom value.
     * If `number` is given, positive value will make camera zoomed in and negative value will make camera zoomed out.
     * If `object` is given, it will fit model's bounding box's front / side face to the given ratio of the canvas height / width.
     * For example, `{ axis: "y", ratio: 0.5 }` will set the zoom of the camera so that the height of the model to 50% of the height of the canvas.
     * @type {number}
     * @default 0
     */
    get initialZoom() {
      return this._initialZoom;
    }
    /**
     * Options for the {@link RotateControl}.
     * If `false` is given, it will disable the rotate control.
     * @type {boolean | RotateControlOptions}
     * @default true
     */
    get rotate() {
      return this._rotate;
    }
    /**
     * Options for the {@link TranslateControl}.
     * If `false` is given, it will disable the translate control.
     * @type {boolean | TranslateControlOptions}
     * @default true
     */
    get translate() {
      return this._translate;
    }
    /**
     * Options for the {@link ZoomControl}.
     * If `false` is given, it will disable the zoom control.
     * @type {boolean | ZoomControlOptions}
     * @default true
     */
    get zoom() {
      return this._zoom;
    }
    /**
     * Enable Y-axis rotation autoplay.
     * If `true` is given, it will enable autoplay with default values.
     * @type {boolean | AutoplayOptions}
     * @default true
     */
    get autoplay() {
      return this._autoplay;
    }
    /**
     * Enable browser scrolling with touch on the canvas area.
     * This will block the rotate(pitch) control if the user is currently scrolling.
     * @type {boolean}
     * @default true
     */
    get scrollable() {
      return this._scrollable;
    }
    /**
     * Enable browser scrolling with mouse wheel on the canvas area.
     * This will block the zoom control with mouse wheel.
     * @type {boolean}
     * @default false
     */
    get wheelScrollable() {
      return this._wheelScrollable;
    }
    /**
     * Enable CSS `cursor: grab` on the canvas element.
     * `cursor: grabbing` will be used on mouse click.
     * @type {boolean}
     * @default true
     */
    get useGrabCursor() {
      return this._useGrabCursor;
    }
    /**
     * When {@link Camera#pivot camera.fit} is called, View3D will adjust camera with the model so that the model is not clipped from any camera rotation by assuming {@link View3D#center center} as origin of the rotation by default.
     * This will ignore that behavior by forcing model's bbox center as center of the rotation while fitting the camera to the model.
     * @type {boolean}
     * @default false
     */
    get ignoreCenterOnFit() {
      return this._ignoreCenterOnFit;
    }
    /**
     * Source to the HDR texture image (RGBE), which will used as the scene environment map & background.
     * `envmap` will be ignored if this value is not `null`.
     * @type {string | null}
     * @default null
     */
    get skybox() {
      return this._skybox;
    }
    /**
     * Source to the HDR texture image (RGBE), which will used as the scene environment map.
     * @type {string | null}
     * @default null
     */
    get envmap() {
      return this._envmap;
    }
    /**
     * Color code / URL to a image to use as the background.
     * For transparent background, use `null`. (default value)
     * Can be enabled only when the `skybox` is `null`.
     * @type {number | string | null}
     * @default null
     */
    get background() {
      return this._background;
    }
    /**
     * Exposure value of the HDR envmap/skybox image.
     * @type {number}
     * @default 1
     */
    get exposure() {
      return this._exposure;
    }
    /**
     * Enable shadow below the model.
     * If `true` is given, it will enable shadow with the default options.
     * If `false` is given, it will disable the shadow.
     * @type {boolean | ShadowOptions}
     * @default true
     */
    get shadow() {
      return this._shadow;
    }
    /**
     * Apply blur to the current skybox image.
     * @type {boolean}
     * @default false
     */
    get skyboxBlur() {
      return this._skyboxBlur;
    }
    /**
     * This is used to approximate the appearance of high dynamic range (HDR) on the low dynamic range medium of a standard computer monitor or mobile device's screen.
     * @type {number}
     * @see TONE_MAPPING
     * @default THREE.LinearToneMapping
     */
    get toneMapping() {
      return this._toneMapping;
    }
    /**
     * Whether to use generated default environment map.
     * @type {boolean}
     * @default true
     */
    get useDefaultEnv() {
      return this._useDefaultEnv;
    }
    /**
     * Index of the animation to play after the model is loaded
     * @type {number}
     * @default 0
     */
    get defaultAnimationIndex() {
      return this._defaultAnimationIndex;
    }
    /**
     * Repeat mode of the animator.
     * "one" will repeat single animation, and "all" will repeat all animations.
     * "none" will make animation to automatically paused on its last frame.
     * @see ANIMATION_REPEAT_MODE
     * @type {string}
     * @default "one"
     */
    get animationRepeatMode() {
      return this._animationRepeatMode;
    }
    /**
     * An URL to the JSON file that has annotation informations.
     * @type {string | null}
     * @default null
     */
    get annotationURL() {
      return this._annotationURL;
    }
    /**
     * An element or CSS selector of the annotation wrapper element.
     * @type {HTMLElement | string}
     * @default ".view3d-annotation-wrapper"
     */
    get annotationWrapper() {
      return this._annotationWrapper;
    }
    /**
     * CSS selector of the annotation elements inside the root element
     * @type {string}
     * @default ".view3d-annotation"
     */
    get annotationSelector() {
      return this._annotationSelector;
    }
    /**
     * Breakpoints for the annotation opacity, mapped by degree between (camera-model center-annotation) as key.
     * @type {Record<number, number>}
     * @default { 165: 0, 135: 0.4, 0: 1 }
     */
    get annotationBreakpoints() {
      return this._annotationBreakpoints;
    }
    /**
     * Whether to automatically unfocus annotation on user input
     * @type {boolean}
     * @default true
     */
    get annotationAutoUnfocus() {
      return this._annotationAutoUnfocus;
    }
    /**
     * Options for the WebXR-based AR session.
     * If `false` is given, it will disable WebXR-based AR session.
     * @type {boolean | WebARSessionOptions}
     * @default true
     */
    get webAR() {
      return this._webAR;
    }
    /**
     * Options for the {@link https://developers.google.com/ar/develop/java/scene-viewer Google SceneViewer} based AR session.
     * If `false` is given, it will disable SceneViewer based AR session.
     * See {@link https://developers.google.com/ar/develop/java/scene-viewer#supported_intent_parameters Official Page} for the parameter details.
     * @type {boolean | SceneViewerSessionOptions}
     * @default true
     */
    get sceneViewer() {
      return this._sceneViewer;
    }
    /**
     * Options for the {@link https://developer.apple.com/augmented-reality/quick-look/ Apple AR Quick Look} based AR session.
     * If `false` is given, it will disable AR Quick Look based AR session.
     * @type {boolean | QuickLookSessionOptions}
     * @default true
     */
    get quickLook() {
      return this._quickLook;
    }
    /**
     * Priority array for the AR sessions.
     * If the two sessions are available in one environment, the session listed earlier will be used first.
     * If the session name is not included in this priority array, that session will be ignored.
     * See {@link AR_SESSION_TYPE}
     * @type {string[]}
     * @default ["webAR", "sceneViewer", "quickLook"]
     */
    get arPriority() {
      return this._arPriority;
    }
    /**
     * Poster image that will be displayed before the 3D model is loaded.
     * If `string` URL is given, View3D will temporarily show poster image element with that url as src before the first model is loaded
     * If `string` CSS selector of DOM element inside view3d-wrapper or `HTMLElement` is given, View3D will remove that element after the first model is loaded
     * @type {string | HTMLElement | null}
     * @default null
     */
    get poster() {
      return this._poster;
    }
    /**
     * CSS Selector for the canvas element.
     * @type {string}
     * @default "canvas"
     */
    get canvasSelector() {
      return this._canvasSelector;
    }
    /**
     * Call {@link View3D#init init()} automatically when creating View3D's instance
     * This option won't work if `src` is not given
     * @type {boolean}
     * @default true
     * @readonly
     */
    get autoInit() {
      return this._autoInit;
    }
    /**
     * Whether to automatically call {@link View3D#resize resize()} when the canvas element's size is changed
     * @type {boolean}
     * @default true
     */
    get autoResize() {
      return this._autoResize;
    }
    /**
     * Whether to listen {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver ResizeObserver}'s event instead of Window's {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event resize} event when using the `autoResize` option
     * @type {boolean}
     * @default true
     */
    get useResizeObserver() {
      return this._useResizeObserver;
    }
    /**
     * Whether to retain 3D model's visual size on canvas resize
     * @type {boolean}
     * @default false
     */
    get maintainSize() {
      return this._maintainSize;
    }
    /**
     * Maximum delta time in any given frame
     * This can prevent a long frame hitch / lag
     * The default value is 1/30(30 fps). Set this value to `Infinity` to disable
     * @type {number}
     * @default 1/30
     */
    get maxDeltaTime() {
      return this._maxDeltaTime;
    }
    set iosSrc(val) {
      this._iosSrc = val;
    }
    set variant(val) {
      if (this._model) {
        this._model.selectVariant(val).then(() => {
          this.renderer.renderSingleFrame();
        });
      }
      this._variant = val;
    }
    set defaultAnimationIndex(val) {
      this._defaultAnimationIndex = val;
    }
    set initialZoom(val) {
      this._initialZoom = val;
    }
    set skybox(val) {
      void this._scene.setSkybox(val);
      this._skybox = val;
      if (!val && this._useDefaultEnv) {
        this._scene.setDefaultEnv();
      }
    }
    set envmap(val) {
      void this._scene.setEnvMap(val);
      this._envmap = val;
      if (!val && this._useDefaultEnv) {
        this._scene.setDefaultEnv();
      }
    }
    set exposure(val) {
      this._exposure = val;
      this._renderer.threeRenderer.toneMappingExposure = val;
      this._renderer.renderSingleFrame();
    }
    set skyboxBlur(val) {
      this._skyboxBlur = val;
      const scene = this._scene;
      const root = scene.root;
      const origEnvmapTexture = scene.root.environment;
      if (origEnvmapTexture && root.background !== null) {
        if (val) {
          root.background = Skybox.createBlurredHDR(this, origEnvmapTexture);
        } else {
          root.background = origEnvmapTexture;
        }
      }
    }
    set toneMapping(val) {
      this._toneMapping = val;
      this._renderer.threeRenderer.toneMapping = val;
      this._renderer.renderSingleFrame();
    }
    set useGrabCursor(val) {
      this._useGrabCursor = val;
      this._control.updateCursor();
    }
    set animationRepeatMode(val) {
      this._animationRepeatMode = val;
      this._animator.updateRepeatMode();
    }
    set autoResize(val) {
      this._autoResize = val;
      if (val) {
        this._autoResizer.enable();
      } else {
        this._autoResizer.disable();
      }
    }
    set maintainSize(val) {
      this._maintainSize = val;
    }
    set maxDeltaTime(val) {
      this._maxDeltaTime = val;
    }
    /**
     * Destroy View3D instance and remove all events attached to it
     * @returns {void}
     */
    destroy() {
      this._scene.reset();
      this._renderer.destroy();
      this._control.destroy();
      this._autoResizer.disable();
      this._animator.destroy();
      this._annotationManager.destroy();
      this._plugins.forEach(plugin => plugin.teardown(this));
      this._plugins = [];
    }
    /**
     * Initialize View3d & load 3D model
     * @fires View3D#load
     * @returns {Promise<void>}
     */
    init() {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this._src) {
          throw new View3DError(ERROR.MESSAGES.PROVIDE_SRC_FIRST, ERROR.CODES.PROVIDE_SRC_FIRST);
        }
        const scene = this._scene;
        const renderer = this._renderer;
        const control = this._control;
        const animator = this._animator;
        const annotationManager = this._annotationManager;
        const meshoptPath = this._meshoptPath;
        const tasks = [];
        this.resize();
        animator.init();
        annotationManager.init();
        if (this._autoResize) {
          this._autoResizer.enable();
        }
        if (meshoptPath && !GLTFLoader$1.meshoptDecoder) {
          yield GLTFLoader$1.setMeshoptDecoder(meshoptPath);
        }
        // Load & set skybox / envmap before displaying model
        tasks.push(...scene.initTextures());
        const loadModel = this._loadModel(this._src);
        tasks.push(...loadModel);
        void this._resetLoadingContextOnFinish(tasks);
        yield Promise.race(loadModel);
        if (this._annotationURL) {
          yield this._annotationManager.load(this._annotationURL);
        }
        control.enable();
        if (this._autoplay) {
          this._autoPlayer.enable();
        }
        // Start rendering
        renderer.stopAnimationLoop();
        renderer.setAnimationLoop(renderer.defaultRenderLoop);
        renderer.renderSingleFrame();
        this._initialized = true;
        this.trigger(EVENTS$1.READY, {
          type: EVENTS$1.READY,
          target: this
        });
      });
    }
    /**
     * Resize View3D instance to fit current canvas size
     * @returns {void}
     */
    resize() {
      const renderer = this._renderer;
      const prevSize = this._initialized ? renderer.size : null;
      renderer.resize();
      const newSize = renderer.size;
      this._camera.resize(newSize, prevSize);
      this._control.resize(newSize);
      this._annotationManager.resize();
      // Prevent flickering on resize
      if (this._initialized) {
        renderer.renderSingleFrame(true);
      }
      this.trigger(EVENTS$1.RESIZE, Object.assign(Object.assign({}, newSize), {
        type: EVENTS$1.RESIZE,
        target: this
      }));
    }
    /**
     * Load a new 3D model and replace it with the current one
     * @param {string | string[]} src Source URL to fetch 3D model from
     * @param {object} [options={}] Options
     * @param {string | null} [options.iosSrc] Source URL to fetch 3D model in iOS AR Quick Look. `usdz` models are supported.
     */
    load(src, {
      iosSrc = null
    } = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        if (this._initialized) {
          const loadModel = this._loadModel(src);
          void this._resetLoadingContextOnFinish(loadModel);
          yield Promise.race(loadModel);
          // Change the src later as an error can occur while loading the model
          this._src = src;
          this._iosSrc = iosSrc;
        } else {
          this._src = src;
          this._iosSrc = iosSrc;
          yield this.init();
        }
      });
    }
    /**
     * Display the given model in the canvas
     * @param {Model} model A model to display
     * @param {object} options Options for displaying model
     * @param {boolean} [options.resetCamera=true] Reset camera to default pose
     */
    display(model, {
      resetCamera = true
    } = {}) {
      const renderer = this._renderer;
      const scene = this._scene;
      const camera = this._camera;
      const animator = this._animator;
      const annotationManager = this._annotationManager;
      const inXR = renderer.threeRenderer.xr.isPresenting;
      scene.reset();
      scene.add(model.scene);
      scene.shadowPlane.updateDimensions(model);
      if (resetCamera) {
        camera.fit(model);
        void camera.reset(0);
      }
      animator.reset();
      animator.setClips(model.animations);
      if (model.animations.length > 0) {
        animator.play(this._defaultAnimationIndex);
      }
      annotationManager.reset();
      annotationManager.collect();
      annotationManager.add(...model.annotations);
      this._model = model;
      if (inXR) {
        const activeSession = this._arManager.activeSession;
        if (activeSession) {
          activeSession.control.syncTargetModel(model);
        }
      }
      if (this._initialized) {
        renderer.renderSingleFrame();
      }
      this.trigger(EVENTS$1.MODEL_CHANGE, {
        type: EVENTS$1.MODEL_CHANGE,
        target: this,
        model
      });
    }
    /**
     * Add new plugins to View3D
     * @param {View3DPlugin[]} plugins Plugins to add
     * @returns {Promise<void>} A promise that resolves when all plugins are initialized
     */
    loadPlugins(...plugins) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this._initPlugins(plugins);
        this._plugins.push(...plugins);
      });
    }
    /**
     * Remove plugins from View3D
     * @param {View3DPlugin[]} plugins Plugins to remove
     * @returns {Promise<void>} A promise that resolves when all plugins are removed
     */
    removePlugins(...plugins) {
      return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(plugins.map(plugin => plugin.teardown(this)));
        plugins.forEach(plugin => {
          const pluginIdx = this._plugins.indexOf(plugin);
          if (pluginIdx < 0) return;
          this._plugins.splice(pluginIdx, 1);
        });
      });
    }
    /**
     * Take a screenshot of current rendered canvas image and download it
     */
    screenshot(fileName = "screenshot") {
      const canvas = this._renderer.canvas;
      const imgURL = canvas.toDataURL("png");
      const anchorEl = document.createElement("a");
      anchorEl.href = imgURL;
      anchorEl.download = fileName;
      anchorEl.click();
    }
    _loadModel(src) {
      const loader = new GLTFLoader$1(this);
      if (Array.isArray(src)) {
        const loaded = src.map(() => false);
        const loadModels = src.map((srcLevel, level) => this._loadSingleModel(loader, srcLevel, level, loaded));
        return loadModels;
      } else {
        return [this._loadSingleModel(loader, src, 0, [false])];
      }
    }
    _loadSingleModel(loader, src, level, loaded) {
      return __awaiter(this, void 0, void 0, function* () {
        const maxLevel = loaded.length - 1;
        this.trigger(EVENTS$1.LOAD_START, {
          type: EVENTS$1.LOAD_START,
          target: this,
          src,
          level,
          maxLevel
        });
        try {
          const model = yield loader.load(src);
          const higherLevelLoaded = loaded.slice(level + 1).some(val => !!val);
          const modelLoadedBefore = loaded.some(val => !!val);
          this.trigger(EVENTS$1.LOAD, {
            type: EVENTS$1.LOAD,
            target: this,
            model,
            level,
            maxLevel
          });
          loaded[level] = true;
          if (higherLevelLoaded) return;
          this.display(model, {
            resetCamera: !modelLoadedBefore
          });
        } catch (error) {
          this.trigger(EVENTS$1.LOAD_ERROR, {
            type: EVENTS$1.LOAD_ERROR,
            target: this,
            level,
            maxLevel,
            error
          });
          throw new View3DError(ERROR.MESSAGES.MODEL_FAIL_TO_LOAD(src), ERROR.CODES.MODEL_FAIL_TO_LOAD);
        }
      });
    }
    _addEventHandlers(events) {
      Object.keys(events).forEach(evtName => {
        this.on(evtName, events[evtName]);
      });
    }
    _addPosterImage() {
      const poster = this._poster;
      const rootEl = this._rootEl;
      if (!poster) return;
      const isPosterEl = isElement(poster);
      let posterEl;
      if (isPosterEl || isCSSSelector(poster)) {
        const elCandidate = isPosterEl ? poster : rootEl.querySelector(poster);
        if (!elCandidate) {
          throw new View3DError(ERROR.MESSAGES.ELEMENT_NOT_FOUND(poster), ERROR.CODES.ELEMENT_NOT_FOUND);
        }
        posterEl = elCandidate;
      } else {
        const imgEl = document.createElement("img");
        imgEl.className = DEFAULT_CLASS.POSTER;
        imgEl.src = poster;
        rootEl.appendChild(imgEl);
        posterEl = imgEl;
        this.once(EVENTS$1.READY, () => {
          if (imgEl.parentElement !== rootEl) return;
          rootEl.removeChild(imgEl);
        });
      }
      this.once(EVENTS$1.READY, () => {
        if (!posterEl.parentElement) return;
        // Remove that element from the parent element
        posterEl.parentElement.removeChild(posterEl);
      });
    }
    _initPlugins(plugins) {
      return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(plugins.map(plugin => plugin.init(this)));
      });
    }
    _resetLoadingContextOnFinish(tasks) {
      return __awaiter(this, void 0, void 0, function* () {
        void Promise.all(tasks).then(() => {
          this.trigger(EVENTS$1.LOAD_FINISH, {
            type: EVENTS$1.LOAD_FINISH,
            target: this
          });
          this._loadingContext = [];
        });
      });
    }
  }
  /**
   * Current version of the View3D
   * @type {string}
   * @readonly
   */
  View3D.VERSION = "2.10.2";

  /*
   * "View In Ar" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var ARIcon = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" width="32px" height="32px"><g><rect fill="none" height="24" width="24" x="0" y="0"/></g><g><g><path d="M3,4c0-0.55,0.45-1,1-1h2V1H4C2.34,1,1,2.34,1,4v2h2V4z"/><path d="M3,20v-2H1v2c0,1.66,1.34,3,3,3h2v-2H4C3.45,21,3,20.55,3,20z"/><path d="M20,1h-2v2h2c0.55,0,1,0.45,1,1v2h2V4C23,2.34,21.66,1,20,1z"/><path d="M21,20c0,0.55-0.45,1-1,1h-2v2h2c1.66,0,3-1.34,3-3v-2h-2V20z"/><path d="M19,14.87V9.13c0-0.72-0.38-1.38-1-1.73l-5-2.88c-0.31-0.18-0.65-0.27-1-0.27s-0.69,0.09-1,0.27L6,7.39 C5.38,7.75,5,8.41,5,9.13v5.74c0,0.72,0.38,1.38,1,1.73l5,2.88c0.31,0.18,0.65,0.27,1,0.27s0.69-0.09,1-0.27l5-2.88 C18.62,16.25,19,15.59,19,14.87z M11,17.17l-4-2.3v-4.63l4,2.33V17.17z M12,10.84L8.04,8.53L12,6.25l3.96,2.28L12,10.84z M17,14.87l-4,2.3v-4.6l4-2.33V14.87z"/></g></g></svg>';

  /**
   * A button that will be shown on the right-bottom side with the AR icon.
   * It will be disabled automatically when it's not available to enter AR sessions.
   * User can enter AR sessions by clicking this.
   */
  class ARButton {
    /**
     * Create new instance of ARButton
     * @param {object} [options={}] Options for the ARButton
     * @param {string} [options.availableText="View in AR"] A text that will be shown on mouse hover when it's available to enter the AR session.
     * @param {string} [options.unavailableText="AR is not available in this browser"] A text that will be shown on mouse hover when it's not available to enter the AR session.
     * @param {string} [options.buttonClass="view3d-ar-button"] A class that will be applied to the button element.
     * @param {string} [options.tooltipClass="view3d-tooltip"] A class that will be applied to the tooltip element.
     */
    constructor(options = {}) {
      this._options = options;
      this._button = null;
    }
    init(view3D) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this._addButton(view3D);
      });
    }
    teardown(view3D) {
      const button = this._button;
      if (!button) return;
      if (button.parentElement === view3D.rootEl) {
        view3D.rootEl.removeChild(button);
      }
      this._button = null;
    }
    _addButton(view3D) {
      return __awaiter(this, void 0, void 0, function* () {
        const {
          availableText = "View in AR",
          unavailableText = "AR is not available in this browser",
          buttonClass = "view3d-ar-button",
          tooltipClass = "view3d-tooltip"
        } = this._options;
        const arAvailable = yield view3D.ar.isAvailable();
        const button = document.createElement(EL_BUTTON);
        const tooltip = document.createElement(EL_DIV);
        const tooltipText = document.createTextNode(arAvailable ? availableText : unavailableText);
        button.classList.add(buttonClass);
        tooltip.classList.add(tooltipClass);
        button.disabled = true;
        button.innerHTML = ARIcon;
        button.appendChild(tooltip);
        tooltip.appendChild(tooltipText);
        view3D.rootEl.appendChild(button);
        this._button = button;
        if (view3D.initialized) {
          yield this._setAvailable(view3D, button, arAvailable);
        } else {
          view3D.once(EVENTS$1.MODEL_CHANGE, () => {
            void this._setAvailable(view3D, button, arAvailable);
          });
        }
      });
    }
    _setAvailable(view3D, button, arAvailable) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!arAvailable) {
          button.disabled = true;
        } else {
          button.disabled = false;
          button.addEventListener("click", () => {
            void view3D.ar.enter();
          });
        }
      });
    }
  }

  /*
   * "Close" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var CloseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48px" height="48px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';

  /**
   * An UI that will be displayed on top of {@link WebARSession}.
   * This will be automatically added on the overlayRoot of the {@link WebARSession}.
   */
  class AROverlay {
    /**
     * Create new instance of AROverlay
     * @param {object} [options={}] Options for the AROverlay
     */
    constructor({
      className = {},
      showPlaneDetection = true,
      toastText = "Point your device downwards to find the ground and move it around."
    } = {}) {
      this.className = className;
      this.showPlaneDetection = showPlaneDetection;
      this.toastText = toastText;
      this._createElements();
    }
    init(view3D) {
      return __awaiter(this, void 0, void 0, function* () {
        const rootEl = this._rootEl;
        const detectionRoot = this._detectionRootEl;
        const closeButton = this._closeButtonEl;
        const className = Object.assign(Object.assign({}, AROverlay.DEFAULT_CLASS), this.className);
        view3D.on(EVENTS$1.AR_START, ({
          session
        }) => {
          const overlayRoot = session.domOverlay.root;
          if (!overlayRoot) return;
          overlayRoot.appendChild(rootEl);
          const closeButtonHandler = () => {
            void session.exit();
          };
          detectionRoot === null || detectionRoot === void 0 ? void 0 : detectionRoot.classList.add(className.DETECTION_VISIBLE);
          const onPlacedHandler = () => {
            detectionRoot === null || detectionRoot === void 0 ? void 0 : detectionRoot.classList.remove(className.DETECTION_VISIBLE);
          };
          view3D.once(EVENTS$1.AR_MODEL_PLACED, onPlacedHandler);
          closeButton.addEventListener(EVENTS.CLICK, closeButtonHandler);
          view3D.once(EVENTS$1.AR_END, () => {
            if (rootEl.parentElement) {
              rootEl.parentElement.removeChild(rootEl);
            }
            closeButton.removeEventListener(EVENTS.CLICK, closeButtonHandler);
            view3D.off(EVENTS$1.AR_MODEL_PLACED, onPlacedHandler);
          });
        });
      });
    }
    teardown() {
      // DO NOTHING
    }
    _createElements() {
      const className = Object.assign(Object.assign({}, AROverlay.DEFAULT_CLASS), this.className);
      const root = document.createElement(EL_DIV);
      const closeButton = document.createElement(EL_DIV);
      closeButton.classList.add(className.CLOSE_BUTTON);
      closeButton.innerHTML = CloseIcon;
      root.classList.add(className.ROOT);
      root.appendChild(closeButton);
      if (this.showPlaneDetection) {
        this._detectionRootEl = this._createPlaneDetectionElements();
        root.appendChild(this._detectionRootEl);
      }
      this._rootEl = root;
      this._closeButtonEl = closeButton;
    }
    _createPlaneDetectionElements() {
      const className = Object.assign(Object.assign({}, AROverlay.DEFAULT_CLASS), this.className);
      const detectionRoot = document.createElement(EL_DIV);
      const detectionIcon = document.createElement(EL_DIV);
      const detectionLabel = document.createElement(EL_DIV);
      const detectionPhone = document.createElement(EL_DIV);
      const detectionCube = document.createElement(EL_DIV);
      const detectionPlane = document.createElement(EL_DIV);
      const cubeFaces = range(5).map(() => document.createElement(EL_DIV));
      detectionRoot.classList.add(className.DETECTION_ROOT);
      detectionIcon.classList.add(className.DETECTION_ICON);
      detectionLabel.classList.add(className.DETECTION_TOAST);
      detectionPhone.classList.add(className.DETECTION_PHONE);
      detectionCube.classList.add(className.DETECTION_CUBE);
      detectionPlane.classList.add(className.DETECTION_PLANE);
      detectionLabel.innerHTML = this.toastText;
      cubeFaces.forEach(face => {
        face.classList.add(className.DETECTION_CUBE_FACE);
        detectionCube.appendChild(face);
      });
      detectionIcon.appendChild(detectionPhone);
      detectionIcon.appendChild(detectionCube);
      detectionIcon.appendChild(detectionPlane);
      detectionRoot.appendChild(detectionIcon);
      detectionRoot.appendChild(detectionLabel);
      return detectionRoot;
    }
  }
  /**
   * Default class names that AROverlay uses
   * @type {object}
   * @property {"view3d-ar-root"} ROOT A class name for the root element of AROverlay
   * @property {"view3d-ar-close"} CLOSE_BUTTON A class name for the close button element
   * @property {"view3d-ar-detection"} DETECTION_ROOT A class name for the root element of floor detection annotator
   * @property {"view3d-ar-detection-icon"} DETECTION_ICON A class name for the wrapper element of floor detection icon
   * @property {"view3d-ar-detection-toast"} DETECTION_TOAST A class name for the toast element of floor detection annotator
   * @property {"view3d-ar-phone"} DETECTION_PHONE A class name for the root element of floor detection phone shape
   * @property {"view3d-ar-cube"} DETECTION_CUBE A class name for the root element of floor detection cube
   * @property {"view3d-ar-cube-face"} DETECTION_CUBE_FACE A class name for the face elements of floor detection cube
   * @property {"view3d-ar-plane"} DETECTION_PLANE A class name for the face elements of floor detection plane
   */
  AROverlay.DEFAULT_CLASS = {
    ROOT: "view3d-ar-root",
    CLOSE_BUTTON: "view3d-ar-close",
    DETECTION_ROOT: "view3d-ar-detection",
    DETECTION_ICON: "view3d-ar-detection-icon",
    DETECTION_TOAST: "view3d-ar-detection-toast",
    DETECTION_PHONE: "view3d-ar-phone",
    DETECTION_CUBE: "view3d-ar-cube",
    DETECTION_CUBE_FACE: "view3d-ar-cube-face",
    DETECTION_PLANE: "view3d-ar-plane",
    DETECTION_VISIBLE: "visible"
  };

  /**
   * A plugin that displays loading bar while
   */
  class LoadingBar {
    /**
     * Create new instance of LoadingBar
     * @param {LoadingBarOptions} [options={}] Options for the LoadingBar
     */
    constructor(options = {}) {
      this._startLoading = ({
        target: view3D,
        level
      }) => {
        if (level !== 0) return;
        const {
          type = LoadingBar.TYPE.DEFAULT,
          loadingLabel = "Loading 3D Model...",
          parsingLabel = "Parsing 3D Model...",
          labelColor = "#ffffff",
          barWidth = "70%",
          barHeight = "10px",
          barBackground = "#bbbbbb",
          barForeground = "#3e8ed0",
          spinnerWidth = "30%",
          overlayBackground = "rgba(0, 0, 0, 0.3)"
        } = this._options;
        const loadingOverlay = document.createElement(EL_DIV);
        const loadingWrapper = document.createElement(EL_DIV);
        const loadingLabelEl = document.createElement(EL_DIV);
        const loadingBar = document.createElement(EL_DIV);
        const loadingFiller = document.createElement(EL_DIV);
        const className = Object.assign(Object.assign({}, this._options.className), LoadingBar.DEFAULT_CLASS);
        loadingOverlay.classList.add(className.OVERLAY);
        loadingWrapper.classList.add(className.WRAPPER);
        loadingBar.classList.add(className.BASE);
        loadingLabelEl.classList.add(className.LABEL);
        loadingFiller.classList.add(className.FILLER);
        loadingOverlay.style.backgroundColor = overlayBackground;
        if (type !== LoadingBar.TYPE.SPINNER) {
          loadingBar.style.height = barHeight;
          loadingBar.style.backgroundColor = barBackground;
          loadingFiller.style.backgroundColor = barForeground;
        } else {
          loadingBar.classList.add(className.TYPE_SPINNER);
          loadingBar.style.width = spinnerWidth;
          loadingBar.style.paddingTop = spinnerWidth;
          loadingFiller.style.borderWidth = barHeight;
          loadingFiller.style.borderColor = barForeground;
          loadingFiller.style.borderLeftColor = "transparent";
        }
        if (type === LoadingBar.TYPE.TOP) {
          loadingOverlay.classList.add(className.TYPE_TOP);
        } else if (type === LoadingBar.TYPE.DEFAULT) {
          loadingBar.style.width = barWidth;
        }
        loadingLabelEl.style.color = labelColor;
        loadingLabelEl.innerText = loadingLabel;
        loadingBar.appendChild(loadingFiller);
        loadingWrapper.appendChild(loadingBar);
        loadingWrapper.appendChild(loadingLabelEl);
        loadingOverlay.appendChild(loadingWrapper);
        view3D.rootEl.appendChild(loadingOverlay);
        if (type !== LoadingBar.TYPE.SPINNER) {
          const onProgress = () => {
            if (!view3D.loadingContext.every(ctx => ctx.initialized)) return;
            const [loaded, total] = view3D.loadingContext.filter(ctx => ctx.lengthComputable).reduce((values, ctx) => {
              values[0] += ctx.loaded;
              values[1] += ctx.total;
              return values;
            }, [0, 0]);
            if (total <= 0) return;
            const percentage = 100 * (loaded / total);
            loadingFiller.style.width = `${percentage.toFixed(2)}%`;
            if (loaded === total) {
              loadingLabelEl.innerText = parsingLabel;
            }
          };
          view3D.on(EVENTS$1.PROGRESS, onProgress);
          view3D.once(EVENTS$1.LOAD_FINISH, () => {
            view3D.off(EVENTS$1.PROGRESS, onProgress);
          });
        }
        view3D.once(EVENTS$1.LOAD_FINISH, () => {
          this._removeOverlay(view3D);
        });
        this._overlay = loadingOverlay;
      };
      this._options = options;
    }
    init(view3D) {
      return __awaiter(this, void 0, void 0, function* () {
        view3D.on(EVENTS$1.LOAD_START, this._startLoading);
      });
    }
    teardown(view3D) {
      view3D.off(EVENTS$1.LOAD_START, this._startLoading);
      this._removeOverlay(view3D);
    }
    _removeOverlay(view3D) {
      const overlay = this._overlay;
      if (!overlay) return;
      if (overlay.parentElement === view3D.rootEl) {
        view3D.rootEl.removeChild(overlay);
      }
      this._overlay = null;
    }
  }
  /**
   * Default class names that LoadingBar uses
   * @type {object}
   * @property {"view3d-lb-overlay"} OVERLAY A class name for overlay element of LoadingBar plugin
   * @property {"view3d-lb-wrapper"} WRAPPER A class name for wrapper element of LoadingBar plugin
   * @property {"view3d-lb-base"} BASE A class name for progress bar base element of LoadingBar plugin
   * @property {"view3d-lb-label"} LABEL A class name for label element of LoadingBar plugin
   * @property {"view3d-lb-filler"} FILLER A class name for progress bar filler element  of LoadingBar plugin
   * @property {"is-spinner"} TYPE_SPINNER A class name for LoadingBar plugin when the type is "spinner"
   * @property {"is-top"} TYPE_TOP A class name for LoadingBar plugin when the type is "top"
   */
  LoadingBar.DEFAULT_CLASS = {
    OVERLAY: "view3d-lb-overlay",
    WRAPPER: "view3d-lb-wrapper",
    BASE: "view3d-lb-base",
    LABEL: "view3d-lb-label",
    FILLER: "view3d-lb-filler",
    TYPE_SPINNER: "is-spinner",
    TYPE_TOP: "is-top"
  };
  /**
   * Available styles of loading bar
   */
  LoadingBar.TYPE = {
    DEFAULT: "default",
    TOP: "top",
    SPINNER: "spinner"
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Show animation progress bar, use with ControlBar
   */
  class AnimationProgressBar {
    /** */
    constructor(view3D, controlBar, {
      position = ControlBar.POSITION.TOP,
      order = 9999
    } = {}) {
      this._onResize = () => {
        this._rootBbox = this._trackEl.getBoundingClientRect();
      };
      this._onRender = ({
        target: view3D
      }) => {
        const animator = view3D.animator;
        const activeAnimationIdx = animator.activeAnimationIndex;
        const activeAnimationClip = animator.activeAnimation;
        const activeAnimationAction = animator.actions[activeAnimationIdx];
        if (!activeAnimationClip || !activeAnimationAction) return;
        const progress = activeAnimationAction.time / activeAnimationClip.duration;
        this._fill(progress);
      };
      this._onMouseDown = evt => {
        if (evt.button !== MOUSE_BUTTON.LEFT) return;
        const animator = this._view3D.animator;
        const activeAnimationIdx = animator.activeAnimationIndex;
        const activeAnimationAction = animator.actions[activeAnimationIdx];
        evt.preventDefault();
        window.addEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.addEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this._rootBbox = this._trackEl.getBoundingClientRect();
        this._showThumb();
        this._origTimeScale = activeAnimationAction.getEffectiveTimeScale();
        this._setAnimationTimeScale(0);
        this._updateAnimationProgress(evt.pageX);
      };
      this._onMouseMove = evt => {
        evt.preventDefault();
        this._updateAnimationProgress(evt.pageX);
      };
      this._onMouseUp = () => {
        window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
        window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
        this._hideThumb();
        this._setAnimationTimeScale(this._origTimeScale);
      };
      this._onTouchStart = evt => {
        if (evt.touches.length > 1) return;
        const touch = evt.touches[0];
        const animator = this._view3D.animator;
        const activeAnimationIdx = animator.activeAnimationIndex;
        const activeAnimationAction = animator.actions[activeAnimationIdx];
        this._rootBbox = this._trackEl.getBoundingClientRect();
        this._showThumb();
        this._firstTouch = {
          x: touch.pageX,
          y: touch.pageY
        };
        this._origTimeScale = activeAnimationAction.getEffectiveTimeScale();
        this._setAnimationTimeScale(0);
        this._updateAnimationProgress(touch.pageX);
      };
      this._onTouchMove = evt => {
        // Only the one finger motion should be considered
        if (evt.touches.length > 1 || this._scrolling) return;
        const touch = evt.touches[0];
        const scrollable = this._view3D.scrollable;
        const firstTouch = this._firstTouch;
        if (firstTouch) {
          if (scrollable) {
            const delta = new THREE.Vector2(touch.pageX, touch.pageY).sub(new THREE.Vector2(firstTouch.x, firstTouch.y));
            if (Math.abs(delta.y) > Math.abs(delta.x)) {
              // Assume Scrolling
              this._scrolling = true;
              this._release();
              return;
            }
          }
          this._firstTouch = null;
        }
        if (evt.cancelable) {
          evt.preventDefault();
        }
        evt.stopPropagation();
        this._setAnimationTimeScale(0);
        this._updateAnimationProgress(touch.pageX);
      };
      this._onTouchEnd = evt => {
        if (evt.touches.length > 0) return;
        this._release();
        this._scrolling = false;
      };
      this._updateAnimationProgress = x => {
        const view3D = this._view3D;
        const rootBbox = this._rootBbox;
        const thumb = this._thumbEl;
        const animator = view3D.animator;
        const activeAnimationIdx = animator.activeAnimationIndex;
        const activeAnimationClip = animator.activeAnimation;
        const activeAnimationAction = animator.actions[activeAnimationIdx];
        if (!activeAnimationClip || !activeAnimationAction) return;
        const progress = (x - rootBbox.x) / rootBbox.width;
        const newTime = clamp(progress, 0, 1) * activeAnimationClip.duration;
        activeAnimationAction.time = newTime;
        const newTimeSeconds = Math.floor(newTime);
        const newTimeFractions = Math.floor(100 * (newTime - newTimeSeconds));
        const padNumber = val => `${"0".repeat(Math.max(2 - val.toString().length, 0))}${val}`;
        thumb.setAttribute("data-time", `${padNumber(newTimeSeconds)}:${padNumber(newTimeFractions)}`);
        view3D.renderer.renderSingleFrame();
      };
      this.position = position;
      this.order = order;
      this._view3D = view3D;
      this._controlBar = controlBar;
      this._createElements();
      this._enabled = false;
      this._firstTouch = null;
      this._scrolling = false;
      this._origTimeScale = 1;
    }
    get element() {
      return this._rootEl;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      const view3D = this._view3D;
      if (this._enabled) return;
      this._rootBbox = this._trackEl.getBoundingClientRect();
      this._enabled = true;
      view3D.on(EVENTS$1.RESIZE, this._onResize);
      view3D.on(EVENTS$1.RENDER, this._onRender);
      this._fill(0);
      this.enableInput();
    }
    /**
     * Disable control item
     */
    disable() {
      const view3D = this._view3D;
      if (!this._enabled) return;
      this._enabled = false;
      view3D.off(EVENTS$1.RESIZE, this._onResize);
      view3D.off(EVENTS$1.RENDER, this._onRender);
      this.disableInput();
    }
    /**
     * Enable mouse / touch inputs
     */
    enableInput() {
      const root = this._rootEl;
      const view3D = this._view3D;
      this._firstTouch = null;
      this._scrolling = false;
      if (view3D.animator.animationCount <= 0) return;
      root.addEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown);
      root.addEventListener(EVENTS.TOUCH_START, this._onTouchStart, {
        passive: false
      });
      root.addEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove, {
        passive: false
      });
      root.addEventListener(EVENTS.TOUCH_END, this._onTouchEnd);
    }
    /**
     * Disable mouse / touch inputs
     */
    disableInput() {
      const root = this._rootEl;
      root.removeEventListener(EVENTS.MOUSE_DOWN, this._onMouseDown);
      window.removeEventListener(EVENTS.MOUSE_MOVE, this._onMouseMove, false);
      window.removeEventListener(EVENTS.MOUSE_UP, this._onMouseUp, false);
      root.removeEventListener(EVENTS.TOUCH_START, this._onTouchStart);
      root.removeEventListener(EVENTS.TOUCH_MOVE, this._onTouchMove);
      root.removeEventListener(EVENTS.TOUCH_END, this._onTouchEnd);
    }
    _createElements() {
      const controlBar = this._controlBar;
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      const root = document.createElement(EL_DIV);
      root.classList.add(className.PROGRESS_ROOT);
      root.draggable = false;
      const track = document.createElement(EL_DIV);
      track.classList.add(className.PROGRESS_TRACK);
      const thumb = document.createElement(EL_DIV);
      thumb.classList.add(className.PROGRESS_THUMB);
      const filler = document.createElement(EL_DIV);
      filler.classList.add(className.PROGRESS_FILLER);
      track.appendChild(filler);
      track.appendChild(thumb);
      root.appendChild(track);
      this._rootEl = root;
      this._trackEl = track;
      this._thumbEl = thumb;
      this._fillerEl = filler;
    }
    _fill(progress) {
      this._fillerEl.style.width = `${progress * 100}%`;
      this._thumbEl.style.transform = `translateX(${progress * this._rootBbox.width}px)`;
    }
    _release() {
      this._hideThumb();
      this._setAnimationTimeScale(this._origTimeScale);
    }
    _showThumb() {
      const thumb = this._thumbEl;
      const controlBar = this._controlBar;
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      thumb.classList.add(className.VISIBLE);
    }
    _hideThumb() {
      const thumb = this._thumbEl;
      const controlBar = this._controlBar;
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      thumb.classList.remove(className.VISIBLE);
    }
    _setAnimationTimeScale(timeScale) {
      const view3D = this._view3D;
      const animator = view3D.animator;
      const activeAnimationIdx = animator.activeAnimationIndex;
      const activeAnimationClip = animator.activeAnimation;
      const activeAnimationAction = animator.actions[activeAnimationIdx];
      if (!activeAnimationClip || !activeAnimationAction) return;
      activeAnimationAction.setEffectiveTimeScale(timeScale);
    }
  }

  /*
   * "Play Arrow" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var PlayIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="48" width="48"><path d="M16 37.85V9.85L38 23.85Z"/></svg>';

  /*
   * "Pause" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var PauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="48" width="48"><path d="M28.25 38V10H36V38ZM12 38V10H19.75V38Z"/></svg>';

  /**
   * Show animation play/ pause button, use with ControlBar
   */
  class PlayButton {
    /** */
    constructor(view3D, controlBar, {
      position = ControlBar.POSITION.LEFT,
      order = 9999
    } = {}) {
      this._updateIcon = () => {
        const view3D = this._view3D;
        if (view3D.animator.paused !== this._paused) {
          this._paused = view3D.animator.paused;
          this._element.innerHTML = this._paused ? PlayIcon : PauseIcon;
        }
      };
      this._onClick = () => {
        const animator = this._view3D.animator;
        if (animator.paused) {
          animator.resume();
        } else {
          animator.pause();
        }
        this._updateIcon();
      };
      this.position = position;
      this.order = order;
      this._view3D = view3D;
      this._element = this._createButton(controlBar);
      this._enabled = false;
      this._paused = true;
    }
    get element() {
      return this._element;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      if (this._enabled) return;
      this._view3D.on(EVENTS$1.RENDER, this._updateIcon);
      this._element.addEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = true;
    }
    /**
     * Disable control item
     */
    disable() {
      if (!this._enabled) return;
      this._view3D.off(EVENTS$1.RENDER, this._updateIcon);
      this._element.removeEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = false;
    }
    _createButton(controlBar) {
      const root = document.createElement(EL_BUTTON);
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      root.classList.add(className.CONTROLS_ITEM);
      root.innerHTML = PlayIcon;
      return root;
    }
  }

  /**
   * Show animation selector, use with ControlBar
   */
  class AnimationSelector {
    /** */
    constructor(view3D, controlBar, {
      position = ControlBar.POSITION.LEFT,
      order = 9999
    } = {}) {
      this._updateAnimations = () => {
        const view3D = this._view3D;
        const controlBar = this._controlBar;
        const animator = view3D.animator;
        const root = this._rootEl;
        const name = this._nameEl;
        const itemList = this._itemListEl;
        const animations = animator.clips;
        const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
        while (itemList.firstChild) {
          itemList.removeChild(itemList.firstChild);
        }
        if (animations.length <= 0) {
          root.classList.add(className.DISABLED);
          return;
        }
        root.classList.remove(className.DISABLED);
        const elements = animations.map(animation => {
          const el = document.createElement(EL_DIV);
          el.classList.add(className.ANIMATION_ITEM);
          el.innerHTML = animation.name;
          return el;
        });
        const selectAnimation = (animation, idx) => {
          elements[idx].classList.add(className.ANIMATION_SELECTED);
          name.innerHTML = animation.name;
        };
        animations.forEach((animation, idx) => {
          const el = elements[idx];
          if (idx === animator.activeAnimationIndex) {
            selectAnimation(animation, idx);
          }
          el.addEventListener(EVENTS.CLICK, evt => {
            const wasPaused = animator.paused;
            animator.play(idx);
            if (wasPaused) {
              animator.pause();
            }
            elements.forEach(element => {
              element.classList.remove(className.ANIMATION_SELECTED);
            });
            selectAnimation(animation, idx);
            this._hideList();
            evt.stopPropagation();
          });
          itemList.appendChild(el);
        });
      };
      this._toggleList = evt => {
        const controlBar = this._controlBar;
        const itemList = this._itemListEl;
        const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
        itemList.classList.toggle(className.VISIBLE);
        if (itemList.classList.contains(className.VISIBLE)) {
          this._view3D.rootEl.addEventListener(EVENTS.CLICK, this._hideList);
        }
        evt.stopPropagation();
      };
      this._hideList = () => {
        const controlBar = this._controlBar;
        const itemList = this._itemListEl;
        const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
        if (itemList.classList.contains(className.VISIBLE)) {
          itemList.classList.remove(className.VISIBLE);
        }
      };
      this.position = position;
      this.order = order;
      this._view3D = view3D;
      this._controlBar = controlBar;
      this._createElements();
      this._enabled = false;
    }
    get element() {
      return this._rootEl;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      if (this._enabled) return;
      if (this._view3D.initialized) {
        this._updateAnimations();
      }
      this._view3D.on(EVENTS$1.MODEL_CHANGE, this._updateAnimations);
      this._nameEl.addEventListener(EVENTS.CLICK, this._toggleList);
      this._enabled = true;
    }
    /**
     * Disable control item
     */
    disable() {
      if (!this._enabled) return;
      this._view3D.off(EVENTS$1.MODEL_CHANGE, this._updateAnimations);
      this._view3D.rootEl.removeEventListener(EVENTS.CLICK, this._hideList);
      this._nameEl.removeEventListener(EVENTS.CLICK, this._toggleList);
      this._enabled = false;
    }
    _createElements() {
      const controlBar = this._controlBar;
      const root = document.createElement(EL_DIV);
      const name = document.createElement(EL_DIV);
      const itemList = document.createElement(EL_DIV);
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      root.classList.add(className.CONTROLS_ITEM);
      root.classList.add(className.DISABLED);
      name.classList.add(className.ANIMATION_NAME);
      itemList.classList.add(className.ANIMATION_LIST);
      root.appendChild(name);
      root.appendChild(itemList);
      this._rootEl = root;
      this._nameEl = name;
      this._itemListEl = itemList;
    }
  }

  /*
   * "Fullscreen" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var FullscreenIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="48" width="48"><path d="M10 38v-9.65h3V35h6.65v3Zm0-18.35V10h9.65v3H13v6.65ZM28.35 38v-3H35v-6.65h3V38ZM35 19.65V13h-6.65v-3H38v9.65Z"/></svg>';

  const requestFullscreen = ["requestFullscreen", "webkitRequestFullscreen", "webkitRequestFullScreen", "webkitCancelFullScreen", "mozRequestFullScreen", "msRequestFullscreen"];
  const fullscreenElement = ["fullscreenElement", "webkitFullscreenElement", "webkitCurrentFullScreenElement", "mozFullScreenElement", "msFullscreenElement"];
  const exitFullscreen = ["exitFullscreen", "webkitExitFullscreen", "webkitCancelFullScreen", "mozCancelFullScreen", "msExitFullscreen"];
  /**
   * Show fullscreen enter / exit button, use with ControlBar
   */
  class FullscreenButton {
    /** */
    constructor(view3D, controlBar, {
      position = ControlBar.POSITION.RIGHT,
      order = 9999
    } = {}) {
      this._onClick = () => {
        const root = this._view3D.rootEl;
        if (this._isFullscreen()) {
          this._exitFullscreen();
        } else {
          this._requestFullscreen(root);
        }
      };
      this.position = position;
      this.order = order;
      this._view3D = view3D;
      this._element = this._createButton(controlBar);
      this._enabled = false;
    }
    get element() {
      return this._element;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      if (this._enabled) return;
      this._element.addEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = true;
    }
    /**
     * Disable control item
     */
    disable() {
      if (!this._enabled) return;
      this._element.removeEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = false;
    }
    _isFullscreen() {
      if (!document) return false;
      for (const key of fullscreenElement) {
        if (document[key]) return true;
      }
      return false;
    }
    _requestFullscreen(el) {
      for (const key of requestFullscreen) {
        const request = el[key];
        if (request) {
          request.call(el);
        }
      }
    }
    _exitFullscreen() {
      for (const key of exitFullscreen) {
        const exit = document[key];
        if (exit) {
          exit.call(document);
        }
      }
    }
    _createButton(controlBar) {
      const root = document.createElement(EL_BUTTON);
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      root.classList.add(className.CONTROLS_ITEM);
      root.innerHTML = FullscreenIcon;
      return root;
    }
  }

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Show navigation gizmos, use with ControlBar
   */
  class NavigationGizmo {
    /** */
    constructor(view3D, controlBar, {
      axisWidth = 5,
      font = "14px sans-serif",
      xAxisColor = "#ef2746",
      yAxisColor = "#a7c031",
      zAxisColor = "#6571a6"
    } = {}) {
      /**
       *
       */
      this._onRender = () => {
        const view3D = this._view3D;
        const ctx = this._ctx;
        const canvasSize = this._canvasSize;
        const camera = view3D.camera.threeCamera;
        if (!ctx || !view3D.model) return;
        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);
        const quat = camera.quaternion.clone();
        quat.invert();
        const xPos = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        const yPos = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
        const zPos = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
        const center = new THREE.Vector2(0.5, 0.5).multiply(canvasSize);
        ctx.lineCap = "round";
        ctx.lineWidth = this.axisWidth;
        const xColor = new THREE.Color(this.xAxisColor);
        const yColor = new THREE.Color(this.yAxisColor);
        const zColor = new THREE.Color(this.zAxisColor);
        // Sorted by distance, ASC
        const axisPositions = [{
          idx: 0,
          axis: "X",
          color: xColor,
          pos: xPos,
          negative: false
        }, {
          idx: 1,
          axis: "Y",
          color: yColor,
          pos: yPos,
          negative: false
        }, {
          idx: 2,
          axis: "Z",
          color: zColor,
          pos: zPos,
          negative: false
        }, {
          idx: 3,
          axis: "X",
          color: xColor,
          pos: xPos.clone().negate(),
          negative: true
        }, {
          idx: 4,
          axis: "Y",
          color: yColor,
          pos: yPos.clone().negate(),
          negative: true
        }, {
          idx: 5,
          axis: "Z",
          color: zColor,
          pos: zPos.clone().negate(),
          negative: true
        }].sort((a, b) => a.pos.z - b.pos.z);
        axisPositions.forEach(({
          axis,
          pos,
          color,
          negative,
          idx
        }, renderIdx) => {
          const screenPos = this._getScreenPos(pos);
          const alpha = pos.z >= 0 ? 1 : 0.6;
          const colorRGBA = this._getColorRGBAString(color, alpha);
          if (!negative) {
            ctx.strokeStyle = colorRGBA;
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(screenPos.x, screenPos.y);
            ctx.stroke();
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.ellipse(screenPos.x, screenPos.y, 10, 10, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.fillStyle = colorRGBA;
          ctx.beginPath();
          ctx.ellipse(screenPos.x, screenPos.y, 10, 10, 0, 0, 2 * Math.PI);
          ctx.fill();
          if (!negative) {
            ctx.font = this.font;
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(axis, screenPos.x, screenPos.y);
          }
          const axisEl = this._axisEls[idx];
          axisEl.style.left = `${screenPos.x}px`;
          axisEl.style.top = `${screenPos.y}px`;
          axisEl.style.zIndex = renderIdx.toString();
        });
      };
      this.axisWidth = axisWidth;
      this.font = font;
      this.xAxisColor = xAxisColor;
      this.yAxisColor = yAxisColor;
      this.zAxisColor = zAxisColor;
      this._view3D = view3D;
      this._createElement(controlBar);
      this._ctx = this._canvasEl.getContext("2d");
      this._enabled = false;
      this._canvasSize = new THREE.Vector2();
    }
    get element() {
      return this._rootEl;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      if (this._enabled || !this._ctx) return;
      const root = this._rootEl;
      const canvas = this._canvasEl;
      const view3D = this._view3D;
      this._enabled = true;
      view3D.rootEl.appendChild(root);
      view3D.on(EVENTS$1.RENDER, this._onRender);
      this._canvasSize.set(canvas.clientWidth, canvas.clientHeight);
      canvas.width = this._canvasSize.x;
      canvas.height = this._canvasSize.y;
      const poses = [new Pose(-90, 0, 0), new Pose(0, 90, 0), new Pose(0, 0, 0), new Pose(90, 0, 0), new Pose(0, -90, 0), new Pose(180, 0, 0)];
      poses.forEach(pose => {
        pose.pivot.copy(view3D.camera.defaultPose.pivot);
      });
      this._axisClickListeners = this._axisEls.map((el, idx) => {
        const targetPose = poses[idx];
        const listener = () => {
          void view3D.camera.reset(ANIMATION_DURATION, EASING$1, targetPose);
        };
        el.addEventListener(EVENTS.CLICK, listener);
        return listener;
      });
    }
    /**
     * Disable control item
     */
    disable() {
      if (!this._enabled) return;
      this._enabled = false;
      const root = this._view3D.rootEl;
      const element = this._rootEl;
      if (element && element.parentElement === root) {
        root.removeChild(element);
      }
      this._view3D.off(EVENTS$1.RENDER, this._onRender);
      this._axisEls.forEach((el, idx) => {
        const listener = this._axisClickListeners[idx];
        el.removeEventListener(EVENTS.CLICK, listener);
      });
      this._axisClickListeners = [];
    }
    _createElement(controlBar) {
      const root = document.createElement(EL_DIV);
      const canvas = document.createElement("canvas");
      const axisEls = range(6).map(() => document.createElement(EL_DIV));
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      root.classList.add(className.GIZMO_ROOT);
      root.appendChild(canvas);
      axisEls.forEach(el => {
        el.classList.add(className.GIZMO_AXIS);
        root.appendChild(el);
      });
      this._rootEl = root;
      this._canvasEl = canvas;
      this._axisEls = axisEls;
    }
    _getScreenPos(pos) {
      const canvasSize = this._canvasSize;
      const screenPos = new THREE.Vector2(pos.x, -pos.y).multiplyScalar(0.8).addScalar(1).multiplyScalar(0.5).multiply(canvasSize);
      return screenPos;
    }
    _getColorRGBAString(color, alpha) {
      return `rgba(${Math.floor(color.r * 255)},${Math.floor(color.g * 255)},${Math.floor(color.b * 255)},${alpha})`;
    }
  }

  /*
   * "Replay" Icon from [Google Material Design Icons](https://github.com/google/material-design-icons)
   * Licensed under [Apache Lincese Version 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)
   */
  // eslint-disable-next-line quotes
  var ResetIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="48" width="48"><path d="M24 44q-3.75 0-7.025-1.4-3.275-1.4-5.725-3.85Q8.8 36.3 7.4 33.025 6 29.75 6 26h3q0 6.25 4.375 10.625T24 41q6.25 0 10.625-4.375T39 26q0-6.25-4.25-10.625T24.25 11H23.1l3.65 3.65-2.05 2.1-7.35-7.35 7.35-7.35 2.05 2.05-3.9 3.9H24q3.75 0 7.025 1.4 3.275 1.4 5.725 3.85 2.45 2.45 3.85 5.725Q42 22.25 42 26q0 3.75-1.4 7.025-1.4 3.275-3.85 5.725-2.45 2.45-5.725 3.85Q27.75 44 24 44Z"/></svg>';

  /**
   * Show camera reset button, use with ControlBar
   */
  class CameraResetButton {
    /** */
    constructor(view3D, controlBar, {
      position = ControlBar.POSITION.RIGHT,
      order = 9999,
      duration = 500
    } = {}) {
      this._onClick = () => {
        void this._view3D.camera.reset(this.duration);
      };
      this.position = position;
      this.order = order;
      this.duration = duration;
      this._view3D = view3D;
      this._element = this._createButton(controlBar);
      this._enabled = false;
    }
    get element() {
      return this._element;
    }
    get enabled() {
      return this._enabled;
    }
    /**
     * Enable control item
     */
    enable() {
      if (this._enabled) return;
      this._element.addEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = true;
    }
    /**
     * Disable control item
     */
    disable() {
      if (!this._enabled) return;
      this._element.removeEventListener(EVENTS.CLICK, this._onClick);
      this._enabled = false;
    }
    _createButton(controlBar) {
      const root = document.createElement(EL_BUTTON);
      const className = Object.assign(Object.assign({}, controlBar.className), ControlBar.DEFAULT_CLASS);
      root.classList.add(className.CONTROLS_ITEM);
      root.innerHTML = ResetIcon;
      return root;
    }
  }

  /**
   * Add a bar at the bottom of the canvas that can control animation and other things
   */
  class ControlBar {
    /** */
    constructor({
      autoHide = true,
      className = {},
      progressBar = true,
      playButton = true,
      animationSelector = true,
      fullscreenButton = true,
      navigationGizmo = true,
      cameraResetButton = true
    } = {}) {
      /**
       * Show control bar
       */
      this.show = () => {
        const root = this._rootEl;
        const className = Object.assign(Object.assign({}, ControlBar.DEFAULT_CLASS), this.className);
        root.classList.add(className.VISIBLE);
      };
      /**
       * Hide control bar
       */
      this.hide = () => {
        const wrapper = this._rootEl;
        const className = Object.assign(Object.assign({}, ControlBar.DEFAULT_CLASS), this.className);
        wrapper.classList.remove(className.VISIBLE);
      };
      this._updateModelParams = () => {
        this._items.forEach(item => {
          // Re-enable control items for new View3D instance
          item.disable();
          item.enable();
        });
      };
      this._hideAfterDelay = () => {
        const {
          delay = 0
        } = getObjectOption(this.autoHide);
        if (this._autoHideTimer) {
          window.clearTimeout(this._autoHideTimer);
          this._autoHideTimer = -1;
        }
        if (delay <= 0) {
          this.hide();
        } else {
          this._autoHideTimer = window.setTimeout(this.hide, delay);
        }
      };
      this.autoHide = autoHide;
      this.className = className;
      this.progressBar = progressBar;
      this.playButton = playButton;
      this.animationSelector = animationSelector;
      this.fullscreenButton = fullscreenButton;
      this.navigationGizmo = navigationGizmo;
      this.cameraResetButton = cameraResetButton;
      this._items = [];
      this._initElements();
      this._autoHideTimer = -1;
    }
    get rootEl() {
      return this._rootEl;
    }
    get items() {
      return this._items;
    }
    init(view3D) {
      return __awaiter(this, void 0, void 0, function* () {
        this._attachElements(view3D);
        if (view3D.model) {
          this._updateModelParams();
        }
        this._items = this._createDefaultItems(view3D);
        this._addItemElements();
        this._items.forEach(item => {
          item.enable();
        });
        view3D.on(EVENTS$1.MODEL_CHANGE, this._updateModelParams);
        this.show();
        this._setupAutoHide(view3D);
      });
    }
    teardown(view3D) {
      const root = view3D.rootEl;
      root.removeEventListener(EVENTS.POINTER_ENTER, this.show);
      root.removeEventListener(EVENTS.POINTER_LEAVE, this._hideAfterDelay);
      this._removeElements(view3D);
      this._items.forEach(item => {
        item.disable();
      });
      this._items = [];
      view3D.off(EVENTS$1.MODEL_CHANGE, this._updateModelParams);
      window.clearTimeout(this._autoHideTimer);
    }
    _initElements() {
      const className = Object.assign(Object.assign({}, ControlBar.DEFAULT_CLASS), this.className);
      const rootEl = document.createElement(EL_DIV);
      rootEl.classList.add(className.ROOT);
      this._rootEl = rootEl;
      const bgEl = document.createElement(EL_DIV);
      bgEl.classList.add(className.CONTROLS_BG);
      rootEl.appendChild(bgEl);
      const topControlsWrapper = document.createElement(EL_DIV);
      const sideControlsWrapper = document.createElement(EL_DIV);
      const leftControlsWrapper = document.createElement(EL_DIV);
      const rightControlsWrapper = document.createElement(EL_DIV);
      topControlsWrapper.classList.add(className.CONTROLS_TOP);
      sideControlsWrapper.classList.add(className.CONTROLS_SIDE);
      leftControlsWrapper.classList.add(className.CONTROLS_LEFT);
      rightControlsWrapper.classList.add(className.CONTROLS_RIGHT);
      rootEl.appendChild(topControlsWrapper);
      sideControlsWrapper.appendChild(leftControlsWrapper);
      sideControlsWrapper.appendChild(rightControlsWrapper);
      rootEl.appendChild(sideControlsWrapper);
      this._topControlsWrapper = topControlsWrapper;
      this._leftControlsWrapper = leftControlsWrapper;
      this._rightControlsWrapper = rightControlsWrapper;
    }
    _addItemElements() {
      const topControlsWrapper = this._topControlsWrapper;
      const leftControlsWrapper = this._leftControlsWrapper;
      const rightControlsWrapper = this._rightControlsWrapper;
      const positionedItems = this._items.filter(item => item.position && item.order != null);
      const posMap = {
        [ControlBar.POSITION.TOP]: {
          parentEl: topControlsWrapper,
          items: []
        },
        [ControlBar.POSITION.LEFT]: {
          parentEl: leftControlsWrapper,
          items: []
        },
        [ControlBar.POSITION.RIGHT]: {
          parentEl: rightControlsWrapper,
          items: []
        }
      };
      positionedItems.forEach(item => {
        posMap[item.position].items.push(item);
      });
      Object.keys(posMap).forEach(posKey => {
        const position = posMap[posKey];
        const {
          parentEl,
          items
        } = position;
        items.sort((a, b) => a.order - b.order);
        items.forEach(item => {
          parentEl.appendChild(item.element);
        });
      });
    }
    _attachElements(view3D) {
      view3D.rootEl.appendChild(this._rootEl);
    }
    _removeElements(view3D) {
      const wrapper = this._rootEl;
      const topControlsWrapper = this._topControlsWrapper;
      const leftControlsWrapper = this._leftControlsWrapper;
      const rightControlsWrapper = this._rightControlsWrapper;
      [topControlsWrapper, leftControlsWrapper, rightControlsWrapper].forEach(itemWrapper => {
        while (itemWrapper.firstChild) {
          itemWrapper.removeChild(itemWrapper.firstChild);
        }
      });
      if (wrapper.parentElement === view3D.rootEl) {
        view3D.rootEl.removeChild(wrapper);
      }
    }
    _setupAutoHide(view3D) {
      if (!this.autoHide) return;
      const {
        initialDelay = 3000
      } = getObjectOption(this.autoHide);
      const root = view3D.rootEl;
      this._autoHideTimer = window.setTimeout(() => {
        this.hide();
      }, initialDelay);
      root.addEventListener(EVENTS.POINTER_ENTER, this.show);
      root.addEventListener(EVENTS.POINTER_LEAVE, this._hideAfterDelay);
    }
    _createDefaultItems(view3D) {
      const items = [];
      if (this.progressBar) {
        items.push(new AnimationProgressBar(view3D, this, getObjectOption(this.progressBar)));
      }
      if (this.playButton) {
        items.push(new PlayButton(view3D, this, getObjectOption(this.playButton)));
      }
      if (this.animationSelector) {
        items.push(new AnimationSelector(view3D, this, getObjectOption(this.animationSelector)));
      }
      if (this.cameraResetButton) {
        items.push(new CameraResetButton(view3D, this, getObjectOption(this.cameraResetButton)));
      }
      if (this.fullscreenButton) {
        items.push(new FullscreenButton(view3D, this, getObjectOption(this.fullscreenButton)));
      }
      if (this.navigationGizmo) {
        items.push(new NavigationGizmo(view3D, this, getObjectOption(this.navigationGizmo)));
      }
      return items;
    }
  }
  /**
   * Default class names that ControlBar uses
   * @type {object}
   * @property {"view3d-control-bar"} ROOT A class name for wrapper element
   * @property {"visible"} VISIBLE A class name for visible elements
   * @property {"disabled"} DISABLED A class name for disabled elements
   * @property {"view3d-controls-background"} CONTROLS_BG A class name for background element
   * @property {"view3d-side-controls"} CONTROLS_SIDE A class name for controls wrapper element that includes both left & right controls
   * @property {"view3d-top-controls"} CONTROLS_TOP A class name for controls wrapper element that is placed on the top inside the control bar
   * @property {"view3d-left-controls"} CONTROLS_LEFT A class name for controls wrapper element that is placed on the left inside the control bar
   * @property {"view3d-right-controls"} CONTROLS_RIGHT A class name for controls wrapper element that is placed on the right inside the control bar
   * @property {"view3d-control-item"} CONTROLS_ITEM A class name for control item elements
   * @property {"view3d-progress-bar"} PROGRESS_ROOT A class name for root element of the progress bar
   * @property {"view3d-progress-track"} PROGRESS_TRACK A class name for progress track element of the progress bar
   * @property {"view3d-progress-thumb"} PROGRESS_THUMB A class name for thumb element of the progress bar
   * @property {"view3d-progress-filler"} PROGRESS_FILLER A class name for progress filler element of the progress bar
   * @property {"view3d-animation-name"} ANIMATION_NAME A class name for animation name element of the animation selector
   * @property {"view3d-animation-list"} ANIMATION_LIST A class name for animation list element of the animation selector
   * @property {"view3d-animation-item"} ANIMATION_ITEM A class name for animation list item element of the animation selector
   * @property {"selected"} ANIMATION_SELECTED A class name for selected animation list item element of the animation selector
   * @property {"view3d-gizmo"} GIZMO_ROOT A class name for root element of the navigation gizmo
   * @property {"view3d-gizmo-axis"} GIZMO_AXIS A class name for axis button element of the navigation gizmo
   */
  ControlBar.DEFAULT_CLASS = {
    ROOT: "view3d-control-bar",
    VISIBLE: "visible",
    DISABLED: "disabled",
    CONTROLS_BG: "view3d-controls-background",
    CONTROLS_SIDE: "view3d-side-controls",
    CONTROLS_TOP: "view3d-top-controls",
    CONTROLS_LEFT: "view3d-left-controls",
    CONTROLS_RIGHT: "view3d-right-controls",
    CONTROLS_ITEM: "view3d-control-item",
    PROGRESS_ROOT: "view3d-progress-bar",
    PROGRESS_TRACK: "view3d-progress-track",
    PROGRESS_THUMB: "view3d-progress-thumb",
    PROGRESS_FILLER: "view3d-progress-filler",
    ANIMATION_NAME: "view3d-animation-name",
    ANIMATION_LIST: "view3d-animation-list",
    ANIMATION_ITEM: "view3d-animation-item",
    ANIMATION_SELECTED: "selected",
    GIZMO_ROOT: "view3d-gizmo",
    GIZMO_AXIS: "view3d-gizmo-axis"
  };
  /**
   * Position constant
   * @type {object}
   * @property {"top"} TOP
   * @property {"left"} LEFT
   * @property {"right"} RIGHT
   */
  ControlBar.POSITION = {
    TOP: "top",
    LEFT: "left",
    RIGHT: "right"
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  /**
   * Check whether View3D can be initialized without any issues.
   * View3D supports browsers with es6+ support.
   * @param {object} [features={}] Features to test
   * @returns {boolean} A boolean value indicating whether View3D is avilable
   */
  const isAvailable = ({
    webGL = true,
    fetch = true,
    stream = true,
    wasm = true
  } = {}) => {
    if (webGL) {
      const webglAvailable = checkWebGLAvailability();
      if (!webglAvailable) return false;
    }
    if (fetch) {
      const fetchAvailable = window && window.fetch;
      if (!fetchAvailable) return false;
    }
    if (stream) {
      const streamAvailable = window && window.ReadableStream;
      if (!streamAvailable) return false;
    }
    if (wasm) {
      const wasmAvailable = checkWASMAvailability();
      if (!wasmAvailable) return false;
    }
    return true;
  };
  const checkWebGLAvailability = () => {
    try {
      const canvas = document.createElement("canvas");
      return !!window.WebGLRenderingContext && !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    } catch (e) {
      return false;
    }
  };
  const checkWASMAvailability = () => {
    try {
      if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
        const wasmModule = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
        if (wasmModule instanceof WebAssembly.Module) {
          return new WebAssembly.Instance(wasmModule) instanceof WebAssembly.Instance;
        }
      }
    } catch (e) {
      return false;
    }
  };

  const withMethods = (prototype, attr) => {
    [Component.prototype, View3D.prototype].forEach(proto => {
      Object.getOwnPropertyNames(proto).filter(name => name.charAt(0) !== "_" && name !== "constructor").forEach(name => {
        const descriptor = Object.getOwnPropertyDescriptor(proto, name);
        if (descriptor.value) {
          // Public Function
          Object.defineProperty(prototype, name, {
            value: function (...args) {
              return descriptor.value.call(this[attr], ...args);
            }
          });
        } else {
          const getterDescriptor = {};
          if (descriptor.get) {
            getterDescriptor.get = function () {
              var _a;
              return this[attr] && ((_a = descriptor.get) === null || _a === void 0 ? void 0 : _a.call(this[attr]));
            };
          }
          if (descriptor.set) {
            getterDescriptor.set = function (...args) {
              var _a;
              return (_a = descriptor.set) === null || _a === void 0 ? void 0 : _a.call(this[attr], ...args);
            };
          }
          Object.defineProperty(prototype, name, getterDescriptor);
        }
      });
    });
  };

  const getValidProps = propsObj => {
    return Object.keys(propsObj).reduce((props, propName) => {
      if (propsObj[propName] != null) {
        props[propName] = propsObj[propName];
      }
      return props;
    }, {});
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */

  var modules = {
    __proto__: null,
    'default': View3D,
    Animation: Animation,
    ARManager: ARManager,
    AutoPlayer: AutoPlayer,
    AutoResizer: AutoResizer,
    Camera: Camera,
    Model: Model,
    ModelAnimator: ModelAnimator,
    Motion: Motion,
    Pose: Pose,
    Renderer: Renderer,
    Scene: Scene,
    ShadowPlane: ShadowPlane,
    Skybox: Skybox,
    View3DError: View3DError,
    Annotation: Annotation,
    PointAnnotation: PointAnnotation,
    FaceAnnotation: FaceAnnotation,
    AnnotationManager: AnnotationManager,
    AnimationControl: AnimationControl,
    OrbitControl: OrbitControl,
    RotateControl: RotateControl,
    TranslateControl: TranslateControl,
    ZoomControl: ZoomControl,
    Loader: Loader,
    GLTFLoader: GLTFLoader$1,
    TextureLoader: TextureLoader,
    ARButton: ARButton,
    AROverlay: AROverlay,
    LoadingBar: LoadingBar,
    ControlBar: ControlBar,
    AnimationProgressBar: AnimationProgressBar,
    AnimationSelector: AnimationSelector,
    FullscreenButton: FullscreenButton,
    PlayButton: PlayButton,
    NavigationGizmo: NavigationGizmo,
    ARScene: ARScene,
    WebARSession: WebARSession,
    SceneViewerSession: SceneViewerSession,
    QuickLookSession: QuickLookSession,
    DOMOverlay: DOMOverlay,
    HitTest: HitTest,
    LightEstimation: LightEstimation,
    AUTO: AUTO,
    EVENTS: EVENTS$1,
    EASING: EASING,
    DEFAULT_CLASS: DEFAULT_CLASS,
    TONE_MAPPING: TONE_MAPPING,
    ZOOM_TYPE: ZOOM_TYPE,
    AR_SESSION_TYPE: AR_SESSION_TYPE,
    SCENE_VIEWER_MODE: SCENE_VIEWER_MODE,
    QUICK_LOOK_APPLE_PAY_BUTTON_TYPE: QUICK_LOOK_APPLE_PAY_BUTTON_TYPE,
    QUICK_LOOK_CUSTOM_BANNER_SIZE: QUICK_LOOK_CUSTOM_BANNER_SIZE,
    INPUT_TYPE: INPUT_TYPE,
    ANIMATION_REPEAT_MODE: ANIMATION_REPEAT_MODE,
    ERROR_CODES: ERROR_CODES,
    isAvailable: isAvailable,
    withMethods: withMethods,
    getValidProps: getValidProps,
    isNumber: isNumber,
    isString: isString,
    isElement: isElement,
    getNullableElement: getNullableElement,
    getElement: getElement,
    findCanvas: findCanvas,
    isCSSSelector: isCSSSelector,
    range: range,
    toRadian: toRadian,
    toDegree: toDegree,
    clamp: clamp,
    lerp: lerp,
    circulate: circulate,
    merge: merge,
    getBoxPoints: getBoxPoints,
    toPowerOfTwo: toPowerOfTwo,
    getPrimaryAxisIndex: getPrimaryAxisIndex,
    getRotationAngle: getRotationAngle,
    getObjectOption: getObjectOption,
    toBooleanString: toBooleanString,
    getRotatedPosition: getRotatedPosition,
    directionToYawPitch: directionToYawPitch,
    createLoadingContext: createLoadingContext,
    getAttributeScale: getAttributeScale,
    getSkinnedVertex: getSkinnedVertex,
    isSignedArrayBuffer: isSignedArrayBuffer,
    checkHalfFloatAvailable: checkHalfFloatAvailable,
    getFaceVertices: getFaceVertices,
    getAnimatedFace: getAnimatedFace,
    subclip: subclip,
    parseAsBboxRatio: parseAsBboxRatio
  };

  /*
   * Copyright (c) 2020 NAVER Corp.
   * egjs projects are licensed under the MIT license
   */
  merge(View3D, modules);

  return View3D;

})));
