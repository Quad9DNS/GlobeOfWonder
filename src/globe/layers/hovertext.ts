import * as THREE from "three";
import { Object3D } from "three";
import { CustomObjectLayerBuildHook } from "./customobject";
import ThreeGlobe from "three-globe";
import { registerDialogContainer } from "../../components";
import { PointData } from "../../data";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isHoverTextData, HoverTextData } from "../../data/hover";
import { GlobeLayerAttachHook } from "../layer";
import { addMouseEventListener, MouseInteractionLayer } from "./mouseevents";

/**
 * Globe layer for all objects that implement {@link HoverTextData}.
 *
 * Implements {@link MouseInteractionLayer} to provide hover.
 */
export class HoverTextObjectsLayer
  implements
    GlobeLayerAttachHook,
    CustomObjectLayerBuildHook,
    MouseInteractionLayer
{
  readonly layerName: string = "HoverText";
  private cachedCamera: THREE.Camera | null = null;
  private hadMouseHits: boolean = false;

  private hoverWindow: HTMLDivElement | null = null;
  private hoverWindowPosition = new THREE.Vector3();
  private hoverLabelText: HTMLParagraphElement | null = null;

  attachToGlobe(
    _globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedCamera = camera;

    // A single dialog is used for the whole layer and just moved and updated for each object that gets interacted with.
    const hoverDialogContainer = registerDialogContainer(
      document.querySelector<HTMLDivElement>("#app")!
        .children[0] as HTMLElement,
      "hover-dialog-container",
    );
    hoverDialogContainer.innerHTML = `
    <div id="hoverDialog" hidden style="position: absolute; border-style: double; background-color: rgba(255, 255, 255, 0.6);">
      <div id="hoverDialogArea" style="max-width: 500px; text-align: start; color: black;">
        <p id="hoverDialogText"></p>
      </div>
    </div>
  `;
    this.hoverWindow =
      hoverDialogContainer.querySelector<HTMLDivElement>("#hoverDialog");
    this.hoverLabelText =
      hoverDialogContainer.querySelector<HTMLParagraphElement>(
        "#hoverDialogText",
      );
  }

  buildObject(parent: Object3D, object: PointData): void {
    if (isHoverTextData(object) && object.hover_text) {
      addMouseEventListener("hover", parent, () => {
        this.hadMouseHits = true;
        if (this.hoverLabelText) {
          this.hoverLabelText.innerText = object.hover_text ?? "";
        }
        if (this.hoverWindow) {
          parent.getWorldPosition(this.hoverWindowPosition);
          this.hoverWindow.hidden = false;
          this.hoverWindowPosition.project(this.cachedCamera!);
          this.hoverWindowPosition.x =
            (this.hoverWindowPosition.x * window.innerWidth) / 2 +
            window.innerWidth / 2;
          this.hoverWindowPosition.y =
            -((this.hoverWindowPosition.y * window.innerHeight) / 2) +
            window.innerHeight / 2;
          this.hoverWindow.style.top =
            this.hoverWindowPosition.y.toString() + "px";
          this.hoverWindow.style.left =
            this.hoverWindowPosition.x.toString() + "px";
        }
      });
    }
  }

  preMouseMove(): void {
    this.hadMouseHits = false;
  }
  postMouseMove(): void {
    // If no object was highlighted in this mouse movement, hide hover window
    if (!this.hadMouseHits && this.hoverWindow) {
      this.hoverWindow.hidden = true;
    }
  }
}
