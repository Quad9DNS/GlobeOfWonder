import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CustomObjectProvider,
} from "./customobject";
import { BarData } from "../../data/bar";
import { DEFAULT_CRITICAL_COLOR, UNIT_KMS } from "../common";
import { GlobeLayerAttachHook } from "../layer";
import CommonObjectProvider from "./utils/baseprovider";

const barGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
barGeometry.computeBoundingBox();
const lightColor = new THREE.Color(0xffffff);
const lightIntensity = Math.PI;
const barMaterial = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: DEFAULT_CRITICAL_COLOR },
    bottomColor: { value: DEFAULT_CRITICAL_COLOR },
    opacity: { value: 1.0 },
    bboxMin: {
      value: barGeometry.boundingBox?.min,
    },
    bboxMax: {
      value: barGeometry.boundingBox?.max,
    },
    lightColor: { value: lightColor },
    lightIntensity: { value: lightIntensity },
  },
  // Vertex shader used to provide y-axis value to the fragment shader
  vertexShader: `
      uniform vec3 bboxMin;
      uniform vec3 bboxMax;

      varying vec2 vUv;

      void main() {
        vUv.y = (position.y - bboxMin.y) / (bboxMax.y - bboxMin.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
  // Shader is needed for gradient
  fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float opacity;

      varying vec2 vUv;

      void main() {
        gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), opacity);
      }
    `,
});

/**
 * Globe layer that draws {@link BarData} objects.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Group (bar_parent)
 *   - THREE.Mesh (bar)
 */
export class BarsLayer
  implements
    GlobeLayerAttachHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "Bars";
  private cachedGlobe: ThreeGlobe | null = null;
  private globePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private barPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedGlobe.getWorldPosition(this.globePos);
  }
  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof BarData)) {
      return;
    }

    const material = barMaterial.clone();
    if (object.bar_top_color || object.bar_bottom_color) {
      if (object.bar_top_color) {
        material.uniforms.topColor.value = object.bar_top_color;
      }
      if (object.bar_bottom_color) {
        material.uniforms.bottomColor.value = object.bar_bottom_color;
      }
    }
    const barParent = new THREE.Group();
    barParent.name = "bar_parent";
    const bar = new THREE.Mesh(barGeometry, material);
    bar.name = "bar";
    const radius = object.bar_diameter;
    if (radius) {
      bar.scale.set(radius / UNIT_KMS, 1, radius / UNIT_KMS);
    }

    const height = object.bar_height / UNIT_KMS;
    bar.scale.setY(height);
    bar.position.z = (height ?? 1) / 2;

    // Rotate the bar to face up
    bar.rotateX(Math.PI / 2);

    barParent.add(bar);
    parent.add(barParent);

    // Turn the bar to face directly away from the globe - to lay flat on it
    barParent.getWorldPosition(this.barPos);
    parent.lookAt(
      this.barPos.addVectors(
        this.globePos,
        this.barPos.sub(this.globePos).multiplyScalar(2),
      ),
    );
  }
  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof BarData)) {
      return;
    }

    // Opacity is not available in shader directly, so we need to pass it down to it every frame
    const bar = parent.getObjectByName("bar") as THREE.Mesh;
    (bar.material as THREE.ShaderMaterial).uniforms.opacity.value = (
      bar.material as THREE.ShaderMaterial
    ).opacity;
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link BarData} objects.
 */
export class BarsObjectProvider extends CommonObjectProvider<BarData> {
  readonly layerName: string = "BarsProvider";

  shouldTakePoint(point: PointData): boolean {
    return point instanceof BarData;
  }

  layerEnabled(settings: Settings): boolean {
    return settings.enableBars;
  }
}
