import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "./customobject";
import { GlobeLayerAttachHook, GlobeLayerSceneAttachHook } from "../layer";
import CommonObjectProvider from "./utils/baseprovider";
import { TextboxPointerData } from "../../data/textbox";
import { getGeoCoords } from "../common";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry, LineMaterial } from "three/examples/jsm/Addons.js";

const lineMaterial = new LineMaterial({
  color: new THREE.Color("red"),
  linewidth: 1,
});

const zero = new THREE.Vector3();

/**
 * Globe layer that draws {@link TextboxPointerData} objects.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Object3D - just a dummy object that can be used to find the line in scene hierarchy
 * Adds the following hierarchy to the root scene:
 * - THREE.Line - the line from the globe to the textbox (on camera)
 */
export class TextboxPointersLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSceneAttachHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "TextboxPointers";
  private cachedCamera!: THREE.Camera;
  private cachedGlobe!: ThreeGlobe;
  private cachedScene!: THREE.Scene;

  private pointerGlobePos = new THREE.Vector3();
  private pointerEndPos = new THREE.Vector3();

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedCamera = camera;
  }

  attachToScene(
    scene: THREE.Scene,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedScene = scene;
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof TextboxPointerData)) {
      return;
    }

    const top = object.textbox.top;
    const left = object.textbox.left;
    const right = object.textbox.right;
    const bottom = object.textbox.bottom;

    let material = lineMaterial;
    if (
      object.text_pointer_color ||
      object.text_pointer_opacity ||
      object.text_pointer_thickness
    ) {
      material = material.clone();
    }
    if (object.text_pointer_color) {
      material.color.set(object.text_pointer_color);
    }
    if (object.text_pointer_opacity) {
      material.opacity = object.text_pointer_opacity / 100;
    }
    if (object.text_pointer_thickness) {
      material.linewidth = object.text_pointer_thickness;
    }

    parent.getWorldPosition(this.pointerGlobePos);
    this.pointerEndPos
      .set(
        (left + right - window.innerWidth) / window.innerWidth,
        -(top + bottom - window.innerHeight) / window.innerHeight,
        0,
      )
      .unproject(this.cachedCamera)
      .sub(this.pointerGlobePos);

    const points = [zero, this.pointerEndPos];
    const geometry = new LineGeometry().setFromPoints(points);
    const pointerLine = new Line2(geometry, material);

    const dummy = new THREE.Object3D();
    dummy.name = "dummy";

    pointerLine.name = dummy.uuid;
    this.cachedScene.add(pointerLine);
    pointerLine.position.setFromMatrixPosition(dummy.matrixWorld);
    parent.addEventListener("removed", () => {
      this.cachedScene.remove(pointerLine);
    });
    parent.add(dummy);
  }

  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof TextboxPointerData)) {
      return;
    }

    const top = object.textbox.top;
    const left = object.textbox.left;
    const right = object.textbox.right;
    const bottom = object.textbox.bottom;

    const dummy = parent.getObjectByName("dummy")!;
    const line = this.cachedScene.getObjectByName(dummy.uuid)! as THREE.Line;

    parent.getWorldPosition(this.pointerGlobePos);
    // BUG: this seems to lag 1 frame behind the camera updates when `OrbitControls` are used
    this.pointerEndPos
      .set(
        (left + right - window.innerWidth) / window.innerWidth,
        -(top + bottom - window.innerHeight) / window.innerHeight,
        0,
      )
      .unproject(this.cachedCamera)
      .sub(this.pointerGlobePos);

    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setFromPoints([zero, this.pointerEndPos]);

    const {
      lat: currentLat,
      lng: currentLon,
      altitude: _altitude,
    } = getGeoCoords(this.cachedGlobe, this.cachedCamera.position);

    line.visible = object.updateVisibility(currentLon, currentLat);
    line.position.setFromMatrixPosition(dummy.matrixWorld);
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link TextboxPointerData} objects.
 */
export class TextboxPointersObjectProvider extends CommonObjectProvider<PointData> {
  readonly layerName: string = "TextboxPointersProvider";

  layerEnabled(settings: Settings): boolean {
    return settings.enableTextboxCommands;
  }
  shouldTakePoint(point: PointData): boolean {
    return point instanceof TextboxPointerData;
  }
}
