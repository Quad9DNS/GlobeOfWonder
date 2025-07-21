import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { UNIT_KMS } from "../globe/common";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";

/**
 * Additional data that can be used to customize bar
 */
export interface BarCustomizationData {
  /**
   * Diameter of the bar in kilometers.
   */
  bar_diameter?: number;
  /**
   * Height of the bar in kilometers.
   */
  bar_height: number;
  /**
   * Color of the bar at the bottom. Bar is displayed as a gradient.
   */
  bar_bottom_color?: THREE.Color;
  /**
   * Color of the bar at the top. Bar is displayed as a gradient.
   */
  bar_top_color?: THREE.Color;
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
      CounterData &
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

  public get bar_diameter(): number | undefined {
    return this.additional_data.bar_diameter;
  }
  public get bar_height(): number {
    return this.additional_data.bar_height;
  }
  public get bar_bottom_color(): THREE.Color | undefined {
    return this.additional_data.bar_bottom_color;
  }
  public get bar_top_color(): THREE.Color | undefined {
    return this.additional_data.bar_top_color;
  }

  labelOffset(): THREE.Vector3 {
    // Label is offset to be displayed at the top of the bar.
    return this._labelOffset;
  }

  clone(): BarData {
    const new_data = new BarData({
      lat: this.lat,
      lon: this.lon,
      ttl: this.total_lifetime,
      fade_duration: this.fade_duration,
      always_faces_viewer: this.always_faces_viewer,
      counter: this.counter,
      ...this.additional_data,
    });
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
