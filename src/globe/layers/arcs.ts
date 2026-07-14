import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import {
  binarySearchReplace,
  mapAndFilter,
  PointData,
  updateDataForFrame,
} from "../../data";
import { ArcData, ArcLabel } from "../../data/arc";
import { DEFAULT_GLOBE_RADIUS, QUAD9_COLOR, UNIT_KMS } from "../common";
import {
  CustomObjectLayerBuildHook,
  CustomObjectProvider,
} from "./customobject";
import {
  GlobeLayerAttachHook,
  GlobeLayerDataUpdateHook,
  GlobeLayerFrameUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerPreUpdateHook,
} from "../layer";
import { ClearMapEvent, CountEvent } from "../../service/state";

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
    CustomObjectProvider,
    CustomObjectLayerBuildHook
{
  readonly layerName: string = "Arcs";
  private arcsData: ArcData[] = [];
  private arcLabels: ArcLabel[] = [];

  private labelPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private globePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    globe.getWorldPosition(this.globePos);

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
          return max_height / UNIT_KMS / DEFAULT_GLOBE_RADIUS;
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
      .arcStroke((obj) => {
        const arc = obj as ArcData;
        if (arc.arc_line_width) {
          return arc.arc_line_width / UNIT_KMS;
        } else {
          return null;
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

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof ArcLabel)) {
      return;
    }

    // Just turn the label to face away from the globe
    parent.getWorldPosition(this.labelPos);
    parent.lookAt(
      this.labelPos.addVectors(
        this.globePos,
        this.labelPos.sub(this.globePos).multiplyScalar(2),
      ),
    );
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
  handleClearEvent(event: ClearMapEvent): CountEvent[] {
    const events = [];
    if (event.types.length == 0 || event.types.includes("arc")) {
      if (event.clearEvents || event.clearGraphs) {
        for (const arc of this.arcsData) {
          events.push({
            startTime: arc.startTime,
            count: -(arc.counter ?? 1),
          });
        }
      }
      this.arcsData.length = 0;
    }
    return events;
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
    Math.abs(left.lon - right.lon) < 0.0001 &&
    Math.abs(left.lat - right.lat) < 0.0001 &&
    Math.abs(left.point2_lon - right.point2_lon) < 0.0001 &&
    Math.abs(left.point2_lat - right.point2_lat) < 0.0001
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
