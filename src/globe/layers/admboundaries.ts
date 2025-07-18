import { Camera, WebGLRenderer } from "three";
import ThreeGlobe from "three-globe";
import { Settings, SettingsChangedEvent } from "../../settings";
import { GlobeLayerAttachHook, GlobeLayerSettingsHook } from "../layer";

const COUNTRIES_STATES_GEOJSON_URL =
  import.meta.env.VITE_COUNTRIES_STATES_GEOJSON_BASE_URL ||
  "assets/data/states/";

type AdministrativeBoundariesData = {
  type: string;
  crs: { type: string; properties: Record<string, string> };
  features: {
    type: string;
    properties: {
      shapeName: string;
      shapeISO: string;
      shapeID: string;
      shapeGroup: string;
      shapeType: string;
    };
    geometry: {
      type: string;
      coordinates: [];
    };
  }[];
};

/**
 * Globe layer that provides administrative boundaries for all countries.
 * Controlled by the {@link Settings#enabledBoundariesLayers} setting.
 */
export class AdministrativeBoundariesLayer
  implements GlobeLayerAttachHook, GlobeLayerSettingsHook
{
  readonly layerName: string = "AdministrativeBoundaries";
  private prevBoundariesLayer = "";
  private iteration = 0;
  private globe: ThreeGlobe | null = null;

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: Camera,
    _renderer: WebGLRenderer,
  ): void {
    this.globe = globe;
    globe
      .pathColor(() => "rgba(255, 20, 20, 1)")
      .pathPointLat((arr) => arr[1])
      .pathPointLng((arr) => arr[0])
      .pathPointAlt(0);
  }

  attachToSettings(settings: Settings): void {
    if (this.prevBoundariesLayer != settings.enabledBoundariesLayers) {
      this.updateBoundaries(settings.enabledBoundariesLayers);
    }
    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (
        event.detail.field_changed == "enabledBoundariesLayers" &&
        this.prevBoundariesLayer != settings.enabledBoundariesLayers
      ) {
        this.updateBoundaries(settings.enabledBoundariesLayers);
      }
    });
  }

  private updateBoundaries(newBoundaries: string): void {
    this.prevBoundariesLayer = newBoundaries;
    // Keep iteration number, because download could take a long time, and setting could be changed in the meantime
    this.iteration++;
    const thisIteration = this.iteration;
    let statesPaths: object[] = [];
    const toLookup = [];
    for (let layer of this.prevBoundariesLayer.split(",")) {
      layer = layer.trim();
      if (layer) {
        toLookup.push(layer);
      }
    }
    if (toLookup.length > 0) {
      for (const state of toLookup) {
        fetch(COUNTRIES_STATES_GEOJSON_URL + state + ".geojson")
          .then((res) => res.json())
          .then((country: AdministrativeBoundariesData) => {
            if (thisIteration == this.iteration) {
              statesPaths = statesPaths.concat(
                country.features
                  .filter(
                    (feature) =>
                      feature.geometry.type == "Polygon" ||
                      feature.geometry.type == "MultiPolygon",
                  )
                  .flatMap((feature) => {
                    if (feature.geometry.type == "Polygon") {
                      return feature.geometry.coordinates;
                    } else if (feature.geometry.type == "MultiPolygon") {
                      return feature.geometry.coordinates.flat();
                    }
                  }),
              );
              this.globe?.pathsData(statesPaths);
            }
          });
      }
    } else {
      this.globe?.pathsData(statesPaths);
    }
  }
}
