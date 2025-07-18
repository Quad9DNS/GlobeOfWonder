import * as THREE from "three";
import { Object3D } from "three";
import { CustomObjectLayerBuildHook } from "./customobject";
import ThreeGlobe from "three-globe";
import { registerDialogContainer } from "../../components";
import { PointData } from "../../data";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isHoverTextData, HoverTextData } from "../../data/hover";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isLinkData, LinkData } from "../../data/link";
import { GlobeLayerAttachHook } from "../layer";
import { isLabelsData } from "../../data/label";
import {
  addClickListener,
  addMouseEventListener,
  MouseInteractionLayer,
} from "./mouseevents";

/**
 * Globe layer for all objects that implement {@link HoverTextData} or {@link LinkData}.
 *
 * If an object also has a label attached, then hover window is opened on click only.
 * If both hover text and link are provided, link is available when clicking on the opened hover window.
 *
 * Implements {@link MouseInteractionLayer} to provide hover and click functionality.
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
  private urlToOpen: string | null = null;
  private openUrlInNewWindow: boolean = true;

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
    const dialogArea =
      hoverDialogContainer.querySelector<HTMLDivElement>("#hoverDialogArea")!;
    dialogArea.addEventListener("click", (_event: Event) => {
      if (this.urlToOpen) {
        window.open(
          this.urlToOpen,
          this.openUrlInNewWindow ? "_blank" : "_self",
        );
      }
      if (this.hoverWindow) {
        this.hoverWindow.hidden = true;
      }
    });
    this.hoverLabelText =
      hoverDialogContainer.querySelector<HTMLParagraphElement>(
        "#hoverDialogText",
      );
  }

  buildObject(parent: Object3D, object: PointData): void {
    if (isHoverTextData(object) && object.hover_text) {
      addMouseEventListener(
        isLabelsData(object) && object.display_text ? "click" : "hover",
        parent,
        () => {
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
            if (isLinkData(object) && object.link_url) {
              this.urlToOpen = object.link_url;
              this.openUrlInNewWindow =
                object.new_window == true || object.new_window == null;
            }
          }
        },
      );
    } else if (isLinkData(object) && object.link_url) {
      addClickListener(parent, () => {
        if (object.link_url) {
          window.open(
            object.link_url,
            object.new_window === false ? "_self" : "_blank",
          );
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
