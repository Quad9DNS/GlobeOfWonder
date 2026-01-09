import * as THREE from "three";
import {
  GlobeLayerAppStateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerSceneAttachHook,
} from "../layer";
import { AppState } from "../../service/state";
import {
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
} from "../../data/camera";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import { clamp } from "three/src/math/MathUtils.js";

export class OrbitControlsLayer
  implements
    GlobeLayerSceneAttachHook,
    GlobeLayerAppStateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "OrbitControls";

  private state!: AppState;
  private controls!: OrbitControls;
  private camera!: THREE.Camera;

  attachToScene(
    _scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    this.camera = camera;
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.minDistance = MIN_CAMERA_DISTANCE;
    this.controls.rotateSpeed = 1;
    this.controls.zoomSpeed = 0.8;
    this.controls.maxDistance = MAX_CAMERA_DISTANCE;
    this.controls.enablePan = false;
  }

  attachToState(state: AppState): void {
    state.globeCurrentZoomFactor =
      MIN_CAMERA_DISTANCE / DEFAULT_CAMERA_DISTANCE;
    this.state = state;
  }

  updateFrame(globe: ThreeGlobe, _settings: Settings): void {
    const cameraDistance = Math.abs(
      this.camera.position.clone().sub(globe.position).length(),
    );
    this.state.globeCurrentZoomFactor = MIN_CAMERA_DISTANCE / cameraDistance;
    const zoomFactor = clamp(
      (cameraDistance - MIN_CAMERA_DISTANCE) /
        (MAX_CAMERA_DISTANCE - MIN_CAMERA_DISTANCE),
      0.001,
      1.0,
    );
    this.controls.rotateSpeed = zoomFactor * 1.5;

    this.controls.update();
  }
}
