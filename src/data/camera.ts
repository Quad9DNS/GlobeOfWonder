import { clamp, inverseLerp, lerp } from "three/src/math/MathUtils.js";

export const DEFAULT_CAMERA_DISTANCE = 300;
export const MIN_CAMERA_DISTANCE = 101;
export const MAX_CAMERA_DISTANCE = 750;

/**
 * Represents a single camera position definition.
 */
export interface CameraPosition {
  /**
   * Latitude of the point the camera should focus on (camera always faces the globe at 90 degrees).
   */
  readonly lat: number;
  /**
   * Longitude of the point the camera should focus on (camera always faces the globe at 90 degrees).
   */
  readonly lon: number;
  /**
   * Zoom level of the camera. It is a number between 10 and -10, where -10 is the least zoomed in and at maximum camera distance, while 10 is at minimum camera distance.
   * This is implemented by moving the camera closer/further away, rather than changing the actual zoom level.
   */
  readonly zoom?: number;
  /**
   * Movement speed of the camera after a move command.
   */
  readonly camera_movement_speed?: number;
  /**
   * If true, the camera should be moved instantly.
   */
  readonly instant_move?: boolean;
}

export function zoomToDistance(zoomLevel: number): number {
  return zoomLevel > 0
    ? lerp(MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE, 1 - zoomLevel / 10.0)
    : lerp(DEFAULT_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, zoomLevel / -10.0);
}

export function distanceToZoom(distance: number): number {
  return distance < DEFAULT_CAMERA_DISTANCE
    ? (1 -
        inverseLerp(MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE, distance)) *
        10.0
    : inverseLerp(DEFAULT_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, distance) *
        -10.0;
}

export function normalize(position: CameraPosition): CameraPosition {
  return {
    lat: clamp(position.lat, -90, 90),
    lon: clamp(position.lon, -180, 180),
    zoom: position.zoom ? clamp(position.zoom, -10, 10) : undefined,
    camera_movement_speed: position.camera_movement_speed
      ? Math.abs(position.camera_movement_speed)
      : undefined,
    instant_move: position.instant_move,
  };
}
