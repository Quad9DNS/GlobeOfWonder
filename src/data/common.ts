import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { HoverTextData } from "./hover";
import { LifetimeData, PositionData } from "../service/data";

export const VEC3_ZERO = new THREE.Vector3(0, 0, 0);

type SharedData<T> = T &
  PositionData &
  LifetimeData &
  LabelsData &
  LinkData &
  LayerData &
  ScaleData &
  HoverTextData;

/**
 * Abstract point implementation.
 * Since many points will share a lot of data and logic, this is provided to make it easier to add new point types.
 */
export abstract class CommonData<T>
  implements
    PointData,
    LabelsData,
    LinkData,
    LayerData,
    ScaleData,
    HoverTextData
{
  lat: number;
  lon: number;
  total_lifetime: number;
  fade_duration: number;
  always_faces_viewer: boolean;

  /**
   * Time when this point was added. It can be in the future too, which will make it appear later.
   */
  protected startTime: number;

  /**
   * Current lifetime of the point
   */
  protected lifetime: number;

  /**
   * How much of its total life has this point spent
   * If this is >= 1, then the point has expired and should be removed
   * If this is < 0, then the point should not yet be visible, since its startTime is in the future
   */
  protected get lifetime_fraction(): number {
    return this.lifetime / this.total_lifetime;
  }

  /**
   * All additional customization data, for easy access.
   */
  protected additional_data: T &
    LabelsData &
    LinkData &
    LayerData &
    ScaleData &
    HoverTextData;

  public get display_text(): string | null {
    return this.additional_data.display_text;
  }
  public get display_text_interval(): number | null {
    return this.additional_data.display_text_interval;
  }
  public get display_text_font(): string | null {
    return this.additional_data.display_text_font;
  }
  public get display_text_font_size(): number | null {
    return this.additional_data.display_text_font_size;
  }
  public get display_text_font_style(): string | null {
    return this.additional_data.display_text_font_style;
  }
  public get display_text_color(): THREE.Color | null {
    return this.additional_data.display_text_color;
  }
  public get display_text_outline_color(): THREE.Color | null {
    return this.additional_data.display_text_outline_color;
  }
  public get display_text_always_faces_viewer(): boolean | null {
    return this.additional_data.display_text_always_faces_viewer;
  }
  public get display_text_hover_only(): boolean | null {
    return this.additional_data.display_text_hover_only;
  }
  public get link_url(): string | null {
    return this.additional_data.link_url;
  }
  public get new_window(): boolean | null {
    return this.additional_data.new_window;
  }
  public get opacity(): number | null {
    return this.additional_data.opacity;
  }
  public get layer_id(): number | null {
    return this.additional_data.layer_id;
  }
  public get layer_name(): string | null {
    return this.additional_data.layer_name;
  }
  public get ignore_zoom(): boolean | null {
    return this.additional_data.ignore_zoom;
  }
  public get hover_text(): string | null {
    return this.additional_data.hover_text;
  }

  constructor({ lat, lon, ...additional_data }: SharedData<T>) {
    this.lat = lat;
    this.lon = lon;
    this.startTime = Date.now();
    this.always_faces_viewer = additional_data.always_faces_viewer ?? false;
    this.lifetime = 0;
    this.additional_data = additional_data as T &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData;

    this.total_lifetime = additional_data.ttl ?? Infinity;
    this.fade_duration = additional_data.fade_duration ?? 0;

    if (additional_data.draw_delay) {
      this.startTime += additional_data.draw_delay;
      this.lifetime -= additional_data.draw_delay;
    }
  }

  scaleZ(): boolean {
    return false;
  }

  applyGlobalScale(): boolean {
    return true;
  }

  labelOffset(): THREE.Vector3 {
    return VEC3_ZERO;
  }

  heightOffset(): number {
    return 0;
  }

  labelFaceCamera(): boolean {
    return this.additional_data.display_text_always_faces_viewer ?? false;
  }

  labelExpired(): boolean {
    return this.lifetime > (this.display_text_interval ?? Infinity);
  }
  expired(): boolean {
    return this.lifetime > this.total_lifetime;
  }
  timeLeft(): number {
    return this.total_lifetime - this.lifetime;
  }
  visible(): boolean {
    // Ensures that objects are not visible if startTime is in the future
    return this.lifetime_fraction >= 0 && !this.expired();
  }
  update(currentTime: number): PointData | null {
    this.lifetime = currentTime - this.startTime;
    if (this.expired()) {
      return null;
    } else {
      return this;
    }
  }

  fadeFactor(): number | null {
    if (
      this.fade_duration == 0 ||
      this.total_lifetime - this.lifetime > this.fade_duration
    ) {
      return null;
    }
    return Math.max(
      0,
      (this.total_lifetime - this.lifetime) / this.fade_duration,
    );
  }

  /**
   * Clones shared data used by this object
   */
  protected cloneData(): SharedData<T> {
    return {
      ...this.additional_data,
      lat: this.lat,
      lon: this.lon,
      ttl: this.total_lifetime,
      draw_delay: this.lifetime < 0 ? -this.lifetime : null,
      fade_duration: this.fade_duration,
      always_faces_viewer: this.always_faces_viewer,
    };
  }

  clone(): PointData {
    throw new Error("Method not implemented.");
  }
  faceCamera(): boolean {
    return this.always_faces_viewer;
  }
  scale(): number {
    return 1;
  }
  labelScale(): number {
    return 1;
  }
  variableScale(): boolean {
    return false;
  }
}
