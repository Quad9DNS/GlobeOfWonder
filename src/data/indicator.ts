import { ExpirableObject } from "./expirable";

export interface IndicatorData extends ExpirableObject {
  /**
   * Total lifetime of the indicator
   */
  total_lifetime: number;

  /**
   * Whether the object should be displayed. It can change throughout the object lifetime.
   *
   * @returns true if object should be visible, false otherwise
   */
  visible(): boolean;

  /**
   * Updates the state of this object according to current time.
   *
   * @param currentTime current UTC time in milliseconds
   * @returns this instance, or null if this object is expired and should be deleted
   */
  update(currentTime: number): IndicatorData | null;
}
