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

export default abstract class CommonObjectProvider<T extends PointData>
  implements
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerFrameUpdateHook,
    CustomObjectProvider
{
  abstract readonly layerName: string;

  private data: T[] = [];

  abstract layerEnabled(settings: Settings): boolean;
  abstract shouldTakePoint(point: PointData): boolean;

  updateFrame(_globe: ThreeGlobe, _settings: Settings): void {
    updateDataForFrame(this.data);
  }
  takeNewPoint(point: PointData): void {
    binarySearchReplace(this.data, point);
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
