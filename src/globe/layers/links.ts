import { Object3D } from "three";
import { CustomObjectLayerBuildHook } from "./customobject";
import { PointData } from "../../data";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isLinkData, LinkData } from "../../data/link";
import { addClickListener } from "./mouseevents";

/**
 * Globe layer for all objects that implement {@link LinkData}.
 */
export class LinkDataObjectsLayer implements CustomObjectLayerBuildHook {
  readonly layerName: string = "LinkData";

  buildObject(parent: Object3D, object: PointData): void {
    if (isLinkData(object) && object.link_url) {
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
}
