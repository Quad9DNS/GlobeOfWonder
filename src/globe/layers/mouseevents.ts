import * as THREE from "three";
import { Settings, SettingsChangedEvent } from "../../settings";
import { CustomObjectLayerBuildHook } from "./customobject";
import ThreeGlobe from "three-globe";
import {
  GlobeLayer,
  GlobeLayerAttachHook,
  GlobeLayerSettingsHook,
  RegistryHook,
} from "../layer";
import { PointData } from "../../data";

/**
 * Globe layer that implements mouse events (hover and click) for all objects.
 * Controlled by the {@link Settings#enableEventClickActions} setting.
 *
 * Automatically sets the root object name to "object_root", to optimize intersection search.
 *
 * Implements {@link RegistryHook} to be able to access layers that implement {@link MouseInteractionLayer}.
 */
export class MouseEventsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    CustomObjectLayerBuildHook,
    RegistryHook
{
  readonly layerName: string = "MouseEvents";
  private cachedGlobe: ThreeGlobe | null = null;
  private cachedCustomObjectsGroup: THREE.Group | null = null;
  private cachedCamera: THREE.Camera | null = null;
  private cachedRenderer: THREE.WebGLRenderer | null = null;
  private intersections: THREE.Intersection<THREE.Object3D>[] = [];

  private subLayers: MouseInteractionLayer[] = [];

  private enableDotClickActions = true;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  newLayerAdded(layer: GlobeLayer): void {
    if ((layer as MouseInteractionLayer).preMouseMove !== undefined) {
      this.subLayers.push(layer as MouseInteractionLayer);
    }
  }

  attachToGlobe(
    globe: ThreeGlobe,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    this.cachedRenderer = renderer;
    this.cachedCamera = camera;
    this.cachedGlobe = globe;

    renderer.domElement.parentElement?.addEventListener(
      "mouseup",
      this.onDocumentMouseDown.bind(this),
      false,
    );
    renderer.domElement.parentElement?.addEventListener(
      "mousemove",
      this.onDocumentMouseMove.bind(this),
      false,
    );
  }

  attachToSettings(settings: Settings): void {
    this.enableDotClickActions = settings.enableEventClickActions;

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "enableEventClickActions") {
        this.enableDotClickActions = settings.enableEventClickActions;
      }
    });
  }

  buildObject(parent: THREE.Object3D, _object: PointData): void {
    parent.name = "object_root";
  }

  private onDocumentMouseDown(event: MouseEvent) {
    if (!this.enableDotClickActions) {
      return;
    }

    event.preventDefault();

    this.mouse.x =
      (event.clientX / (this.cachedRenderer?.domElement?.clientWidth ?? 1)) *
        2 -
      1;
    this.mouse.y =
      -(event.clientY / (this.cachedRenderer?.domElement?.clientHeight ?? 1)) *
        2 +
      1;

    if (this.cachedCamera) {
      this.raycaster.setFromCamera(this.mouse, this.cachedCamera);
    }

    this.intersectAndIterateHierarchy((object) => {
      if (object.userData["clickable"]) {
        // @ts-expect-error - click is a custom type
        object.dispatchEvent({ type: "click" });
      }
    });
  }

  private onDocumentMouseMove(event: MouseEvent) {
    if (!this.enableDotClickActions) {
      return;
    }

    event.preventDefault();

    this.mouse.x =
      (event.clientX / (this.cachedRenderer?.domElement?.clientWidth ?? 1)) *
        2 -
      1;
    this.mouse.y =
      -(event.clientY / (this.cachedRenderer?.domElement?.clientHeight ?? 1)) *
        2 +
      1;

    if (this.cachedCamera) {
      this.raycaster.setFromCamera(this.mouse, this.cachedCamera);
    }

    let showPointer = false;

    for (const layer of this.subLayers) {
      layer.preMouseMove();
    }

    this.intersectAndIterateHierarchy((object) => {
      if (object.userData["clickable"]) {
        showPointer = true;
      }

      if (object.userData["hoverable"]) {
        // @ts-expect-error - hover is a custom type
        object.dispatchEvent({ type: "hover" });
      }
    });

    if (showPointer) {
      document.body.style.cursor = "pointer";
    } else {
      document.body.style.cursor = "unset";
    }

    for (const layer of this.subLayers) {
      layer.postMouseMove();
    }
  }

  private intersectAndIterateHierarchy(
    callback: (object: THREE.Object3D) => void,
  ) {
    const customObjectsLayer = this.getGlobeCustomObjectsLayer();
    if (customObjectsLayer) {
      this.intersections.length = 0;
      this.raycaster.intersectObjects(
        customObjectsLayer.children.filter(
          (c) => c.userData["hoverable"] || c.userData["clickable"],
        ),
        true,
        this.intersections,
      );

      if (this.intersections.length > 0) {
        let parent: THREE.Object3D | null = this.intersections[0].object;

        while (parent != null) {
          callback(parent);

          if (parent.name == "object_root") {
            break;
          }
          parent = parent.parent;
        }
      }
    }
  }

  /**
   * Caches custom objects group from the globe, to ensure quicker intersection check,
   * without needlessly checking other layers that aren't interactive.
   */
  private getGlobeCustomObjectsLayer(): THREE.Group | null {
    if (this.cachedCustomObjectsGroup) {
      return this.cachedCustomObjectsGroup;
    }

    if (!this.cachedGlobe) {
      return null;
    }

    this.cachedCustomObjectsGroup = null;

    for (const child of this.cachedGlobe.children) {
      if (child.children.length > 0) {
        // @ts-expect-error - __globeObjType is a hidden internal field of ThreeGlobe
        if (child.children[0].__globeObjType == "custom") {
          this.cachedCustomObjectsGroup = child as THREE.Group;
          break;
        }
      }
    }

    return this.cachedCustomObjectsGroup;
  }
}

/**
 * Provides information about mouse movement events.
 * Useful for layers that want to implement mouse events.
 */
export interface MouseInteractionLayer extends GlobeLayer {
  /**
   * Called on every mouse move, before looking for intersection with any interctive objects.
   */
  preMouseMove(): void;
  /**
   * Called on every mouse move, after finishing intersection checks.
   */
  postMouseMove(): void;
}

/**
 * Adds the specified mouse event listener to the object.
 * This ensures that the object will be properly detected by {@link MouseEventsLayer}.
 */
export function addMouseEventListener(
  event: "hover" | "click",
  object: THREE.Object3D,
  listener: () => void,
) {
  if (event == "hover") {
    addHoverListener(object, listener);
  } else if (event == "click") {
    addClickListener(object, listener);
  }
}

/**
 * Adds hover listener to the object.
 * This ensures that the object will be properly detected by {@link MouseEventsLayer}.
 */
export function addHoverListener(object: THREE.Object3D, listener: () => void) {
  object.userData["hoverable"] = true;
  // @ts-expect-error - hover is a custom type
  object.addEventListener("hover", (_: Event) => {
    listener();
  });
}

/**
 * Adds click listener to the object.
 * This ensures that the object will be properly detected by {@link MouseEventsLayer}.
 */
export function addClickListener(object: THREE.Object3D, listener: () => void) {
  object.userData["clickable"] = true;
  // @ts-expect-error - click is a custom type
  object.addEventListener("click", (_: Event) => {
    listener();
  });
}
