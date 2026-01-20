import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "./customobject";
import { GlobeLayerAppStateHook, GlobeLayerAttachHook } from "../layer";
import CommonObjectProvider from "./utils/baseprovider";
import { TextboxData, TextboxPointerData } from "../../data/textbox";
import { getGeoCoords } from "../common";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry, LineMaterial } from "three/examples/jsm/Addons.js";
import { AppState } from "../../service/state";

const lineMaterial = new LineMaterial({
  color: new THREE.Color("red"),
  linewidth: 1,
});

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
    GlobeLayerAppStateHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "TextboxPointers";
  private cachedCamera!: THREE.Camera;
  private cachedGlobe!: ThreeGlobe;
  private state!: AppState;

  private pointerGlobePos = new THREE.Vector3();
  private pointerEndPos = new THREE.Vector3();

  private directionVec = new THREE.Vector3();
  private directionUp = new THREE.Vector3();
  private arrowLeftCorner = new THREE.Vector3();
  private arrowRightCorner = new THREE.Vector3();
  private arrowLeftQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    Math.PI / 2,
  );
  private arrowRightQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -Math.PI,
  );

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedGlobe = globe;
    this.cachedCamera = camera;
  }

  attachToState(state: AppState): void {
    this.state = state;
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof TextboxPointerData)) {
      return;
    }

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

    const geometry = new LineGeometry().setFromPoints(
      this.generatePoints(parent, object),
    );
    const pointerLine = new Line2(geometry, material);

    const dummy = new THREE.Object3D();
    dummy.name = "dummy";

    pointerLine.name = dummy.uuid;
    this.cachedCamera.add(pointerLine);
    parent.addEventListener("removed", () => {
      this.cachedCamera.remove(pointerLine);
      // HACK: removing indicator when the textbox is removed
      this.state.newNonEventIndicatorsQueue.push(
        new TextboxData({
          left: object.textbox.left,
          right: object.textbox.right,
          top: object.textbox.top,
          bottom: object.textbox.bottom,
          text: undefined,
        }),
      );
    });
    parent.add(dummy);
  }

  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof TextboxPointerData)) {
      return;
    }

    const dummy = parent.getObjectByName("dummy")!;
    const line = this.cachedCamera.getObjectByName(dummy.uuid)! as THREE.Line;

    line.geometry.setFromPoints(this.generatePoints(parent, object));
    line.geometry.attributes.position.needsUpdate = true;

    const {
      lat: currentLat,
      lng: currentLon,
      altitude: _altitude,
    } = getGeoCoords(this.cachedGlobe, this.cachedCamera.position);

    line.visible = object.updateVisibility(currentLon, currentLat);
  }

  generatePoints(
    parent: THREE.Object3D,
    object: TextboxPointerData,
  ): THREE.Vector3[] {
    const top = object.textbox.top;
    const left = object.textbox.left;
    const right = object.textbox.right;
    const bottom = object.textbox.bottom;

    parent.getWorldPosition(this.pointerGlobePos).project(this.cachedCamera);
    this.pointerGlobePos.z = 0;
    this.pointerGlobePos.unproject(this.cachedCamera);
    this.pointerEndPos
      .set(
        (left + right - window.innerWidth) / window.innerWidth,
        -(top + bottom - window.innerHeight) / window.innerHeight,
        0,
      )
      .unproject(this.cachedCamera);

    const points: THREE.Vector3[] = [
      this.cachedCamera.worldToLocal(this.pointerEndPos),
      this.cachedCamera.worldToLocal(this.pointerGlobePos),
    ];

    if (object.text_pointer_arrow_size) {
      this.directionVec
        .subVectors(points[1], points[0])
        .normalize()
        .multiplyScalar(object.text_pointer_arrow_size * 0.005);
      this.directionUp
        .subVectors(this.pointerGlobePos, this.cachedGlobe.position)
        .normalize();
      this.arrowLeftQuat
        .setFromAxisAngle(this.directionUp, Math.PI / 8)
        .normalize();
      this.arrowRightQuat
        .setFromAxisAngle(this.directionUp, -Math.PI / 4)
        .normalize();
      this.arrowLeftCorner.subVectors(
        points[1],
        this.directionVec.applyQuaternion(this.arrowLeftQuat),
      );
      points.push(this.arrowLeftCorner);
      points.push(this.pointerGlobePos);
      this.arrowRightCorner.subVectors(
        points[1],
        this.directionVec.applyQuaternion(this.arrowRightQuat),
      );
      points.push(this.arrowRightCorner);
      points.push(this.pointerGlobePos);
    }

    return points;
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
