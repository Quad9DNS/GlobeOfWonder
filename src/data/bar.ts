import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { UNIT_KMS } from "../globe/common";
import { HoverTextData } from "./hover";
import { LifetimeData, PositionData } from "../service/data";

/**
 * Additional data that can be used to customize bar
 */
export interface BarCustomizationData {
  /**
   * Diameter of the bar in kilometers.
   */
  bar_diameter: number | null;
  /**
   * Height of the bar in kilometers.
   */
  bar_height: number;
  /**
   * Color of the bar at the bottom. Bar is displayed as a gradient.
   */
  bar_bottom_color: THREE.Color | null;
  /**
   * Color of the bar at the top. Bar is displayed as a gradient.
   */
  bar_top_color: THREE.Color | null;
}

/**
 * Data representing a bar on the globe
 */
export class BarData
  extends CommonData<BarCustomizationData>
  implements
    BarCustomizationData,
    PointData,
    LabelsData,
    LinkData,
    ScaleData,
    HoverTextData
{
  private _labelOffset: THREE.Vector3;

  constructor(
    data: PositionData &
      LifetimeData &
      BarCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super(data);
    this._labelOffset = new THREE.Vector3(0.0, 0.0, this.bar_height / UNIT_KMS);
  }

  public get bar_diameter(): number | null {
    return this.additional_data.bar_diameter;
  }
  public get bar_height(): number {
    return this.additional_data.bar_height;
  }
  public get bar_bottom_color(): THREE.Color | null {
    return this.additional_data.bar_bottom_color;
  }
  public get bar_top_color(): THREE.Color | null {
    return this.additional_data.bar_top_color;
  }

  labelOffset(): THREE.Vector3 {
    // Label is offset to be displayed at the top of the bar.
    return this._labelOffset;
  }

  clone(): BarData {
    const new_data = new BarData(this.cloneData());
    return new_data;
  }

  faceCamera(): boolean {
    // Yhe bar should never face towards the camera, because that makes it appear as just a hexagon.
    return false;
  }

  scaleZ(): boolean {
    return true;
  }
}
