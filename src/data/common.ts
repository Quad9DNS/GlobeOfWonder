import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";
import { SoundLink, SoundNodeObject, SoundPause, SoundSet } from "./sound";

export const VEC3_ZERO = new THREE.Vector3(0, 0, 0);

export type SharedData<T> = T &
  PositionData &
  CounterData &
  LifetimeData &
  LabelsData &
  LinkData &
  LayerData &
  ScaleData &
  HoverTextData &
  SoundLink &
  SoundSet & {
    soundLinkPromise?: Promise<AudioBuffer> | undefined;
    soundSetPromise?: Promise<AudioBuffer | SoundPause>[];
  };

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
    HoverTextData,
    SoundLink,
    SoundSet
{
  lat: number;
  lon: number;
  total_lifetime: number;
  fade_duration: number;
  always_faces_viewer: boolean;
  counter?: number;
  counter_include?: boolean;
  graphs?: string[];

  dispersed_lat?: number;
  dispersed_lon?: number;

  /**
   * Time when this point was added. It can be in the future too, which will make it appear later.
   */
  startTime: number;

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
    HoverTextData &
    SoundLink &
    SoundSet;

  public get display_text(): string | undefined {
    return this.additional_data.display_text;
  }
  public get display_text_interval(): number | undefined {
    return this.additional_data.display_text_interval;
  }
  public get display_text_font(): string | undefined {
    return this.additional_data.display_text_font;
  }
  public get display_text_font_size(): number | undefined {
    return this.additional_data.display_text_font_size;
  }
  public get display_text_font_style(): string | undefined {
    return this.additional_data.display_text_font_style;
  }
  public get display_text_color(): THREE.Color | undefined {
    return this.additional_data.display_text_color;
  }
  public get display_text_outline_color(): THREE.Color | undefined {
    return this.additional_data.display_text_outline_color;
  }
  public get display_text_always_faces_viewer(): boolean | undefined {
    return this.additional_data.display_text_always_faces_viewer;
  }
  public get display_text_hover_only(): boolean | undefined {
    return this.additional_data.display_text_hover_only;
  }
  public get link_url(): string | undefined {
    return this.additional_data.link_url;
  }
  public get new_window(): boolean | undefined {
    return this.additional_data.new_window;
  }
  public get opacity(): number | undefined {
    return this.additional_data.opacity;
  }
  public get layer_id(): number | undefined {
    return this.additional_data.layer_id;
  }
  public get layer_name(): string | undefined {
    return this.additional_data.layer_name;
  }
  public get ignore_zoom(): boolean | undefined {
    return this.additional_data.ignore_zoom;
  }
  public get disperse_on_zoom(): boolean {
    return this.additional_data.disperse_on_zoom ?? false;
  }
  public get hover_text(): string | undefined {
    return this.additional_data.hover_text;
  }
  public get sound_url(): string | undefined {
    return this.additional_data.sound_url;
  }
  public get sound_volume(): number | undefined {
    return this.additional_data.sound_volume;
  }
  public get sound_set(): SoundNodeObject[] | undefined {
    return this.additional_data.sound_set;
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
      HoverTextData &
      SoundLink &
      SoundSet;

    this.total_lifetime = additional_data.ttl ?? Infinity;
    this.total_lifetime =
      this.total_lifetime == 0 ? Infinity : this.total_lifetime;
    this.fade_duration = additional_data.fade_duration ?? 0;
    this.counter = additional_data.counter;
    this.counter_include = additional_data.counter_include;

    if (additional_data.draw_delay) {
      this.startTime += additional_data.draw_delay;
      this.lifetime -= additional_data.draw_delay;
    }
    this.soundSetPromise = additional_data.soundSetPromise ?? [];
    this.soundLinkPromise = additional_data.soundLinkPromise;
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
    return this.lifetime >= 0 && !this.expired();
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
      draw_delay: this.lifetime < 0 ? -this.lifetime : undefined,
      fade_duration: this.fade_duration,
      always_faces_viewer: this.always_faces_viewer,
      counter: this.counter,
      counter_include: this.counter_include,
      soundLinkPromise: this.soundLinkPromise,
      soundSetPromise: this.soundSetPromise,
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

  private soundLinkPromise: Promise<AudioBuffer> | undefined = undefined;
  private soundSetPromise: Promise<AudioBuffer | SoundPause>[] = [];

  preloadSound(loader: THREE.AudioLoader): void {
    this.soundLinkPromise = loader.loadAsync(this.sound_url!);
  }
  preloadSoundSet(loader: THREE.AudioLoader): void {
    for (const sound of this.sound_set ?? []) {
      if (sound.type == "sound_link") {
        this.soundSetPromise.push(loader.loadAsync(sound.sound_url!));
      } else if (sound.type == "sound_pause") {
        this.soundSetPromise.push(Promise.resolve(sound));
      }
    }
  }
  getSoundLoaderPromise(): Promise<AudioBuffer> {
    return this.soundLinkPromise!;
  }
  getSoundSetLoaderPromise(): Promise<AudioBuffer | SoundPause>[] {
    return this.soundSetPromise;
  }
  eventName(): string {
    throw new Error("Method not implemented.");
  }
}
