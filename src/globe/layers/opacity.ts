import * as THREE from "three";
import { LayerData, PointData } from "../../data";
import { Settings, SettingsChangedEvent } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "./customobject";
import { GlobeLayerFrameUpdateHook, GlobeLayerSettingsHook } from "../layer";
import ThreeGlobe from "three-globe";
import { DirtyFlag } from "./utils/dirty";

/**
 * Globe layer that enforces layer opacity settings.
 * Covers both per layer opacity and global opacity.
 * Also applies {@link PointData#fadeFactor}.
 *
 * NOTE: Looks for "ignoreTransparency" in objects {@link THREE.Object3D#userData} for special behavior.
 * If that flag is set, that object will not have
 * its material {@link THREE.Material#transparent} flag changed by this layer.
 *
 * Also sets "doNotShow" flag, to ensure main custom objects layer
 * does not show objects that were turned invisible by this layer
 */
export class OpacityLayer
  implements
    GlobeLayerSettingsHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook,
    GlobeLayerFrameUpdateHook
{
  readonly layerName: string = "Opacity";
  private dirty = new DirtyFlag();
  private settings: Settings | null = null;

  attachToSettings(settings: Settings): void {
    this.settings = settings;
    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (
        event.detail.field_changed == "globalOpacity" ||
        event.detail.field_changed.startsWith("LayerOpacity")
      ) {
        this.dirty.set();
      }
    });
  }
  buildObject(parent: THREE.Object3D, object: PointData): void {
    const layer = object as unknown as LayerData & PointData;

    const opacity = this.objectOpacity(layer);
    if (opacity <= 0) {
      parent.visible = false;
      parent.userData["doNotShow"] = true;
      return;
    }

    parent.userData["doNotShow"] = false;

    parent.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.Material) {
          if (!child.userData["ignoreTransparency"]) {
            child.material.transparent = opacity < 100;
          }
          child.material.opacity = opacity / 100;
        }
      }
    });
  }
  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    const layer = object as unknown as LayerData & PointData;

    if (!this.dirty.isSet() && layer.fadeFactor() == null) {
      return;
    }

    const opacity = this.objectOpacity(layer);
    if (opacity <= 0) {
      parent.visible = false;
      parent.userData["doNotShow"] = true;
      return;
    }

    parent.userData["doNotShow"] = false;

    parent.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.Material) {
          if (!child.userData["ignoreTransparency"]) {
            child.material.transparent = opacity < 100;
          }
          child.material.opacity = opacity / 100;
        }
      }
    });
  }

  updateFrame(globe: ThreeGlobe, settings: Settings): void {
    this.dirty.updateFrame(globe, settings);
  }

  private objectOpacity(object: LayerData & PointData) {
    let neg = 0;
    if (object.layer_id) {
      neg = 100 - (this.settings!.layers[object.layer_id]?.opacity ?? 100);
    }
    neg += 100 - this.settings!.globalOpacity;
    let opacity = (object.opacity ?? 100) - neg;
    const fadeFactor = object.fadeFactor();
    if (fadeFactor) {
      opacity *= fadeFactor;
    }
    return opacity;
  }
}
