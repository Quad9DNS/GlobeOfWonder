import * as THREE from "three";
import {
  BoundingBoxData,
  BoxBorderData,
  LayerData,
  PointData,
  ScaleData,
  updateVisibilityForOverlay,
} from ".";
import { LifetimeData } from "../service/data";
import { IndicatorData } from "./indicator";
import { LinkData } from "./link";
import { CommonData } from "./common";
import { LabelsData } from "./label";
import { HoverTextData } from "./hover";
import { SoundLink, SoundSet } from "./sound";

/**
 * Additional data that can be used to customize textboxes
 */
export interface GraphCustomizationData {
  readonly name?: string;
  readonly grid_enabled?: boolean;
  readonly grid_color?: THREE.Color;
}

export interface GraphAnchorCustomizationData {
  readonly graph_anchor_lat?: number;
  readonly graph_anchor_lon?: number;
  readonly graph_anchor_lat_offset_visibility?: number;
  readonly graph_anchor_lon_offset_visibility?: number;
}

export class GraphData
  implements
    IndicatorData,
    BoundingBoxData,
    BoxBorderData,
    GraphCustomizationData,
    GraphAnchorCustomizationData
{
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

  public get name(): string | undefined {
    return this.additional_data.name;
  }

  public get grid_enabled(): boolean | undefined {
    return this.additional_data.grid_enabled;
  }

  public get grid_color(): THREE.Color | undefined {
    return this.additional_data.grid_color;
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

  public get graph_anchor_lat(): number | undefined {
    return this.additional_data.graph_anchor_lat;
  }

  public get graph_anchor_lon(): number | undefined {
    return this.additional_data.graph_anchor_lon;
  }

  public get graph_anchor_lat_offset_visibility(): number | undefined {
    return this.additional_data.graph_anchor_lat_offset_visibility;
  }

  public get graph_anchor_lon_offset_visibility(): number | undefined {
    return this.additional_data.graph_anchor_lon_offset_visibility;
  }

  private additional_data: BoundingBoxData &
    BoxBorderData &
    GraphCustomizationData &
    GraphAnchorCustomizationData &
    LinkData;

  constructor({
    ttl,
    ...additional_data
  }: LifetimeData &
    BoundingBoxData &
    BoxBorderData &
    GraphCustomizationData &
    GraphAnchorCustomizationData &
    LinkData) {
    this.startTime = Date.now();
    this.lifetime = 0;
    this.total_lifetime = ttl ?? Infinity;
    this.additional_data = additional_data;

    if (additional_data.draw_delay) {
      this.startTime += additional_data.draw_delay;
      this.lifetime -= additional_data.draw_delay;
    }
  }

  visible(): boolean {
    return (
      this.in_visiblity_cone &&
      this.lifetime >= 0 &&
      this.lifetime <= this.total_lifetime
    );
  }

  update(currentTime: number): GraphData | null {
    this.lifetime = currentTime - this.startTime;
    if (this.lifetime > this.total_lifetime) {
      return null;
    } else {
      return this;
    }
  }

  updateVisibility(camera_lon: number, camera_lat: number): boolean {
    this.in_visiblity_cone = updateVisibilityForOverlay(
      camera_lon,
      camera_lat,
      this.graph_anchor_lon,
      this.graph_anchor_lat,
      this.graph_anchor_lon_offset_visibility,
      this.graph_anchor_lat_offset_visibility,
    );
    return this.in_visiblity_cone;
  }
}

export class GraphAnchorData
  extends CommonData<GraphAnchorCustomizationData>
  implements PointData, GraphAnchorCustomizationData
{
  private linked_data: GraphData;

  constructor(
    data: LifetimeData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData &
      SoundLink &
      SoundSet &
      GraphCustomizationData &
      GraphAnchorCustomizationData,
    linked_data: GraphData,
  ) {
    super({
      lat: data.graph_anchor_lat!,
      lon: data.graph_anchor_lon!,
      ...data,
    });
    this.linked_data = linked_data;
  }

  public get graph_anchor_lat(): number | undefined {
    return this.additional_data.graph_anchor_lat;
  }

  public get graph_anchor_lon(): number | undefined {
    return this.additional_data.graph_anchor_lon;
  }

  public get graph_anchor_lat_offset_visibility(): number | undefined {
    return this.additional_data.graph_anchor_lat_offset_visibility;
  }

  public get graph_anchor_lon_offset_visibility(): number | undefined {
    return this.additional_data.graph_anchor_lon_offset_visibility;
  }

  updateVisibility(camera_lon: number, camera_lat: number): boolean {
    return this.linked_data.updateVisibility(camera_lon, camera_lat);
  }

  clone(): GraphAnchorData {
    return new GraphAnchorData(this.cloneData(), this.linked_data);
  }

  public get graph(): GraphData {
    return this.linked_data;
  }

  eventName(): string {
    return "graph";
  }
}
