import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { PointData } from "../../data";
import { Settings } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CustomObjectProvider,
} from "./customobject";
import { GlobeLayerAttachHook } from "../layer";
import { DownloadedData } from "../../data/downloaded";
import CommonObjectProvider from "./utils/baseprovider";

const objectGeometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({
  map: new THREE.Texture(),
  side: THREE.FrontSide,
  transparent: true,
});

/**
 * Globe layer that draws {@link DownloadedData} objects.
 *
 * Adds the following hierarchy to the root THREE Object3D:
 * - THREE.Mesh ("downloaded_object") - "ignoreTransparency" flag set to true, because it is always transparent
 */
export class DownloadedObjectsLayer
  implements GlobeLayerAttachHook, CustomObjectLayerBuildHook
{
  readonly layerName: string = "DownloadedObjects";
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
    if (!(object instanceof DownloadedData)) {
      return;
    }

    const objMaterial = material.clone();
    if (object.image_data) {
      objMaterial.map = new THREE.CanvasTexture(object.image_data);
    }
    const downloadedObject = new THREE.Mesh(objectGeometry, objMaterial);
    downloadedObject.name = "downloaded_object";
    downloadedObject.userData["ignoreTransparency"] = true;

    if (object.image_data) {
      // Ensures the aspect ratio is kept
      downloadedObject.scale.setX(object.image_data.width / 100);
      downloadedObject.scale.setY(object.image_data.height / 100);
    }

    downloadedObject.scale.multiplyScalar(object.scale());

    parent.add(downloadedObject);

    // Turn the image to face directly away from the globe - to lay flat on it
    downloadedObject.getWorldPosition(this.circlePos);
    parent.lookAt(
      this.circlePos.addVectors(
        this.globePos,
        this.circlePos.sub(this.globePos).multiplyScalar(2),
      ),
    );
  }
}

/**
 * Implementation of {@link CustomObjectProvider} for {@link DownloadedData} objects.
 *
 * Loads images from the URL before adding the objects. If download fails for any reason, the object is not added.
 */
export class DownloadedObjectsProvider extends CommonObjectProvider<DownloadedData> {
  readonly layerName: string = "DownloadedObjectsProvider";
  private imageLoader: THREE.ImageBitmapLoader =
    new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY" });

  layerEnabled(settings: Settings): boolean {
    return settings.enableDownloadedObjects;
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof DownloadedData;
  }

  takeNewPoint(point: PointData): void {
    this.imageLoader.load(
      (point as DownloadedData).downloaded_object_url,
      (image: ImageBitmap) => {
        (point as DownloadedData).image_data = image;
        super.takeNewPoint(point);
      },
      (_progress: ProgressEvent) => {},
      (error) => {
        console.error("Downloaded object load error: " + error);
      },
    );
  }
}
