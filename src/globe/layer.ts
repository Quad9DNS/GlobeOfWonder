import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings } from "../settings";
import { PointData } from "../data";
import { AppState } from "../service/state";

/**
 * Marker interface for any of the globe layers
 */
export interface GlobeLayer {
  readonly layerName: string;
}

/**
 * Hook for attaching to main globe components
 */
export interface GlobeLayerAttachHook extends GlobeLayer {
  /**
   * Attaches this layer to the globe.
   * This function should run basic setup and initialize any data containers.
   *
   * @param globe the globe to add data into
   * @param camera the camera used to render the scene
   */
  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void;
}

/**
 * Hook for attaching to main scene components
 */
export interface GlobeLayerSceneAttachHook extends GlobeLayer {
  /**
   * Attaches this layer to the main scene.
   * This function should run basic setup and initialize any data containers.
   *
   * @param scene the main scene where globe is rendered in
   * @param camera the camera used to render the scene
   */
  attachToScene(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void;
}

/**
 * Hook for attaching to main settings
 */
export interface GlobeLayerSettingsHook extends GlobeLayer {
  /**
   * Allows access to settings for this layer, to be able to set up settings listeners
   *
   * @param settings the settings to subscribe to
   */
  attachToSettings(settings: Settings): void;
}

/**
 * Hook for attaching to main app state
 */
export interface GlobeLayerAppStateHook extends GlobeLayer {
  /**
   * Allows access to app state for this layer, to be able to react to state changes
   *
   * @param state the state to attach to
   */
  attachToState(state: AppState): void;
}

/**
 * Hook for getting notified before new data comes in
 */
export interface GlobeLayerPreUpdateHook extends GlobeLayer {
  /**
   * Updates internal state of the layer. Called before passing in new data.
   * Old data should be updated and cleaned up at this point.
   */
  preUpdate(): void;
}

/**
 * Hook for getting new data
 */
export interface GlobeLayerNewDataHook extends GlobeLayer {
  /**
   * Called before passing point into this layer.
   * Return false if this point is not compatible with this layer.
   *
   * NOTE: The layer should not store this point anywhere. It should wait for `takeNewPoint` to be called.
   *
   * @param point the point to check
   */
  shouldTakePoint(point: PointData): boolean;

  /**
   * Passes new point into this layer. It can safely take this point now.
   *
   * @param point the point to take in and optionally store
   */
  takeNewPoint(point: PointData): void;
}

/**
 * Hook for updating after taking new data
 */
export interface GlobeLayerDataUpdateHook extends GlobeLayer {
  /**
   * Update the globe with new data. This is called after calling `takeNewPoint` with all the new data
   */
  updateData(globe: ThreeGlobe, settings: Settings): void;
}

/**
 * Hook for updating each frame
 */
export interface GlobeLayerFrameUpdateHook extends GlobeLayer {
  /**
   * Update the globe with new frame. This is called every frame.
   */
  updateFrame(globe: ThreeGlobe, settings: Settings): void;
}

/**
 * Hook for getting notified about new layers added to the registry.
 * Also called for all layers that were added before, to ensure all layers have access to the whole registry.
 */
export interface RegistryHook extends GlobeLayer {
  /**
   * Called when a new layer has been added to the registry. Also added for all layers pre-existing layers at registration time.
   */
  newLayerAdded(layer: GlobeLayer): void;
}

/**
 * Main registry for globe layers.
 * All layers should be registered here.
 * The implementation will use them efficiently for different hooks.
 */
export class GlobeLayerRegistry
  implements
    GlobeLayerAttachHook,
    GlobeLayerSceneAttachHook,
    GlobeLayerSettingsHook,
    GlobeLayerAppStateHook,
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerDataUpdateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "Global registry";

  public attachHooks: GlobeLayerAttachHook[] = [];
  public attachSceneHooks: GlobeLayerSceneAttachHook[] = [];
  public settingsHooks: GlobeLayerSettingsHook[] = [];
  public stateHooks: GlobeLayerAppStateHook[] = [];
  public preUpdateHooks: GlobeLayerPreUpdateHook[] = [];
  public newDataHooks: GlobeLayerNewDataHook[] = [];
  public dataUpdateHooks: GlobeLayerDataUpdateHook[] = [];
  public frameUpdateHooks: GlobeLayerFrameUpdateHook[] = [];
  public allLayers: GlobeLayer[] = [];
  public registryHooks: RegistryHook[] = [];

  /**
   * Adds the new layer to this registry.
   * Also notifies all the {@link RegistryHook} implementations about the new layers
   */
  public registerLayer(layer: GlobeLayer) {
    if ((layer as GlobeLayerAttachHook).attachToGlobe !== undefined) {
      this.attachHooks.push(layer as GlobeLayerAttachHook);
    }
    if ((layer as GlobeLayerSceneAttachHook).attachToScene !== undefined) {
      this.attachSceneHooks.push(layer as GlobeLayerSceneAttachHook);
    }
    if ((layer as GlobeLayerSettingsHook).attachToSettings !== undefined) {
      this.settingsHooks.push(layer as GlobeLayerSettingsHook);
    }
    if ((layer as GlobeLayerAppStateHook).attachToState !== undefined) {
      this.stateHooks.push(layer as GlobeLayerAppStateHook);
    }
    if ((layer as GlobeLayerPreUpdateHook).preUpdate !== undefined) {
      this.preUpdateHooks.push(layer as GlobeLayerPreUpdateHook);
    }
    if ((layer as GlobeLayerNewDataHook).takeNewPoint !== undefined) {
      this.newDataHooks.push(layer as GlobeLayerNewDataHook);
    }
    if ((layer as GlobeLayerDataUpdateHook).updateData !== undefined) {
      this.dataUpdateHooks.push(layer as GlobeLayerDataUpdateHook);
    }
    if ((layer as GlobeLayerFrameUpdateHook).updateFrame !== undefined) {
      this.frameUpdateHooks.push(layer as GlobeLayerFrameUpdateHook);
    }
    if ((layer as RegistryHook).newLayerAdded !== undefined) {
      this.registryHooks.push(layer as RegistryHook);
    }
    for (const registryHook of this.registryHooks) {
      registryHook.newLayerAdded(layer);
    }
    if ((layer as RegistryHook).newLayerAdded !== undefined) {
      for (const existingLayer of this.allLayers) {
        (layer as RegistryHook).newLayerAdded(existingLayer);
      }
    }
    this.allLayers.push(layer);
  }

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    for (const hook of this.attachHooks) {
      hook.attachToGlobe(globe, camera, renderer);
    }
  }

  attachToScene(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    for (const hook of this.attachSceneHooks) {
      hook.attachToScene(scene, camera, renderer);
    }
  }

  attachToSettings(settings: Settings): void {
    for (const hook of this.settingsHooks) {
      hook.attachToSettings(settings);
    }
  }

  attachToState(state: AppState): void {
    for (const hook of this.stateHooks) {
      hook.attachToState(state);
    }
  }

  preUpdate(): void {
    for (const hook of this.preUpdateHooks) {
      hook.preUpdate();
    }
  }

  shouldTakePoint(_point: PointData): boolean {
    return true;
  }

  takeNewPoint(point: PointData): void {
    for (const hook of this.newDataHooks) {
      if (hook.shouldTakePoint(point)) {
        hook.takeNewPoint(point.clone());
      }
    }
  }

  updateData(globe: ThreeGlobe, settings: Settings): void {
    for (const hook of this.dataUpdateHooks) {
      hook.updateData(globe, settings);
    }
  }

  updateFrame(globe: ThreeGlobe, settings: Settings): void {
    for (const hook of this.frameUpdateHooks) {
      hook.updateFrame(globe, settings);
    }
  }
}
