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
import { getGeoCoords } from "../common";
import { AppState } from "../../service/state";
import { GraphAnchorData, GraphData } from "../../data/graph";

/**
 * Globe layer that draws {@link GraphAnchorData} objects.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Object3D - just a dummy object that can be used to find the anchor in scene hierarchy
 */
export class GraphAnchorsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerAppStateHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "GraphAnchors";
  private cachedCamera!: THREE.Camera;
  private cachedGlobe!: ThreeGlobe;
  private state!: AppState;

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
    if (!(object instanceof GraphAnchorData)) {
      return;
    }

    const dummy = new THREE.Object3D();
    dummy.name = "dummy";

    parent.addEventListener("removed", () => {
      // HACK: removing indicator when the graph is removed
      this.state.newNonEventIndicatorsQueue.push(
        new GraphData({
          left: object.graph.left,
          right: object.graph.right,
          top: object.graph.top,
          bottom: object.graph.bottom,
          name: undefined,
        }),
      );
    });
    parent.add(dummy);
  }

  updateObjectFrame(_parent: THREE.Object3D, object: PointData): void {
    if (!(object instanceof GraphAnchorData)) {
      return;
    }

    const {
      lat: currentLat,
      lng: currentLon,
      altitude: _altitude,
    } = getGeoCoords(this.cachedGlobe, this.cachedCamera.position);

    object.updateVisibility(currentLon, currentLat);
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link GraphAnchorData} objects.
 */
export class GraphAnchorsObjectProvider extends CommonObjectProvider<PointData> {
  readonly objectType: string = "graph";
  readonly layerName: string = "GraphAnchorsProvider";

  layerEnabled(settings: Settings): boolean {
    return settings.enableGraphCommands;
  }
  shouldTakePoint(point: PointData): boolean {
    return point instanceof GraphAnchorData;
  }
}
