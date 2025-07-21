import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";

/**
 * Additional data that can be used to customize circles.
 */
export interface CircleCustomizationData {
  /**
   * Radius of the circle in kilometers.
   */
  circle_radius: number | null;
  /**
   * Color of the circle.
   */
  circle_color: THREE.Color | null;
  /**
   * Thickness of the circle outline. Relative scale.
   */
  circle_outline_thickness: number | null;
  /**
   * Color of the circle outline.
   */
  circle_outline_color: THREE.Color | null;
}

/**
 * Data representing a single circle on the globe
 */
export class CircleData
  extends CommonData<CircleCustomizationData>
  implements
    CircleCustomizationData,
    PointData,
    LabelsData,
    LinkData,
    LayerData,
    ScaleData,
    HoverTextData
{
  constructor(
    data: PositionData &
      CounterData &
      LifetimeData &
      CircleCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super(data);
  }

  public get circle_radius(): number | null {
    return this.additional_data.circle_radius;
  }
  public get circle_color(): THREE.Color | null {
    return this.additional_data.circle_color;
  }
  public get circle_outline_thickness(): number | null {
    return this.additional_data.circle_outline_thickness;
  }
  public get circle_outline_color(): THREE.Color | null {
    return this.additional_data.circle_outline_color;
  }

  scale(): number {
    return this.additional_data.circle_radius ?? 1;
  }

  clone(): CircleData {
    const new_data = new CircleData({
      lat: this.lat,
      lon: this.lon,
      ttl: this.total_lifetime,
      fade_duration: this.fade_duration,
      counter: this.counter,
      always_faces_viewer: this.always_faces_viewer,
      ...this.additional_data,
    });
    return new_data;
  }
}
