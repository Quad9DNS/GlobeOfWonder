import * as THREE from "three";

/**
 * Data about custom labels to show on the map
 */
export interface LabelsData {
  /**
   * Text to display in the label.
   */
  readonly display_text: string | null;
  /**
   * Duration for the label to be visible. By default it is visible for as long as the object is.
   */
  readonly display_text_interval: number | null;
  /**
   * Font to use for the label.
   */
  readonly display_text_font: string | null;
  /**
   * Font size to use for the label in pixels. Due to scaling it may not be entirely accurate.
   */
  readonly display_text_font_size: number | null;
  /**
   * Font style to use for the label ("bold", "italic", or combination - "bold italic")
   */
  readonly display_text_font_style: string | null;
  /**
   * Color to use for the label.
   */
  readonly display_text_color: THREE.Color | null;
  /**
   * Text outline color to use for the label.
   */
  readonly display_text_outline_color: THREE.Color | null;
  /**
   * Whether the label should always turn to face the camera.
   */
  readonly display_text_always_faces_viewer: boolean | null;
  /**
   * Whether the label should be visible only when mouse is hovered above the object.
   */
  readonly display_text_hover_only: boolean | null;

  /**
   * Defines label lifetime.
   *
   * @returns true if the label should no longer be visible
   */
  labelExpired(): boolean;

  /**
   * Defines the offset from object center to display the label at.
   * For most objects, center should be good enough.
   *
   * @returns vector offset from object center
   */
  labelOffset(): THREE.Vector3;

  /**
   * Scale of the label. Can be useful to scale it according to object scale changes.
   *
   * @returns relative scale of the label (1 is default size)
   */
  labelScale(): number;

  /**
   * @returns true if the label should turn to face the camera.
   */
  labelFaceCamera(): boolean;
}

/**
 * Checks whether the object implements {@link LabelsData} interface
 */
export function isLabelsData(object: unknown): object is LabelsData {
  return (object as LabelsData).display_text !== undefined;
}
