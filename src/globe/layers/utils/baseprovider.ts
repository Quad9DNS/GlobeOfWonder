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
} from "../../layer";
import { CustomObjectProvider } from "../customobject";
import { ClearMapEvent, CountEvent } from "../../../service/state";

export default abstract class CommonObjectProvider<T extends PointData>
  implements
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerFrameUpdateHook,
    CustomObjectProvider
{
  abstract readonly layerName: string;
  abstract readonly objectType: string;

  private data: T[] = [];

  abstract layerEnabled(settings: Settings): boolean;
  abstract shouldTakePoint(point: PointData): boolean;

  updateFrame(_globe: ThreeGlobe, _settings: Settings): void {
    updateDataForFrame(this.data);
  }
  takeNewPoint(point: PointData): void {
    binarySearchReplace(this.data, point);
  }
  handleClearEvent(event: ClearMapEvent): CountEvent[] {
    const events = [];
    if (event.types.length == 0 || event.types.includes(this.objectType)) {
      if (event.clearEvents) {
        for (const data of this.data) {
          events.push({
            startTime: data.startTime ?? 0,
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
