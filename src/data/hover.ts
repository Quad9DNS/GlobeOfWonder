/**
 * Data about custom hover/click component on points
 */
export interface HoverTextData {
  /**
   * Text to display when hovering over an object.
   * If object also has a label defined, then this only appears on click.
   */
  readonly hover_text: string | null;
}

/**
 * Checks whether the object implements {@link HoverTextData} interface
 */
export function isHoverTextData(object: unknown): object is HoverTextData {
  return (object as HoverTextData).hover_text !== undefined;
}
