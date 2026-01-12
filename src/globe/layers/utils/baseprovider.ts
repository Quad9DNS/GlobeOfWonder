import ThreeGlobe from "three-globe";
import {
  binarySearchReplace,
  mapAndFilter,
  PointData,
  updateDataForFrame,
} from "../../../data";
import { Settings } from "../../../settings";
import {
  GlobeLayerFrameUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerPreUpdateHook,
  GlobeLayerSettingsHook,
} from "../../layer";
import { CustomObjectProvider } from "../customobject";
import { DEFAULT_GLOBE_RADIUS, geoDistance, UNIT_KMS } from "../../common";

export default abstract class CommonObjectProvider<T extends PointData>
  implements
    GlobeLayerSettingsHook,
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerFrameUpdateHook,
    CustomObjectProvider
{
  abstract readonly layerName: string;

  private data: T[] = [];
  private settings!: Settings;

  abstract layerEnabled(settings: Settings): boolean;
  abstract shouldTakePoint(point: PointData): boolean;

  attachToSettings(settings: Settings): void {
    this.settings = settings;
  }

  updateFrame(_globe: ThreeGlobe, _settings: Settings): void {
    updateDataForFrame(this.data);
  }
  takeNewPoint(point: PointData): void {
    binarySearchReplace(this.data, point);
    // Clear dispersion points, because we have a new point on the circle
    // They should be recalculated on draw
    if (point.disperse_on_zoom) {
      const geoDistanceThreshold =
        this.settings.dispersionDistanceThreshold /
        UNIT_KMS /
        DEFAULT_GLOBE_RADIUS;
      for (let i = 0; i < this.data.length; i++) {
        if (!this.data[i].disperse_on_zoom) {
          continue;
        }
        if (
          geoDistance(
            this.data[i].lat,
            this.data[i].lon,
            point.lat,
            point.lon,
          ) < geoDistanceThreshold
        ) {
          this.data[i].dispersed_lon = undefined;
          this.data[i].dispersed_lat = undefined;
        }
      }
    }
  }
  preUpdate(): void {
    mapAndFilter(this.data);
  }

  getCurrentObjects(settings: Settings): PointData[] {
    if (this.layerEnabled(settings)) {
      return this.data;
    } else {
      return [];
    }
  }
}
