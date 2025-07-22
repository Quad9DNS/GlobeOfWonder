import { Camera, WebGLRenderer } from "three";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import {
  binarySearchReplace,
  mapAndFilter,
  PointData,
  updateDataForFrame,
} from "../../data";
import { ArcData, ArcLabel } from "../../data/arc";
import { QUAD9_COLOR, UNIT_KMS } from "../common";
import { CustomObjectProvider } from "./customobject";
import {
  GlobeLayerAttachHook,
  GlobeLayerDataUpdateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerPreUpdateHook,
} from "../layer";

/**
 * Globe layer that draws {@link ArcData} objects
 * and provides {@link ArcLabel} objects as a {@link CustomObjectProvider}.
 */
export class ArcsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerDataUpdateHook,
    GlobeLayerFrameUpdateHook,
    CustomObjectProvider
{
  readonly layerName: string = "Arcs";
  private arcsData: ArcData[] = [];
  private arcLabels: ArcLabel[] = [];

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: Camera,
    _renderer: WebGLRenderer,
  ): void {
    globe
      .arcsData([])
      .arcStartLat((obj) => (obj as ArcData).lat)
      .arcStartLng((obj) => (obj as ArcData).lon)
      .arcEndLat((obj) => (obj as ArcData).point2_lat)
      .arcEndLng((obj) => (obj as ArcData).point2_lon)
      .arcColor((obj: object) => {
        const arc = obj as ArcData;
        if (!arc.visible()) {
          return "rgba(0,0,0,0)";
        }

        const duration = arc.arc_draw_duration ?? 200;
        const factor = arc.lifetime / duration;
        const revFactor = (arc.total_lifetime - arc.lifetime) / duration;
        if (duration && factor < 1) {
          return (t: number) => {
            if (t < factor) {
              return (
                "#" + ((obj as ArcData).arc_color ?? QUAD9_COLOR).getHexString()
              );
            } else {
              return "rgba(0,0,0,0)";
            }
          };
        } else if (duration && revFactor < 1) {
          return (t: number) => {
            if (t < 1 - revFactor) {
              return "rgba(0,0,0,0)";
            } else {
              return (
                "#" + ((obj as ArcData).arc_color ?? QUAD9_COLOR).getHexString()
              );
            }
          };
        } else {
          return (
            "#" + ((obj as ArcData).arc_color ?? QUAD9_COLOR).getHexString()
          );
        }
      })
      .arcAltitude((obj: object) => {
        const max_height = (obj as ArcData).arc_max_height;
        if (max_height) {
          return max_height / UNIT_KMS;
        } else {
          return null;
        }
      })
      .arcDashLength((obj: object) => {
        switch ((obj as ArcData).arc_line_type) {
          case "dots":
            return 0.0025;
          case "dashed_small":
            return 0.05;
          case "dashed_large":
            return 0.1;
          case "solid":
          default:
            return 1;
        }
      })
      .arcDashGap((obj: object) => {
        switch ((obj as ArcData).arc_line_type) {
          case "dots":
            return 0.01;
          case "dashed_small":
            return 0.025;
          case "dashed_large":
            return 0.05;
          case "solid":
          default:
            return 0;
        }
      })
      .arcDashAnimateTime((obj: object) => {
        const arc = obj as ArcData;
        if (arc.arc_animated) {
          return 10000;
        } else {
          return 0;
        }
      })
      .arcsTransitionDuration(0);
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof ArcData;
  }
  preUpdate(): void {
    mapAndFilter(this.arcsData);
    mapAndFilter(this.arcLabels);
  }
  takeNewPoint(point: PointData): void {
    binarySearchReplace(this.arcsData, point as ArcData, compare_arcs);
    binarySearchReplace(this.arcLabels, (point as ArcData).produceLabel());
  }
  updateData(globe: ThreeGlobe, settings: Settings): void {
    if (settings.enableArcs) {
      globe.arcsData(this.arcsData);
    } else {
      globe.arcsData([]);
    }
  }
  updateFrame(globe: ThreeGlobe, settings: Settings): void {
    if (settings.enableArcs) {
      updateDataForFrame(this.arcsData);
      updateDataForFrame(this.arcLabels);
      globe.arcsData(this.arcsData);
    }
  }
  getCurrentObjects(settings: Settings): PointData[] {
    if (settings.enableArcs) {
      return this.arcLabels;
    } else {
      return [];
    }
  }
}

function compare_arcs(left: ArcData, right: ArcData): number {
  if (
    Math.abs(left.lon - right.lon) < 0.001 &&
    Math.abs(left.lat - right.lat) < 0.001 &&
    Math.abs(left.point2_lon - right.point2_lon) < 0.001 &&
    Math.abs(left.point2_lat - right.point2_lat) < 0.001
  ) {
    return 0;
  }
  const leftNum =
    left.point2_lon * 1000000000 +
    left.point2_lat * 1000000 +
    left.lon * 1000 +
    left.lat;
  const rightNum =
    right.point2_lon * 1000000000 +
    right.point2_lat * 1000000 +
    right.lon * 1000 +
    right.lat;
  return leftNum - rightNum;
}
