import ThreeGlobe from "three-globe";
import { Settings } from "../../../settings";
import {
  GlobeLayer,
  GlobeLayerDataUpdateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerPreUpdateHook,
  RegistryHook,
} from "../../layer";
import { CustomObjectProvider } from "../customobject";
import { ExplosionData } from "../../../data/explosion";
import {
  binarySearchReplace,
  compareTimeLeft,
  mapAndFilter,
  PointData,
  updateDataForFrame,
} from "../../../data";

/**
 * Globe layer that handles {@link ExplosionData} objects and makes it easier for multiple layers to access them.
 * Serves as an implementation of {@link CustomObjectProvider} for {@link ExplosionData} objects.
 *
 * Implements {@link RegistryHook} to access all {@link ExplosionDataLayer} instances.
 */
export class ExplosionDataLayerGroup
  implements
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerDataUpdateHook,
    RegistryHook,
    GlobeLayerFrameUpdateHook,
    CustomObjectProvider
{
  readonly layerName: string = "ExplosionDataGroup";
  private data: ExplosionData[] = [];
  private subLayers: ExplosionDataLayer[] = [];

  newLayerAdded(layer: GlobeLayer): void {
    if ((layer as ExplosionDataLayer).updateExplosionData !== undefined) {
      this.subLayers.push(layer as ExplosionDataLayer);
    }
  }

  preUpdate(): void {
    mapAndFilter(this.data, { sortedByLifetime: true });
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof ExplosionData;
  }

  takeNewPoint(point: PointData): void {
    // Since explosions are randomized, it makes no sense to replace them if same lat/lon is found
    // Instead, sort by time left, for quicker filtering
    const explosion = (point as ExplosionData).randomizeLocation();
    binarySearchReplace(this.data, explosion, compareTimeLeft, {
      noReplace: true,
    });
  }

  updateData(globe: ThreeGlobe, settings: Settings): void {
    for (const subLayer of this.subLayers) {
      subLayer.updateExplosionData(globe, settings, this.data);
    }
  }

  updateFrame(_globe: ThreeGlobe, _settings: Settings): void {
    updateDataForFrame(this.data);
  }

  getCurrentObjects(settings: Settings): PointData[] {
    let needsCustomObjects = false;
    for (const subLayer of this.subLayers) {
      if (subLayer.needsCustomObjects(settings)) {
        needsCustomObjects = true;
        break;
      }
    }

    if (needsCustomObjects) {
      return this.data;
    } else {
      return [];
    }
  }
}

/**
 * Layer that works with {@link ExplosionData},
 * but does not need full control over the lifetime of these objects.
 */
export interface ExplosionDataLayer extends GlobeLayer {
  /**
   * Called when new data is loaded. Provides all {@link ExplosionData} available in {@link ExplosionDataLayerGroup}.
   */
  updateExplosionData(
    globe: ThreeGlobe,
    settings: Settings,
    data: ExplosionData[],
  ): void;
  /**
   * Should return true if this layer also works as a custom object layer.
   */
  needsCustomObjects(settings: Settings): boolean;
}
