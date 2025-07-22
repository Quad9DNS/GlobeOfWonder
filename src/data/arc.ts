import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { geoDistance, geoMidPoint, UNIT_KMS } from "../globe/common";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";

export type ArcLineType = "solid" | "dashed_large" | "dashed_small" | "dots";

const DEFAULT_ARC_LIFETIME = 5000;

/**
 * Additional data that can be used to customize arcs
 */
export interface ArcCustomizationData {
  /**
   * Latitude of the arc end point.
   */
  point2_lat: number;
  /**
   * Longitude of the arc end point.
   */
  point2_lon: number;
  /**
   * Color of the arc.
   */
  arc_color?: THREE.Color;
  /**
   * Type of the arc line. It can either be completely solid or dashed with different gap sizes.
   */
  arc_line_type?: ArcLineType;
  /**
   * Thickness of the arc line in kilometers. By default, if not defined, the thickness is 1 pixel.
   */
  arc_line_thickness?: number;
  /**
   * Whether the arc should be animated.
   * If set to true, arc will move from start to end position.
   * Only useful if {@link arc_line_type} is not solid.
   */
  arc_animated?: boolean;
  /**
   * Defines how long the arc should take to draw when appearing initially.
   * Drawing starts from start point and moves to end point.
   * Removing the arc takes same time to complete and removes from start to end also.
   */
  arc_draw_duration?: number;
  /**
   * Height of arc in kilometers at its highest point.
   * If not set, it will be equal to half of the haversine distance between the points.
   */
  arc_max_height?: number;
}

/**
 * Data representing an arc on the globe
 */
export class ArcData
  extends CommonData<ArcCustomizationData>
  implements
    ArcCustomizationData,
    PointData,
    LinkData,
    LayerData,
    ScaleData,
    HoverTextData
{
  declare public lifetime: number;

  constructor(
    data: ArcCustomizationData &
      CounterData &
      PositionData &
      LifetimeData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super({ ...data, ttl: data.ttl ?? DEFAULT_ARC_LIFETIME });
  }
  public get point2_lat(): number {
    return this.additional_data.point2_lat;
  }
  public get point2_lon(): number {
    return this.additional_data.point2_lon;
  }
  public get arc_color(): THREE.Color | undefined {
    return this.additional_data.arc_color;
  }
  public get arc_line_type(): ArcLineType | undefined {
    return this.additional_data.arc_line_type;
  }
  public get arc_line_thickness(): number | undefined {
    return this.additional_data.arc_line_thickness;
  }
  public get arc_animated(): boolean | undefined {
    return this.additional_data.arc_animated;
  }
  public get arc_draw_duration(): number | undefined {
    return this.additional_data.arc_draw_duration;
  }
  public get arc_max_height(): number | undefined {
    return this.additional_data.arc_max_height;
  }

  /**
   * Generates a label for this arc, ensuring it appears at its highest point,
   * and only once arc drawing reaches that point.
   */
  produceLabel(): ArcLabel {
    const [latMid, lonMid] = geoMidPoint(
      this.lat,
      this.lon,
      this.point2_lat,
      this.point2_lon,
    );
    // 0.5 refers to `arcAltitudeAutoScale` default value
    const height =
      (geoDistance(this.lat, this.lon, this.point2_lat, this.point2_lon) / 2) *
      0.5;

    return new ArcLabel(
      height,
      this.startTime + (this.arc_draw_duration ?? 200) / 2,
      {
        ...this.cloneData(),
        lat: latMid,
        lon: lonMid,
        ttl: this.total_lifetime - (this.arc_draw_duration ?? 200),
      },
    );
  }

  clone(): ArcData {
    const new_data = new ArcData(this.cloneData());
    return new_data;
  }
}

/**
 * Data representing an arc label on the globe.
 * This is handled as a separate object because of the globe internals.
 */
export class ArcLabel
  extends CommonData<ArcCustomizationData>
  implements PointData, LabelsData, LinkData, LayerData, ScaleData
{
  private readonly defaultHeight: number = 0;

  constructor(
    defaultHeight: number,
    startTime: number,
    data: PositionData &
      CounterData &
      LifetimeData &
      ArcCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      HoverTextData &
      ScaleData,
  ) {
    super({ ...data, ttl: data.ttl ?? DEFAULT_ARC_LIFETIME });
    this.lifetime = this.startTime - startTime;
    this.startTime = startTime;
    this.defaultHeight = defaultHeight;
  }

  heightOffset(): number {
    return this.additional_data.arc_max_height
      ? (this.additional_data.arc_max_height + 5) / UNIT_KMS
      : this.defaultHeight + 1 / UNIT_KMS;
  }

  clone(): ArcLabel {
    const new_data = new ArcLabel(
      this.defaultHeight,
      this.startTime,
      this.cloneData(),
    );
    return new_data;
  }
}
