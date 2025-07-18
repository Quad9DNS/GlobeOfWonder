import ThreeGlobe from "three-globe";
import { Settings } from "../../settings";
import { GlobeLayerFrameUpdateHook } from "../layer";

/**
 * Globe layer that automatically rotates the globe (if the setting is active)
 * NOTE: this layer is frame rate dependent - higher frame rates will result in faster rotation,
 * but this produces a better looking effect when the frame rate is low
 */
export class RotationLayer implements GlobeLayerFrameUpdateHook {
  readonly layerName: string = "Rotation";
  updateFrame(globe: ThreeGlobe, settings: Settings): void {
    if (settings.autoRotateGlobe) {
      globe.rotation.y += 0.001;
    }
  }
}
