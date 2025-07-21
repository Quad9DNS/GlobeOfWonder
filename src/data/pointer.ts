import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";

/**
 * Additional data that can be used to customize pointers
 */
export interface PointerCustomizationData {
  /**
   * Color of the pointer background (the main part of the pointer)
   */
  pointer_background_color: THREE.Color | null;
  /**
   * Color of the pointer outline (border)
   */
  pointer_border_color: THREE.Color | null;
  /**
   * Relative scale of the pointer
   */
  pointer_scale: number | null;
  /**
   * Color of the pointer glyph (circle in the middle)
   */
  pointer_glyph_color: THREE.Color | null;
}

/**
 * Data representing a pointer on the globe
 */
export class PointerData
  extends CommonData<PointerCustomizationData>
  implements
    PointerCustomizationData,
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
      PointerCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super(data);
    this._labelOffset = new THREE.Vector3(
      0.0,
      3.5 * (data.pointer_scale ?? 1.0),
      0.0,
    );
  }

  public get pointer_background_color(): THREE.Color | null {
    return this.additional_data.pointer_background_color;
  }
  public get pointer_border_color(): THREE.Color | null {
    return this.additional_data.pointer_border_color;
  }
  public get pointer_scale(): number | null {
    return this.additional_data.pointer_scale;
  }
  public get pointer_glyph_color(): THREE.Color | null {
    return this.additional_data.pointer_glyph_color;
  }

  labelOffset(): THREE.Vector3 {
    // Label if offset to display above the pointer
    return this._labelOffset;
  }

  scale(): number {
    return this.pointer_scale ?? 1;
  }

  clone(): PointerData {
    const new_data = new PointerData({
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

  labelScale(): number {
    // Ensures the label scales with the pointer
    return this.scale();
  }
}
