import * as THREE from "three";
import { BoundingBoxData } from ".";
import { LifetimeData } from "../service/data";
import { IndicatorData } from "./indicator";
import { LinkData } from "./link";

/**
 * Additional data that can be used to customize textboxes
 */
export interface TextboxCustomizationData {
  readonly box_color?: THREE.Color;
  readonly text?: string;
}

export class TextboxData
  implements IndicatorData, BoundingBoxData, TextboxCustomizationData {
  private startTime: number;
  private lifetime: number;
  total_lifetime: number;

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

  public get box_color(): THREE.Color | undefined {
    return this.additional_data.box_color;
  }

  private additional_data: BoundingBoxData &
    TextboxCustomizationData &
    LinkData;

  constructor({
    ttl,
    ...additional_data
  }: LifetimeData & BoundingBoxData & TextboxCustomizationData) {
    this.startTime = Date.now();
    this.lifetime = 0;
    this.total_lifetime = ttl ?? Infinity;
    this.additional_data = additional_data;
  }

  visible(): boolean {
    return this.lifetime >= 0 && this.lifetime <= this.total_lifetime;
  }

  update(currentTime: number): TextboxData | null {
    this.lifetime = currentTime - this.startTime;
    if (this.lifetime > this.total_lifetime) {
      return null;
    } else {
      return this;
    }
  }
}
