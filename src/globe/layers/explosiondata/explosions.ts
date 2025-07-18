import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings, SettingsChangedEvent } from "../../../settings";
import { ExplosionDataLayer } from ".";
import { PointData } from "../../../data";
import {
  EXPLOSION_COLOR_DARK,
  EXPLOSION_COLOR_LIGHT,
  EXPLOSION_INFLATING_COLOR_DARK,
  EXPLOSION_INFLATING_COLOR_LIGHT,
  ExplosionData,
} from "../../../data/explosion";
import { GlobeLayerAttachHook, GlobeLayerSettingsHook } from "../../layer";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "../customobject";

const DOT_RADIUS = 1;
const OUTLINE_COLOR = new THREE.Color(0x000000);
const OUTLINE_SCALE_DARK_MODE = 1.5;
const OUTLINE_SCALE_LIGHT_MODE = 1.2;
const Z_OFFSET_DARK =
  DOT_RADIUS * DOT_RADIUS -
  (DOT_RADIUS * DOT_RADIUS) /
    (OUTLINE_SCALE_DARK_MODE * OUTLINE_SCALE_DARK_MODE);
const Z_OFFSET_LIGHT =
  DOT_RADIUS * DOT_RADIUS -
  (DOT_RADIUS * DOT_RADIUS) /
    (OUTLINE_SCALE_LIGHT_MODE * OUTLINE_SCALE_LIGHT_MODE);

const lightColor = new THREE.Color(0xffffff);
const lightIntensity = Math.PI;

const geometry = new THREE.SphereGeometry(DOT_RADIUS, 16, 8);
const outlineGeometry = new THREE.CircleGeometry(DOT_RADIUS, 16);
const commonMaterial = new THREE.ShaderMaterial({
  uniforms: {
    startColor: { value: EXPLOSION_INFLATING_COLOR_DARK },
    endColor: { value: EXPLOSION_COLOR_DARK },
    opacity: { value: 1.0 },
    colorInterpolationFactor: { value: 0.0 },
    lightColor: { value: lightColor },
    lightIntensity: { value: lightIntensity },
  },
  // Fragment shader needed for better interpolation of explosion colors
  fragmentShader: `
    #include <common>

    uniform vec3 startColor;
    uniform vec3 endColor;
    uniform vec3 lightColor;
    uniform float lightIntensity;
    uniform float colorInterpolationFactor;
    uniform float opacity;

    void main() {
      gl_FragColor = mix(vec4(startColor, opacity), vec4(endColor, opacity), colorInterpolationFactor) * vec4(lightColor * lightIntensity, 1.0);
    }
    `,
});
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: OUTLINE_COLOR,
  side: THREE.FrontSide,
});

/**
 * Globe layer that draws {@link ExplosionData} objects. Implemented as an {@link ExplosionDataLayer}.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Mesh (mesh)
 *   - THREE.Mesh (outline)
 */
export class ExplosionsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    ExplosionDataLayer,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "Explosions";
  private cachedGlobe: ThreeGlobe | null = null;
  private globePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private explosionPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private currentDotColor = EXPLOSION_COLOR_DARK;
  private currentInflatingDotColor = EXPLOSION_INFLATING_COLOR_DARK;

  private currentZOffset = Z_OFFSET_DARK;

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedGlobe.getWorldPosition(this.globePos);
  }

  attachToSettings(settings: Settings): void {
    this.updateColorScheme(settings.lightMode);

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "lightMode") {
        this.updateColorScheme(settings.lightMode);
      }
    });
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof ExplosionData)) {
      return;
    }

    const mesh = new THREE.Mesh(geometry, commonMaterial.clone());
    mesh.name = "mesh";
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.name = "outline";
    if (object.faceCamera()) {
      outline.position.z = this.currentZOffset;
    } else {
      outline.position.z = 0.2;
      outline.scale.setScalar(1.2);
    }

    mesh.add(outline);
    parent.add(mesh);

    // Turn the explosion to face directly away from the globe - to lay flat on it
    outline.getWorldPosition(this.explosionPos);
    parent.lookAt(
      this.explosionPos.addVectors(
        this.globePos,
        this.explosionPos.sub(this.globePos).multiplyScalar(2),
      ),
    );
  }

  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof ExplosionData)) {
      return;
    }

    const p = object as ExplosionData;
    const outline = parent.getObjectByName("outline");
    if (outline && p.faceCamera()) {
      outline.position.z = this.currentZOffset;
    }
    if (!p.needsOutline()) {
      if (outline) {
        parent.remove(outline);
      }
    }
    const point = parent.getObjectByName("mesh");
    const material = (point as THREE.Mesh).material as THREE.ShaderMaterial;
    material.uniforms.startColor.value = p.startColor(
      this.currentInflatingDotColor,
    );
    material.uniforms.endColor.value = p.endColor(this.currentDotColor);
    material.uniforms.colorInterpolationFactor.value = p.colorLerpFactor();
    material.uniforms.opacity.value = material.opacity;

    if (p.variableScale()) {
      parent.scale.setScalar(p.scale());
    }
  }

  needsCustomObjects(settings: Settings): boolean {
    return settings.enableEventExplosions;
  }
  updateExplosionData(
    _globe: ThreeGlobe,
    _settings: Settings,
    _data: ExplosionData[],
  ): void {}

  private updateColorScheme(lightMode: boolean) {
    this.currentZOffset = lightMode ? Z_OFFSET_LIGHT : Z_OFFSET_DARK;
    this.currentDotColor = lightMode
      ? EXPLOSION_COLOR_LIGHT
      : EXPLOSION_COLOR_DARK;
    this.currentInflatingDotColor = lightMode
      ? EXPLOSION_INFLATING_COLOR_LIGHT
      : EXPLOSION_INFLATING_COLOR_DARK;
    commonMaterial.uniforms.startColor.value = this.currentInflatingDotColor;
    commonMaterial.uniforms.endColor.value = this.currentDotColor;
  }
}
