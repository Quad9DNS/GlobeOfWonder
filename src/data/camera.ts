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
  readonly zoom: number;
}
