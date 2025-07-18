import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CustomObjectProvider,
} from "./customobject";
import { PointerData } from "../../data/pointer";
import { QUAD9_COLOR } from "../common";
import { GlobeLayerAttachHook } from "../layer";
import CommonObjectProvider from "./utils/baseprovider";

const glyphShape = new THREE.Shape()
  .moveTo(0, 1.5)
  .arc(0, 0.5, 0.5, (3 * Math.PI) / 2, (7 * Math.PI) / 2, true);
const pointerShape = new THREE.Shape()
  .moveTo(0, 0)
  .lineTo(-1, 1)
  .arc(1, 1, Math.SQRT2, (5 * Math.PI) / 4, -Math.PI / 4, true)
  .moveTo(1, 1)
  .lineTo(0, 0);
pointerShape.holes.push(glyphShape);
const SQRT_02 = Math.sqrt(0.02);
const SQRT_08 = Math.sqrt(0.08);
const outlineShape = new THREE.Shape()
  .moveTo(0, -SQRT_08)
  .lineTo(-1 - SQRT_02, 1.0 - SQRT_02)
  .arc(
    1 + SQRT_02,
    1.0 + SQRT_02,
    Math.SQRT2 + 0.2,
    (5 * Math.PI) / 4,
    -Math.PI / 4,
    true,
  )
  .moveTo(1 + SQRT_02, 1 - SQRT_02)
  .lineTo(0, -SQRT_08);
outlineShape.holes.push(pointerShape);
const pointerGeometry = new THREE.ShapeGeometry([
  outlineShape,
  pointerShape,
  glyphShape,
]);
const circleMaterial = new THREE.MeshBasicMaterial({
  color: QUAD9_COLOR,
  side: THREE.FrontSide,
  transparent: true,
});
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xba103b),
  side: THREE.FrontSide,
  transparent: true,
});
const glyphMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xba103b),
  side: THREE.FrontSide,
  transparent: true,
});

/**
 * Globe layer that draws {@link PointerData} objects.
 * Pointers are always faced north.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Group
 *   - THREE.Mesh (pointer)
 *
 * Sets the "ignoreTransparency" flag to all these objects, because these materials are already transparent.
 */
export class PointersLayer
  implements GlobeLayerAttachHook, CustomObjectLayerBuildHook
{
  readonly layerName: string = "Pointers";
  private cachedGlobe: ThreeGlobe | null = null;
  private pointerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private globePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedGlobe.getWorldPosition(this.globePos);
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof PointerData)) {
      return;
    }

    let materialForBackground = circleMaterial;
    if (object.pointer_background_color) {
      materialForBackground = materialForBackground.clone();
      materialForBackground.color.set(object.pointer_background_color);
    }
    let materialForOutline = outlineMaterial;
    if (object.pointer_border_color) {
      materialForOutline = materialForOutline.clone();
      materialForOutline.color.set(object.pointer_border_color);
    }
    let materialForGlyph = glyphMaterial;
    if (object.pointer_glyph_color) {
      materialForGlyph = materialForGlyph.clone();
      materialForGlyph.color.set(object.pointer_glyph_color);
    }
    const pointer = new THREE.Group();
    const pointerShape = new THREE.Mesh(pointerGeometry, [
      materialForOutline,
      materialForBackground,
      materialForGlyph,
    ]);
    pointerShape.name = "pointer";
    pointerShape.userData["ignoreTransparency"] = true;
    if (object.faceCamera()) {
      pointerShape.position.z = 1;
    } else {
      pointerShape.position.z = 0;
      parent.renderOrder = 800;
    }
    pointerShape.scale.setScalar(object.scale());

    pointer.add(pointerShape);
    parent.add(pointer);

    pointer.getWorldPosition(this.pointerPos);

    if (object.faceCamera()) {
      // Turn the pointer top to the north and prepare to be faced to the camera.
      const toGlobe = this.globePos.clone().sub(this.pointerPos);
      pointerShape.rotateZ(Math.PI);
      pointer.rotateZ(-this.pointerPos.angleTo(toGlobe));
    } else {
      // Turn the pointer to face directly away from the globe - to lay flat on it
      parent.lookAt(
        this.pointerPos.addVectors(
          this.globePos,
          this.pointerPos.sub(this.globePos).multiplyScalar(2),
        ),
      );
    }
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link PointerData} objects.
 */
export class PointersObjectProvider extends CommonObjectProvider<PointerData> {
  readonly layerName: string = "PointersProvider";

  layerEnabled(settings: Settings): boolean {
    return settings.enablePointers;
  }
  shouldTakePoint(point: PointData): boolean {
    return point instanceof PointerData;
  }
}
