import ThreeGlobe from "three-globe";
import { Settings } from "../../../settings";
import { GlobeLayerFrameUpdateHook } from "../../layer";

/**
 * Helper for dirty flag, to ensure that some operations are only done when needed
 * Cleared after set number of frames
 *
 * NOTE: the `updateFrame` hook must be called for this to work!
 */
export class DirtyFlag implements GlobeLayerFrameUpdateHook {
  readonly layerName: string = "DirtyFlagHelper";

  private dirty: boolean = false;
  private framesUntilClean = 0;
  private framesToClean: number;

  constructor(framesToClean: number = 1) {
    this.framesToClean = framesToClean;
  }

  updateFrame(_globe: ThreeGlobe, _settings: Settings): void {
    if (this.dirty && this.framesUntilClean == 0) {
      this.dirty = false;
    } else if (this.framesUntilClean > 0) {
      this.framesUntilClean--;
    }
  }

  /**
   * Returns true if the dirty flag is still set and update operations needs to be performed
   */
  public isSet() {
    return this.dirty;
  }

  /**
   * Sets the dirty flag and prepares set number of frames to clean it
   */
  public set() {
    this.dirty = true;
    this.framesUntilClean += this.framesToClean;
  }
}
