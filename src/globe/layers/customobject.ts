import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import {
  GlobeLayer,
  GlobeLayerAttachHook,
  GlobeLayerDataUpdateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerSettingsHook,
  RegistryHook,
} from "../layer";
import { PointData, ScaleData } from "../../data";
import {
  DEFAULT_GLOBE_RADIUS,
  geoDistance,
  KM_TO_LATITUDE,
  KM_TO_LONGITUDE,
  UNIT_KMS,
} from "../common";
import { clamp, lerp } from "three/src/math/MathUtils.js";
import { MAX_CAMERA_DISTANCE, MIN_CAMERA_DISTANCE } from "../../data/camera";

/**
 * Globe layer that draws all objects that need custom implementation (not provided by three-globe).
 *
 * Handles object position {@link PointData#lat}, {@link PointData#lon} and {@link PointData#heightOffset}.
 * Also handles {@link PointData#faceCamera}, {@link PointData#visible}.
 * If "doNotShow" flag is set on an object, it will not make it visible if {@link PointData#visible} returns true.
 *
 * Implements {@link RegistryHook} to access all {@link CustomObjectLayerBuildHook}, {@link CustomObjectLayerPostBuildHook}, {@link CustomObjectLayerFrameUpdateHook}, {@link CustomObjectLayerPostFrameUpdateHook} and {@link CustomObjectProvider}.
 */
export class CustomObjectLayerGroup
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    GlobeLayerDataUpdateHook,
    GlobeLayerFrameUpdateHook,
    RegistryHook
{
  readonly layerName: string = "CustomObjects";
  private settings!: Settings;
  private objects: PointData[] = [];

  private buildHooks: CustomObjectLayerBuildHook[] = [];
  private postBuildHooks: CustomObjectLayerPostBuildHook[] = [];
  private updateHooks: CustomObjectLayerFrameUpdateHook[] = [];
  private postUpdateHooks: CustomObjectLayerPostFrameUpdateHook[] = [];
  private providers: CustomObjectProvider[] = [];

  newLayerAdded(layer: GlobeLayer): void {
    if ((layer as CustomObjectLayerBuildHook).buildObject !== undefined) {
      this.buildHooks.push(layer as CustomObjectLayerBuildHook);
    }
    if (
      (layer as CustomObjectLayerPostBuildHook).postBuildObject !== undefined
    ) {
      this.postBuildHooks.push(layer as CustomObjectLayerPostBuildHook);
    }
    if (
      (layer as CustomObjectLayerFrameUpdateHook).updateObjectFrame !==
      undefined
    ) {
      this.updateHooks.push(layer as CustomObjectLayerFrameUpdateHook);
    }
    if (
      (layer as CustomObjectLayerPostFrameUpdateHook).postUpdateObjectFrame !==
      undefined
    ) {
      this.postUpdateHooks.push(layer as CustomObjectLayerPostFrameUpdateHook);
    }
    if ((layer as CustomObjectProvider).getCurrentObjects !== undefined) {
      this.providers.push(layer as CustomObjectProvider);
    }
  }

  attachToSettings(settings: Settings): void {
    this.settings = settings;
  }

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    globe
      .customLayerData(this.objects)
      .customThreeObject((o: object) => {
        const p = o as PointData;
        const group = new THREE.Group();

        group.visible = false;
        Object.assign(
          group.position,
          globe.getCoords(
            p.lat,
            p.lon,
            p.heightOffset() / DEFAULT_GLOBE_RADIUS,
          ),
        );

        if (p.faceCamera()) {
          group.lookAt(camera.position);
        }

        for (const hook of this.buildHooks) {
          hook.buildObject(group, p);
        }

        for (const postBuildHook of this.postBuildHooks) {
          postBuildHook.postBuildObject(group, p);
        }

        return group;
      })
      .customThreeObjectUpdate((object: THREE.Object3D, o: object) => {
        const p = o as PointData;

        if (p.disperse_on_zoom) {
          const cameraDistance = clamp(
            Math.abs(camera.position.clone().sub(globe.position).length()),
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
          );
          const maxDispersionDistance = this.settings.dispersionZoomThreshold;
          if (cameraDistance < maxDispersionDistance) {
            if (p.dispersed_lon == undefined || p.dispersed_lat == undefined) {
              this.updateDispersionPositions(p, this.settings);
            }
            const startPos = globe.getCoords(
              p.lat,
              p.lon,
              p.heightOffset() / DEFAULT_GLOBE_RADIUS,
            );
            const dispersedPos = globe.getCoords(
              p.dispersed_lat!,
              p.dispersed_lon!,
              p.heightOffset() / DEFAULT_GLOBE_RADIUS,
            );

            if ((p as ScaleData).ignore_zoom) {
              const dispersionDistanceMid =
                MIN_CAMERA_DISTANCE +
                (maxDispersionDistance - MIN_CAMERA_DISTANCE) / 2;
              let dispersionFactor =
                (cameraDistance - dispersionDistanceMid + 1) /
                (dispersionDistanceMid - MIN_CAMERA_DISTANCE + 1);
              if (cameraDistance < dispersionDistanceMid) {
                dispersionFactor =
                  (dispersionDistanceMid - cameraDistance + 1) /
                  (dispersionDistanceMid - MIN_CAMERA_DISTANCE + 10);
              }
              object.position.set(
                lerp(dispersedPos.x, startPos.x, dispersionFactor),
                lerp(dispersedPos.y, startPos.y, dispersionFactor),
                lerp(dispersedPos.z, startPos.z, dispersionFactor),
              );
            } else {
              const dispersionFactor =
                (cameraDistance - MIN_CAMERA_DISTANCE + 1) /
                (maxDispersionDistance - MIN_CAMERA_DISTANCE + 1);
              object.position.set(
                lerp(dispersedPos.x, startPos.x, dispersionFactor),
                lerp(dispersedPos.y, startPos.y, dispersionFactor),
                lerp(dispersedPos.z, startPos.z, dispersionFactor),
              );
            }
          } else {
            Object.assign(
              object.position,
              globe.getCoords(
                p.lat,
                p.lon,
                p.heightOffset() / DEFAULT_GLOBE_RADIUS,
              ),
            );
          }
        }

        if (!p.visible()) {
          object.visible = false;
          return;
        } else {
          if (!object.userData["doNotShow"]) {
            object.visible = true;
          }
        }

        if (p.faceCamera()) {
          object.lookAt(camera.position);
        }

        for (const hook of this.updateHooks) {
          hook.updateObjectFrame(object, p);
        }

        for (const postUpdateHook of this.postUpdateHooks) {
          postUpdateHook.postUpdateObjectFrame(object, p);
        }
      });
  }

  updateData(globe: ThreeGlobe, settings: Settings): void {
    const data = [];
    for (const provider of this.providers) {
      data.push(...provider.getCurrentObjects(settings));
    }
    this.objects = data;
    globe.customLayerData(this.objects);
  }

  updateFrame(globe: ThreeGlobe, _settings: Settings): void {
    globe.customLayerData(this.objects);
  }

  updateDispersionPositions(object: PointData, settings: Settings) {
    const geoDistanceThreshold =
      settings.dispersionDistanceThreshold / UNIT_KMS / DEFAULT_GLOBE_RADIUS;
    const indices = [];
    for (let i = 0; i < this.objects.length; i++) {
      if (!this.objects[i].disperse_on_zoom) {
        continue;
      }
      if (
        geoDistance(
          this.objects[i].lat,
          this.objects[i].lon,
          object.lat,
          object.lon,
        ) < geoDistanceThreshold
      ) {
        indices.push(i);
      }
    }
    if (indices.length <= 1) {
      object.dispersed_lat = object.lat;
      object.dispersed_lon = object.lon;
      return;
    }
    const angleStep = (2 * Math.PI) / indices.length;
    let angle = 0;
    for (const i of indices) {
      this.objects[i].dispersed_lat = clamp(
        this.objects[i].lat +
          Math.sin(angle) * settings.dispersionRadius * KM_TO_LATITUDE,
        -90,
        90,
      );
      this.objects[i].dispersed_lon = clamp(
        this.objects[i].lon +
          Math.cos(angle) * settings.dispersionRadius * KM_TO_LONGITUDE,
        -180,
        180,
      );
      angle += angleStep;
    }
  }
}

/**
 * Hook to add this layers objects to the parent.
 * Make sure to not modify the parent object directly, but just add children to it.
 */
export interface CustomObjectLayerBuildHook extends GlobeLayer {
  /**
   * Called when the object is initialized.
   *
   * @param parent the object root
   * @param object the data for this object
   */
  buildObject(parent: THREE.Object3D, object: PointData): void;
}

/**
 * Hook to access object after all layers are done with their build step
 */
export interface CustomObjectLayerPostBuildHook extends GlobeLayer {
  /**
   * Called after the object is initialized and all layers had a chance to add their children.
   *
   * @param parent the object root
   * @param object the data for this object
   */
  postBuildObject(parent: THREE.Object3D, object: PointData): void;
}

/**
 * Hook to update object each frame
 */
export interface CustomObjectLayerFrameUpdateHook extends GlobeLayer {
  /**
   * Update passed object for this frame, with provided data.
   * NOTE: Make sure to check that this data matches your layer type expectation.
   * All layers get access to all the data!
   *
   * @param parent the object root
   * @param object the data for this object
   */
  updateObjectFrame(parent: THREE.Object3D, object: PointData): void;
}

/**
 * Hook to access object after all layers are done with their update step
 */
export interface CustomObjectLayerPostFrameUpdateHook extends GlobeLayer {
  /**
   * Called after all layers have had a chance to run the update frame step.
   *
   * @param parent the object root
   * @param object the data for this object
   */
  postUpdateObjectFrame(parent: THREE.Object3D, object: PointData): void;
}

/**
 * Provides data to {@link CustomObjectLayerGroup}.
 */
export interface CustomObjectProvider extends GlobeLayer {
  /**
   * Get all objects that should be used currently.
   */
  getCurrentObjects(settings: Settings): PointData[];
}
