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
  CameraPosition,
  distanceToZoom,
  zoomToDistance,
} from "../../data/camera";

const DEFAULT_ZOOM_SPEED_PER_S = 5;
const DEFAULT_ZOOM_SPEED_PER_MS = DEFAULT_ZOOM_SPEED_PER_S / 1000;
const DEFAULT_LAT_MOVE_SPEED_PER_S = 45;
const DEFAULT_LAT_MOVE_SPEED_PER_MS = DEFAULT_LAT_MOVE_SPEED_PER_S / 1000;
const DEFAULT_LON_MOVE_SPEED_PER_S = 90;
const DEFAULT_LON_MOVE_SPEED_PER_MS = DEFAULT_LON_MOVE_SPEED_PER_S / 1000;

export class NewCameraPositionsLayer
  implements
    GlobeLayerSceneAttachHook,
    GlobeLayerAppStateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "NewCameraPositions";

  private nextPosition?: CameraPosition;
  private camera!: THREE.Camera;
  private state!: AppState;
  private lastFrameTime: number = Date.now();

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
    if (this.nextPosition) {
      const newFrameTime = Date.now();
      const frameDeltaMs = newFrameTime - this.lastFrameTime;
      this.lastFrameTime = newFrameTime;

      const {
        lat: currentLat,
        lng: currentLon,
        altitude: _altitude,
      } = globe.toGeoCoords(this.camera.position);

      const [zoom, zoomDone] = this.nextPosition.zoom
        ? this.moveBy(
            distanceToZoom(
              this.camera.position.clone().sub(globe.position).length(),
            ),
            this.nextPosition.zoom,
            frameDeltaMs *
              DEFAULT_ZOOM_SPEED_PER_MS *
              (this.nextPosition.camera_movement_speed ?? 1),
          )
        : [undefined, true];
      const [lat, latDone] = this.moveBy(
        currentLat,
        this.nextPosition.lat,
        frameDeltaMs *
          DEFAULT_LAT_MOVE_SPEED_PER_MS *
          (this.nextPosition.camera_movement_speed ?? 1),
      );
      const [lon, lonDone] = this.moveBy(
        currentLon,
        this.nextPosition.lon,
        frameDeltaMs *
          DEFAULT_LON_MOVE_SPEED_PER_MS *
          (this.nextPosition.camera_movement_speed ?? 1),
        // Longitude can wrap around, so take the shortest distance
        Math.sign(this.nextPosition.lon) != Math.sign(currentLon),
      );

      const lerpedPos: CameraPosition = {
        lat: lat,
        lon: lon > 180.0 ? lon - 360.0 : lon,
        zoom: zoom,
      };

      this.setNewCameraPosition(globe, lerpedPos);

      if (zoomDone && latDone && lonDone) {
        this.nextPosition = undefined;
      }
    } else if (this.state.newCameraPositionsQueue.length > 0) {
      const newCameraPosition = this.state.newCameraPositionsQueue.shift();
      if (newCameraPosition?.instant_move) {
        this.setNewCameraPosition(globe, newCameraPosition);
      } else {
        this.nextPosition = newCameraPosition;
      }
    }
  }

  private setNewCameraPosition(
    globe: ThreeGlobe,
    newCameraPosition: CameraPosition,
  ) {
    const { x, y, z } = globe.getCoords(
      newCameraPosition!.lat,
      newCameraPosition!.lon,
    );
    const globeCameraDirection = new THREE.Vector3(x, y, z)
      .sub(globe.position)
      .normalize();

    const newCameraDistance =
      newCameraPosition?.zoom != undefined
        ? zoomToDistance(newCameraPosition.zoom)
        : this.camera.position.clone().sub(globe.position).length();

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

  private moveBy(
    from: number,
    to: number,
    by: number,
    inverse: boolean = false,
  ): [number, boolean] {
    if (Math.abs(to - from) < by) {
      return [to, true];
    } else {
      return [from + Math.sign(to - from) * (inverse ? -1 : 1) * by, false];
    }
  }
}
