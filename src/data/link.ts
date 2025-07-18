/**
 * Data about components with links
 */
export interface LinkData {
  /**
   * Link to open when object is clicked (or when its hover window is clicked if `hover_text` is defined)
   */
  readonly link_url: string | null;
  /**
   * Whether to open the link in a new window
   */
  readonly new_window: boolean | null;
}

/**
 * Checks whether the object implements {@link LinkData} interface
 */
export function isLinkData(object: unknown): object is LinkData {
  return (object as LinkData).link_url !== undefined;
}
