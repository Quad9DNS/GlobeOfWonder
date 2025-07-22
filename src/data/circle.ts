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
  circle_radius?: number;
  /**
   * Color of the circle.
   */
  circle_color?: THREE.Color;
  /**
   * Thickness of the circle outline. Relative scale.
   */
  circle_outline_thickness?: number;
  /**
   * Color of the circle outline.
   */
  circle_outline_color?: THREE.Color;
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

  public get circle_radius(): number | undefined {
    return this.additional_data.circle_radius;
  }
  public get circle_color(): THREE.Color | undefined {
    return this.additional_data.circle_color;
  }
  public get circle_outline_thickness(): number | undefined {
    return this.additional_data.circle_outline_thickness;
  }
  public get circle_outline_color(): THREE.Color | undefined {
    return this.additional_data.circle_outline_color;
  }

  scale(): number {
    return this.additional_data.circle_radius ?? 1;
  }

  clone(): CircleData {
    return new CircleData(this.cloneData());
  }
}
