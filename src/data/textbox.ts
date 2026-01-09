import * as THREE from "three";
import { BoundingBoxData, LayerData, PointData, ScaleData } from ".";
import { CounterData, LifetimeData } from "../service/data";
import { IndicatorData } from "./indicator";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { LabelsData } from "./label";
import { HoverTextData } from "./hover";

/**
 * Additional data that can be used to customize textboxes
 */
export interface TextboxCustomizationData {
  readonly box_color?: THREE.Color;
  readonly box_opacity?: number;
  readonly box_corner_radius?: number;
  readonly border_color?: THREE.Color;
  readonly border_thickness?: number;
  readonly border_opacity?: number;
  readonly text?: string;
  readonly text_font?: string;
  readonly text_font_style?: string;
  readonly text_font_size?: number;
  readonly text_color?: THREE.Color;
  readonly text_opacity?: number;
}

export interface TextboxPointerCustomizationData {
  readonly text_pointer_lat?: number;
  readonly text_pointer_lon?: number;
  readonly text_pointer_lat_offset_visibility?: number;
  readonly text_pointer_lon_offset_visibility?: number;
  readonly text_pointer_color?: THREE.Color;
  readonly text_pointer_opacity?: number;
  readonly text_pointer_thickness?: number;
}

export class TextboxData
  implements
  IndicatorData,
  BoundingBoxData,
  LinkData,
  TextboxCustomizationData,
  TextboxPointerCustomizationData {
  private startTime: number;
  private lifetime: number;
  total_lifetime: number;

  in_visiblity_cone: boolean = true;

  public get left(): number {
    return this.additional_data.left;
  }

  public get top(): number {
    return this.additional_data.top;
  }

  public get right(): number {
    return this.additional_data.right;
  }

  public get bottom(): number {
    return this.additional_data.bottom;
  }

  public get text(): string | undefined {
    return this.additional_data.text;
  }

  public get text_font(): string | undefined {
    return this.additional_data.text_font;
  }

  public get text_font_style(): string | undefined {
    return this.additional_data.text_font_style;
  }

  public get text_font_size(): number | undefined {
    return this.additional_data.text_font_size;
  }

  public get text_color(): THREE.Color | undefined {
    return this.additional_data.text_color;
  }

  public get text_opacity(): number | undefined {
    return this.additional_data.text_opacity;
  }

  public get box_color(): THREE.Color | undefined {
    return this.additional_data.box_color;
  }

  public get box_opacity(): number | undefined {
    return this.additional_data.box_opacity;
  }

  public get box_corner_radius(): number | undefined {
    return this.additional_data.box_corner_radius;
  }

  public get border_color(): THREE.Color | undefined {
    return this.additional_data.border_color;
  }

  public get border_thickness(): number | undefined {
    return this.additional_data.border_thickness;
  }

  public get border_opacity(): number | undefined {
    return this.additional_data.border_opacity;
  }

  public get link_url(): string | undefined {
    return this.additional_data.link_url;
  }

  public get new_window(): boolean | undefined {
    return this.additional_data.new_window;
  }

  public get text_pointer_lat(): number | undefined {
    return this.additional_data.text_pointer_lat;
  }

  public get text_pointer_lon(): number | undefined {
    return this.additional_data.text_pointer_lon;
  }

  public get text_pointer_lat_offset_visibility(): number | undefined {
    return this.additional_data.text_pointer_lat_offset_visibility;
  }

  public get text_pointer_lon_offset_visibility(): number | undefined {
    return this.additional_data.text_pointer_lon_offset_visibility;
  }

  public get text_pointer_color(): THREE.Color | undefined {
    return this.additional_data.text_pointer_color;
  }

  public get text_pointer_thickness(): number | undefined {
    return this.additional_data.text_pointer_thickness;
  }

  public get text_pointer_opacity(): number | undefined {
    return this.additional_data.text_pointer_opacity;
  }

  private additional_data: BoundingBoxData &
    TextboxCustomizationData &
    TextboxPointerCustomizationData &
    LinkData;

  constructor({
    ttl,
    ...additional_data
  }: LifetimeData &
    BoundingBoxData &
    TextboxCustomizationData &
    TextboxPointerCustomizationData &
    LinkData) {
    this.startTime = Date.now();
    this.lifetime = 0;
    this.total_lifetime = ttl ?? Infinity;
    this.additional_data = additional_data;
  }

  visible(): boolean {
    return (
      this.in_visiblity_cone &&
      this.lifetime >= 0 &&
      this.lifetime <= this.total_lifetime
    );
  }

  update(currentTime: number): TextboxData | null {
    this.lifetime = currentTime - this.startTime;
    if (this.lifetime > this.total_lifetime) {
      return null;
    } else {
      return this;
    }
  }

  updateVisibility(camera_lon: number): boolean {
    if (
      this.text_pointer_lon != undefined &&
      this.text_pointer_lon_offset_visibility != undefined
    ) {
      const normalized_lon =
        this.text_pointer_lon > 180.0
          ? this.text_pointer_lon - 360.0
          : this.text_pointer_lon;
      this.in_visiblity_cone =
        Math.abs(normalized_lon - camera_lon) <
        this.text_pointer_lon_offset_visibility;
    }
    if (!this.in_visiblity_cone) {
      return this.in_visiblity_cone;
    }
    if (
      this.text_pointer_lat != undefined &&
      this.text_pointer_lat_offset_visibility != undefined
    ) {
      this.in_visiblity_cone =
        Math.abs(this.text_pointer_lat - camera_lon) <
        this.text_pointer_lat_offset_visibility;
    }
    return this.in_visiblity_cone;
  }
}

export class TextboxPointerData
  extends CommonData<TextboxPointerCustomizationData>
  implements PointData, TextboxPointerCustomizationData {
  private linked_data: TextboxData;

  constructor(
    data: LifetimeData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData &
      TextboxCustomizationData &
      TextboxPointerCustomizationData,
    linked_data: TextboxData,
  ) {
    super({
      lat: data.text_pointer_lat!,
      lon: data.text_pointer_lon!,
      ...data,
    });
    this.linked_data = linked_data;
  }

  public get text_pointer_lat(): number | undefined {
    return this.additional_data.text_pointer_lat;
  }

  public get text_pointer_lon(): number | undefined {
    return this.additional_data.text_pointer_lon;
  }

  public get text_pointer_lat_offset_visibility(): number | undefined {
    return this.additional_data.text_pointer_lat_offset_visibility;
  }

  public get text_pointer_lon_offset_visibility(): number | undefined {
    return this.additional_data.text_pointer_lon_offset_visibility;
  }

  public get text_pointer_color(): THREE.Color | undefined {
    return this.additional_data.text_pointer_color;
  }

  public get text_pointer_thickness(): number | undefined {
    return this.additional_data.text_pointer_thickness;
  }

  public get text_pointer_opacity(): number | undefined {
    return this.additional_data.text_pointer_opacity;
  }

  // Disable URL on the point on the globe
  public get link_url(): string | undefined {
    return undefined;
  }

  updateVisibility(camera_lon: number): boolean {
    return this.linked_data.updateVisibility(camera_lon);
  }

  clone(): TextboxPointerData {
    return new TextboxPointerData(this.cloneData(), this.linked_data);
  }

  public get textbox(): TextboxData {
    return this.linked_data;
  }
}
