import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CustomObjectProvider,
} from "./customobject";
import { CircleData } from "../../data/circle";
import { UNIT_KMS } from "../common";
import { GlobeLayerAttachHook } from "../layer";
import CommonObjectProvider from "./utils/baseprovider";

const DOT_RADIUS = 1;
const circleGeometry = new THREE.Shape().arc(0, 0, 1, 0, 2 * Math.PI);
const circleOutlineGeometry = new THREE.Shape().arc(0, 0, 1.1, 0, 2 * Math.PI);
circleOutlineGeometry.holes.push(circleGeometry);
const basicCircleGeometry = new THREE.CircleGeometry(DOT_RADIUS, 12);
const circleWithOutlineGeometry = new THREE.ShapeGeometry([
  circleOutlineGeometry,
  circleGeometry,
]);
const circleMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("green"),
  side: THREE.FrontSide,
});
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0x000000),
  side: THREE.FrontSide,
});

/**
 * Globe layer that draws {@link CircleData} objects.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Mesh (circle)
 */
export class CirclesLayer
  implements GlobeLayerAttachHook, CustomObjectLayerBuildHook
{
  readonly layerName: string = "Circles";
  private cachedGlobe: ThreeGlobe | null = null;
  private circlePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
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
    if (!(object instanceof CircleData)) {
      return;
    }

    let materialForCircle = circleMaterial;
    if (object.circle_color) {
      materialForCircle = materialForCircle.clone();
      materialForCircle.color.set(object.circle_color);
    }
    let circle: THREE.Mesh;
    if (object.circle_outline_color || object.circle_outline_thickness) {
      let materialForOutline = outlineMaterial;
      if (object.circle_outline_color) {
        materialForOutline = materialForOutline.clone();
        materialForOutline.color.set(object.circle_outline_color);
      }

      let geometry: THREE.ShapeGeometry;
      if (object.circle_outline_thickness) {
        const outline = new THREE.Shape().arc(
          0,
          0,
          1 + 0.1 * object.circle_outline_thickness,
          0,
          2 * Math.PI,
        );
        outline.holes.push(circleGeometry);
        geometry = new THREE.ShapeGeometry([outline, circleGeometry]);
      } else {
        geometry = circleWithOutlineGeometry;
      }

      circle = new THREE.Mesh(geometry, [
        materialForOutline,
        materialForCircle,
      ]);
    } else {
      circle = new THREE.Mesh(basicCircleGeometry, materialForCircle);
    }

    circle.name = "circle";
    const radius = object.circle_radius;
    if (radius) {
      circle.scale.setScalar(radius / UNIT_KMS);
    }

    if (object.faceCamera()) {
      circle.position.z = 1;
    } else {
      circle.position.z = 0;
    }

    parent.add(circle);

    // Turn the circle to face directly away from the globe - to lay flat on it
    circle.getWorldPosition(this.circlePos);
    parent.lookAt(
      this.circlePos.addVectors(
        this.globePos,
        this.circlePos.sub(this.globePos).multiplyScalar(2),
      ),
    );
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link CircleData} objects.
 */
export class CirclesObjectProvider extends CommonObjectProvider<CircleData> {
  readonly layerName: string = "CirclesProvider";

  layerEnabled(settings: Settings): boolean {
    return settings.enableCircles;
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof CircleData;
  }
}
