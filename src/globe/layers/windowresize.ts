import * as THREE from "three";
import { GlobeLayerSceneAttachHook } from "../layer";

/**
 * Globe layer that resizes the renderer according to window size changes
 */
export class WindowResizeLayer implements GlobeLayerSceneAttachHook {
  readonly layerName: string = "WindowResize";
  attachToScene(
    _scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    if (camera instanceof THREE.PerspectiveCamera) {
      function onWindowResize() {
        (camera as THREE.PerspectiveCamera).aspect =
          window.innerWidth / window.innerHeight;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

        renderer?.setSize(window.innerWidth, window.innerHeight);
      }

      window.addEventListener("resize", onWindowResize);
    }
  }
}
