import * as THREE from "three";
import { Settings, SettingsChangedEvent } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "./customobject";
import { PointData } from "../../data";
import { isLabelsData, LabelsData } from "../../data/label";
import { GlobeLayerAttachHook, GlobeLayerSettingsHook } from "../layer";
import ThreeGlobe from "three-globe";
import { randFloat } from "three/src/math/MathUtils.js";
import { addHoverListener, MouseInteractionLayer } from "./mouseevents";

const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 20;
const labelGeometry = new THREE.PlaneGeometry(
  DEFAULT_WIDTH / 10,
  DEFAULT_HEIGHT / 10,
);

/**
 * Globe layer implementation for all objects that implement {@link LabelsData}.
 *
 * Adds just one child to the root object:
 * - THREE.Mesh (label) - "ignoreTransparency" flag set, since this is always transparent
 *
 * Implements {@link MouseInteractionLayer} to enable {@link LabelsData#display_text_hover_only}.
 */
export class LabeledObjectsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook,
    MouseInteractionLayer
{
  readonly layerName: string = "Labeled";
  private showLabels = true;
  private allowLabelHover = true;
  private cachedCamera: THREE.Camera | null = null;
  private hadMouseHits: boolean = false;
  private lastLabel: THREE.Object3D | null = null;

  attachToGlobe(
    _globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedCamera = camera;
  }

  attachToSettings(settings: Settings): void {
    this.showLabels = settings.enableEventLabels;
    this.allowLabelHover = settings.enableEventClickActions;

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "enableEventLabels") {
        this.showLabels = settings.enableEventLabels;
      } else if (event.detail.field_changed == "enableEventClickActions") {
        this.allowLabelHover = settings.enableEventClickActions;
      }
    });
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (isLabelsData(object) && object.display_text) {
      const [texture, width, height] = renderLabelToTexture(
        object,
        undefined,
        undefined,
      );
      let geometry = labelGeometry;
      if (width != DEFAULT_WIDTH || height != DEFAULT_HEIGHT) {
        geometry = new THREE.PlaneGeometry(width / 10, height / 10);
      }
      const label = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
      );
      label.name = "label";
      label.userData["ignoreTransparency"] = true;
      // Small randomization to reduce z fighting in crowded areas
      label.position.z = 0.1 + randFloat(0.01, 0.05);
      if (object.faceCamera() || object.labelFaceCamera()) {
        label.position.z += 1;
      }
      label.position.add(object.labelOffset());
      label.renderOrder = 999;
      label.visible = this.showLabels;
      parent.add(label);

      if (object.labelFaceCamera() && this.cachedCamera) {
        label.lookAt(this.cachedCamera.position);
      }

      if (object.display_text_hover_only) {
        if (this.allowLabelHover) {
          label.visible = false;
        }
        addHoverListener(parent, () => {
          this.hadMouseHits = true;
          if (this.lastLabel) {
            this.lastLabel.visible = false;
          }
          this.lastLabel = label;
          label.visible = this.showLabels;
        });
      }
    }
  }

  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (isLabelsData(object)) {
      const label = parent.getObjectByName("label");
      if (label) {
        if (object.labelExpired()) {
          parent.remove(label);
        } else {
          label.scale.setScalar(object.labelScale());
        }

        if (object.labelFaceCamera() && this.cachedCamera) {
          label.lookAt(this.cachedCamera.position);
        }

        // This ensures proper reaction to settings changes, also ensuring that no label gets stuck
        if (label.id != this.lastLabel?.id) {
          label.visible =
            this.showLabels &&
            (!object.display_text_hover_only || !this.allowLabelHover);
        }
      }
    }
  }

  preMouseMove(): void {
    this.hadMouseHits = false;
  }
  postMouseMove(): void {
    // If no label was highlighted in this mouse movement, hide last label
    if (!this.hadMouseHits && this.lastLabel) {
      this.lastLabel.visible = !this.allowLabelHover;
      this.lastLabel = null;
    }
  }
}

function renderLabelToTexture(
  label: LabelsData,
  background_color: string | undefined,
  border_color: string | undefined,
): [THREE.Texture, number, number] {
  //create image
  const bitmap = document.createElement("canvas");
  const g = bitmap.getContext("2d");
  if (g) {
    const fontSize = label.display_text_font_size ?? 24;
    const text = (label.display_text ?? "").split("\n");
    const font = label.display_text_font ?? "Courier";
    const fontStyle = label.display_text_font_style ?? "";
    const fontSpec = fontStyle + " " + fontSize + "px " + font;
    g.font = fontSpec;
    g.textAlign = "center";
    g.textBaseline = "middle";

    const calcWidth = text
      .map((s) => g!.measureText(s).width)
      .reduce((l, r) => Math.max(l, r));
    const calcHeight =
      fontSize * text.length + (text.length - 1) * 0.2 * fontSize;

    bitmap.height = Math.max(DEFAULT_HEIGHT, calcHeight);
    bitmap.width = Math.max(DEFAULT_WIDTH, calcWidth);

    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = fontSpec;

    if (background_color) {
      g.fillStyle = background_color;
      g.fillRect(0, 0, bitmap.width, bitmap.height);
    }
    if (border_color) {
      g.strokeStyle = border_color;
      g.strokeRect(0, 0, bitmap.width, bitmap.height);
    }
    if (label.display_text_color) {
      g.fillStyle = "#" + label.display_text_color.getHexString();
    } else {
      g.fillStyle = "white";
    }
    if (label.display_text_outline_color) {
      g.strokeStyle = "#" + label.display_text_outline_color.getHexString();
    } else {
      g.strokeStyle = "black";
    }
    let i = 0;
    for (const line of text) {
      g.fillText(line, bitmap.width / 2, fontSize / 2 + i * fontSize * 1.2);
      g.strokeText(line, bitmap.width / 2, fontSize / 2 + i * fontSize * 1.2);
      i++;
    }
  }

  const texture = new THREE.Texture(bitmap);
  texture.needsUpdate = true;
  return [texture, bitmap.width, bitmap.height];
}
