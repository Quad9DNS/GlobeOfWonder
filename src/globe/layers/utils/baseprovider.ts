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
import { ClearMapEvent, CountEvent } from "../../../service/state";

export default abstract class CommonObjectProvider<T extends PointData>
  implements
  GlobeLayerSettingsHook,
  GlobeLayerPreUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerFrameUpdateHook,
  CustomObjectProvider {
  abstract readonly layerName: string;
  abstract readonly objectType: string;

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
  handleClearEvent(event: ClearMapEvent): CountEvent[] {
    const events = [];
    if (event.types.length == 0 || event.types.includes(this.objectType)) {
      if (event.clearEvents) {
        for (const data of this.data) {
          events.push({
            // Most events should have startTime - if they don't, startTime of 0 will probably work fine
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            startTime: (data as any).startTime ?? 0,
            count: -(data.counter ?? 1),
          });
        }
      }
      this.data.length = 0;
    }
    return events;
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
