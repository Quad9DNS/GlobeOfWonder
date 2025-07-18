import * as THREE from "three";
import { GlobeLayerSceneAttachHook } from "../layer";

const lightColor = new THREE.Color(0xffffff);
const lightIntensity = Math.PI;

/**
 * Globe layer that adds ambient light to the scene.
 */
export class AmbientLightLayer implements GlobeLayerSceneAttachHook {
  readonly layerName: string = "AmbientLight";

  attachToScene(
    scene: THREE.Scene,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    scene.add(new THREE.AmbientLight(lightColor, lightIntensity));
  }
}
