import * as THREE from "three";
import { LayerData, PointData, ScaleData } from ".";
import { clamp, lerp } from "three/src/math/MathUtils.js";
import { HoverTextData } from "./hover";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import {
  DEFAULT_CRITICAL_COLOR,
  KM_TO_LATITUDE,
  KM_TO_LONGITUDE,
  QUAD9_COLOR,
  UNIT_KMS,
} from "../globe/common";
import { CommonData } from "./common";
import { CounterData, LifetimeData, PositionData } from "../service/data";
import { Settings } from "../settings";

const MAX_SPAWN_DELAY_MS = 5000;
const RANDOM_OFFSET_MAX_KM = 20;

const DEFAULT_INFLATION_LIFETIME_PERCENTAGE = 0.02;
const DEFAULT_DEFLATION_LIFETIME_PERCENTAGE = 0.07;

const DEFAULT_TOTAL_POINT_LIFETIME = 15000;
const DEFAULT_LABEL_LIFETIME = 5000;

export const EXPLOSION_COLOR_DARK = QUAD9_COLOR;
export const EXPLOSION_INFLATING_COLOR_DARK = DEFAULT_CRITICAL_COLOR;
export const EXPLOSION_COLOR_LIGHT = new THREE.Color(0x328708);
export const EXPLOSION_INFLATING_COLOR_LIGHT = new THREE.Color(0x5edc20);

/**
 * Additional data that can be used to customize explosions
 */
export interface ExplosionCustomizationData {
  /**
   * Initial explosion color. Color used while the explosion is expanding.
   */
  explosion_initial_color?: THREE.Color;
  /**
   * How long the explosion should take to settle down in milliseconds.
   */
  explosion_initial_radius_interval?: number;
  /**
   * Radius of the explosion at its highest in kilometers.
   */
  explosion_initial_radius_size?: number;
  /**
   * Fallback explosion color. Color used after explosion settles down.
   */
  explosion_fallback_color?: THREE.Color;
  /**
   * How long the explosion should stay settled down in milliseconds.
   */
  explosion_fallback_radius_interval?: number;
  /**
   * Radius of the explosion when settled down in kilometers.
   */
  explosion_fallback_radius_size?: number;
}

/**
 * Data representing a single explosion on the globe
 */
export class ExplosionData
  extends CommonData<ExplosionCustomizationData>
  implements
    ExplosionCustomizationData,
    PointData,
    HoverTextData,
    LabelsData,
    LinkData,
    ScaleData,
    HoverTextData
{
  /**
   * How much the point should inflate at the start, before starting to deflate
   * Not recommended to go over 2
   * This will also affect the overall scale of the point
   */
  inflation_factor: number;
  /**
   * Fraction of lifetime that label should be visible for
   */
  label_expiry_fraction: number;
  /**
   * Fraction of lifetime that should be spent inflating
   */
  inflation_fraction: number;
  /**
   * Fraction of lifetime that should be spent deflating
   */
  deflation_fraction: number;
  /**
   * Initial radius in world units
   */
  initial_radius: number;
  /**
   * Last stage radius in world units
   */
  fallback_radius: number;

  constructor(
    data: PositionData &
      CounterData &
      LifetimeData &
      ExplosionCustomizationData &
      HoverTextData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData & { inflation_factor?: number | null },
  ) {
    super(data);
    this.inflation_factor = data.inflation_factor ?? 1;
    this.total_lifetime = data.explosion_fallback_radius_interval
      ? data.explosion_fallback_radius_interval +
        (data.explosion_initial_radius_interval ??
          data.explosion_fallback_radius_interval *
            (DEFAULT_INFLATION_LIFETIME_PERCENTAGE +
              DEFAULT_DEFLATION_LIFETIME_PERCENTAGE))
      : DEFAULT_TOTAL_POINT_LIFETIME;

    this.label_expiry_fraction =
      (data.display_text_interval ??
        (DEFAULT_LABEL_LIFETIME / DEFAULT_TOTAL_POINT_LIFETIME) *
          this.total_lifetime) / this.total_lifetime;

    const initial_lifetime_fraction = data.explosion_initial_radius_interval
      ? data.explosion_initial_radius_interval / this.total_lifetime
      : DEFAULT_INFLATION_LIFETIME_PERCENTAGE +
        DEFAULT_DEFLATION_LIFETIME_PERCENTAGE;
    this.inflation_fraction =
      (initial_lifetime_fraction * DEFAULT_INFLATION_LIFETIME_PERCENTAGE) /
      (DEFAULT_INFLATION_LIFETIME_PERCENTAGE +
        DEFAULT_DEFLATION_LIFETIME_PERCENTAGE);
    this.deflation_fraction =
      (initial_lifetime_fraction * DEFAULT_DEFLATION_LIFETIME_PERCENTAGE) /
      (DEFAULT_INFLATION_LIFETIME_PERCENTAGE +
        DEFAULT_DEFLATION_LIFETIME_PERCENTAGE);

    this.initial_radius = data.explosion_initial_radius_size
      ? data.explosion_initial_radius_size / UNIT_KMS
      : 1;
    this.fallback_radius = data.explosion_fallback_radius_size
      ? data.explosion_fallback_radius_size / UNIT_KMS
      : 1;
  }

  public static withSettings(
    data: PositionData &
      CounterData &
      LifetimeData &
      ExplosionCustomizationData &
      HoverTextData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData,
    settings: Settings,
  ) {
    return new ExplosionData({
      ...data,
      inflation_factor:
        (data.counter ?? 1) == 1 || settings.enableCounterScaling == false
          ? 1.0
          : lerp(
              1,
              settings.maximumScale,
              clamp(data.counter ?? 1, 1, settings.maximumScaleCounter) /
                settings.maximumScaleCounter,
            ),
    });
  }

  public get explosion_initial_color(): THREE.Color | undefined {
    return this.additional_data.explosion_initial_color;
  }
  public get explosion_initial_radius_interval(): number | undefined {
    return this.additional_data.explosion_initial_radius_interval;
  }
  public get explosion_initial_radius_size(): number | undefined {
    return this.additional_data.explosion_initial_radius_size;
  }
  public get explosion_fallback_color(): THREE.Color | undefined {
    return this.additional_data.explosion_fallback_color;
  }
  public get explosion_fallback_radius_interval(): number | undefined {
    return this.additional_data.explosion_initial_radius_interval;
  }
  public get explosion_fallback_radius_size(): number | undefined {
    return this.additional_data.explosion_initial_radius_size;
  }

  /**
   * Randomizes the location of the explosion up to 20km in lat and lon
   */
  randomizeLocation(): ExplosionData {
    // Add random offset of up to 20km in lat and lon
    this.lat +=
      Math.random() * 2 * RANDOM_OFFSET_MAX_KM * KM_TO_LATITUDE -
      RANDOM_OFFSET_MAX_KM * KM_TO_LATITUDE;
    this.lon +=
      Math.random() * 2 * RANDOM_OFFSET_MAX_KM * KM_TO_LONGITUDE -
      RANDOM_OFFSET_MAX_KM * KM_TO_LONGITUDE;
    return this;
  }

  /**
   * Randomizes the startTime of the explosion up to 5 seconds in the future, to prevent explosion spikes.
   */
  randomizeSpawnTime(): ExplosionData {
    const addition = Math.random() * MAX_SPAWN_DELAY_MS;
    this.startTime += addition;
    this.lifetime -= addition;
    return this;
  }

  labelExpired(): boolean {
    return this.lifetime_fraction > this.label_expiry_fraction;
  }

  /**
   * Explosions have an additional outline when expanding for better visibility.
   * This defines its lifetime.
   */
  needsOutline(): boolean {
    return (
      this.lifetime_fraction < this.inflation_fraction + this.deflation_fraction
    );
  }

  /**
   * Explosions are slowly changing colors while settling down.
   * This defines the interval when that is needed.
   */
  needsColorLerp(): boolean {
    return (
      this.inflation_factor > 1 &&
      this.lifetime_fraction < this.deflation_fraction + this.inflation_fraction
    );
  }

  /**
   * Generates color interpolation factor in the period when explosion is settling down
   */
  colorLerpFactor(): number {
    if (!this.needsColorLerp()) {
      return 1.0;
    } else if (this.lifetime_fraction < this.inflation_fraction) {
      return 0.0;
    } else {
      return (
        this.lifetime_fraction /
        (this.deflation_fraction + this.inflation_fraction)
      );
    }
  }

  /**
   * Defines the color at the start of explosion.
   */
  startColor(defaultColor: THREE.Color): THREE.Color {
    return this.additional_data.explosion_initial_color ?? defaultColor;
  }

  /**
   * Defines the color at the end of explosion.
   */
  endColor(defaultColor: THREE.Color): THREE.Color {
    return this.additional_data.explosion_fallback_color ?? defaultColor;
  }

  /**
   * Calculates scale of the explosion - usually explosions start at max size and start deflating,
   * but for explosion with inflation_factor > 1, they will first start inflating and then deflate
   */
  scale(): number {
    if (
      this.inflation_factor > 1 &&
      this.lifetime_fraction < this.inflation_fraction
    ) {
      // Inflation period - starting at 2, up to inflation_factor
      // 2 is the initial max scale
      return lerp(
        1,
        2 * this.initial_radius * this.inflation_factor,
        Math.pow(this.lifetime_fraction / this.inflation_fraction, 2),
      );
    } else if (this.lifetime_fraction > 0.5) {
      // Slow deflation for the second part of lifetime, until the dot disappears completely
      return (
        (1 - this.lifetime_fraction) *
        this.inflation_factor *
        this.fallback_radius
      );
    } else if (
      this.lifetime_fraction >
      this.deflation_fraction +
        (this.inflation_factor > 1 ? this.inflation_fraction : 0.0)
    ) {
      // Fixed size after initial deflation, until the second half of lifetime
      return 0.5 * this.inflation_factor * this.fallback_radius;
    } else {
      // Quick deflation period
      // Start at max size (either 2 or 2 * inflation_factor for inflated points)
      const deflation_lifetime_fraction =
        this.lifetime_fraction -
        (this.inflation_factor > 1 ? this.inflation_fraction : 0.0);
      return lerp(
        0.5 * this.inflation_factor * this.fallback_radius,
        2 * this.initial_radius * this.inflation_factor,
        1 - deflation_lifetime_fraction / this.deflation_fraction,
      );
    }
  }

  variableScale(): boolean {
    return true;
  }

  applyGlobalScale(): boolean {
    // Set to false, because explosion provide their own scale.
    return false;
  }

  clone(): ExplosionData {
    const new_data = new ExplosionData({
      lat: this.lat,
      lon: this.lon,
      ttl: this.total_lifetime,
      fade_duration: this.fade_duration,
      inflation_factor: this.inflation_factor,
      always_faces_viewer: this.always_faces_viewer,
      counter: this.counter,
      ...this.additional_data,
    });
    return new_data;
  }

  scaleZ(): boolean {
    return true;
  }

  labelScale(): number {
    // This ensures that label generally stays the same size throughout the explosion inflation
    return 1 / this.scale();
  }
}
