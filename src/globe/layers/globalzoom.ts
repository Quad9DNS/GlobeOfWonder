import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import {
  GlobeLayerAppStateHook,
  GlobeLayerAttachHook,
  GlobeLayerFrameUpdateHook,
} from "../layer";
import { PointData, ScaleData } from "../../data";
import { AppState } from "../../service/state";
import { clamp, degToRad } from "three/src/math/MathUtils.js";
import { MAX_CAMERA_DISTANCE, MIN_CAMERA_DISTANCE } from "../../data/camera";
import { DirtyFlag } from "./utils/dirty";
import {
  CustomObjectLayerPostBuildHook,
  CustomObjectLayerPostFrameUpdateHook,
} from "./customobject";

/**
 * Globe layer that applies global zoom scale to all objects.
 *
 * Handles {@link ScaleData#ignore_zoom} property.
 */
export class GlobalZoomLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerAppStateHook,
    CustomObjectLayerPostBuildHook,
    CustomObjectLayerPostFrameUpdateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "GlobalZoom";
  private cachedGlobe!: ThreeGlobe;
  private cachedCamera!: THREE.Camera;
  private state: AppState | null = null;
  private dirty = new DirtyFlag();
  private lastZoomLevel: number = -1;

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedCamera = camera;
  }

  postBuildObject(parent: THREE.Object3D, object: PointData): void {
    if ((object as unknown as ScaleData).ignore_zoom) {
      this.scaleObjectToCameraDistance(parent, object);
    }
  }

  postUpdateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (this.dirty.isSet() && (object as unknown as ScaleData).ignore_zoom) {
      this.scaleObjectToCameraDistance(parent, object);
    }
  }

  updateFrame(globe: ThreeGlobe, settings: Settings): void {
    this.dirty.updateFrame(globe, settings);
    if (this.lastZoomLevel != this.state?.globeCurrentZoomFactor) {
      this.dirty.set();
    }
  }

  attachToState(state: AppState) {
    this.state = state;
  }

  private scaleObjectToCameraDistance(object: THREE.Object3D, data: PointData) {
    if (data.applyGlobalScale()) {
      object.scale.setScalar(1);
    } else {
      object.scale.setScalar(data.scale());
    }

    const cameraDistance = clamp(
      Math.abs(
        this.cachedCamera.position
          .clone()
          .sub(this.cachedGlobe.position)
          .length(),
      ),
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );
    const cameraFactor =
      (cameraDistance - MIN_CAMERA_DISTANCE + 1) /
      (MAX_CAMERA_DISTANCE - MIN_CAMERA_DISTANCE + 1);
    let fov = 50;
    if (this.cachedCamera instanceof THREE.PerspectiveCamera) {
      fov = this.cachedCamera.fov;
    }

    const scaleFactor =
      1.0 /
      (1.0 +
        2.0 * (cameraFactor / Math.tan(Math.PI / 2.0 - degToRad(fov) / 2.0)));

    const scaleBy = (1.0 - scaleFactor) * 10.0;
    object.scale.multiply({
      x: scaleBy,
      y: scaleBy,
      z: data.scaleZ() ? scaleBy : 1.0,
    });
  }
}
