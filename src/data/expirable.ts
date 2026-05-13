export interface ExpirableObject {
  /**
   * Updates the state of this object according to current time.
   *
   * @param currentTime current UTC time in milliseconds
   * @returns this instance, or null if this object is expired and should be deleted
   */
  update(currentTime: number): ExpirableObject | null;
}
