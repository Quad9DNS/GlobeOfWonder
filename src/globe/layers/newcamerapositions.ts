import * as THREE from "three";
import {
  GlobeLayerAppStateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerSceneAttachHook,
} from "../layer";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import { AppState } from "../../service/state";
import {
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
} from "../../data/camera";
import { lerp } from "three/src/math/MathUtils.js";

export class NewCameraPositionsLayer
  implements
    GlobeLayerSceneAttachHook,
    GlobeLayerAppStateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "NewCameraPositions";

  private camera!: THREE.Camera;
  private state!: AppState;

  attachToScene(
    _scene: THREE.Scene,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.camera = camera;
  }

  attachToState(state: AppState): void {
    this.state = state;
  }

  updateFrame(globe: ThreeGlobe, _settings: Settings): void {
    if (this.state.newCameraPositionsQueue.length > 0) {
      const newCameraPosition = this.state.newCameraPositionsQueue.pop();
      const { x, y, z } = globe.getCoords(
        newCameraPosition!.lat,
        newCameraPosition!.lon,
      );
      const globeCameraDirection = new THREE.Vector3(x, y, z)
        .sub(globe.position)
        .normalize();

      const newCameraDistance =
        newCameraPosition!.zoom > 0
          ? lerp(
              MIN_CAMERA_DISTANCE,
              DEFAULT_CAMERA_DISTANCE,
              1 - newCameraPosition!.zoom / 10.0,
            )
          : lerp(
              DEFAULT_CAMERA_DISTANCE,
              MAX_CAMERA_DISTANCE,
              newCameraPosition!.zoom / -10.0,
            );

      const cameraPosition = globe.position
        .clone()
        .add(globeCameraDirection.multiplyScalar(newCameraDistance));
      this.camera.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z,
      );
      this.camera.lookAt(globe.position);
    }
  }
}
