import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings, SettingsChangedEvent } from "../../settings";
import { GlobeLayerAttachHook, GlobeLayerSettingsHook } from "../layer";

const ATMOSPHERE_COLOR_DARK = "lightskyblue";
const ATMOSPHERE_SIZE_DARK = 0.25;
const ATMOSPHERE_COLOR_LIGHT = "blue";
const ATMOSPHERE_SIZE_LIGHT = 0.25;

const BORDER_COLOR_DARK = "#BBB";
const BORDER_COLOR_LIGHT = "#000";

const COUNTRY_BORDERS_MATERIAL = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0x646464),
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});
const COUNTRY_BORDERS_SIMPLE_MATERIAL = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0x000000),
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
});

/**
 * Globe layer for core map features, that give main earth-like appearance:
 * - the map image
 * - atmosphere
 * - country borders
 */
export class CoreMapLayer
  implements GlobeLayerAttachHook, GlobeLayerSettingsHook
{
  readonly layerName: string = "CoreMap";
  private globe: ThreeGlobe | null = null;
  private settings: Settings | null = null;
  private bordersData: object[] = [];

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.globe = globe;
    globe
      .atmosphereColor(ATMOSPHERE_COLOR_DARK)
      .atmosphereAltitude(ATMOSPHERE_SIZE_DARK)
      .polygonAltitude(0.005)
      .polygonCapMaterial(COUNTRY_BORDERS_MATERIAL)
      .polygonSideMaterial(COUNTRY_BORDERS_MATERIAL)
      .polygonStrokeColor(() => BORDER_COLOR_DARK);
  }

  attachToSettings(settings: Settings): void {
    this.settings = settings;
    this.updateColorScheme(settings);
    this.globe?.showAtmosphere(settings.enableAtmosphere);
    this.globe?.showGraticules(settings.enableGraticules);
    this.globe?.bumpImageUrl(settings.globeBumpMapUrl);
    this.globe?.globeImageUrl(settings.globeMapUrl);
    this.updateCountryBorders(settings.enableCountryBorders);
    this.updateCountryBordersType(settings.simpleCountryBorders);

    fetch(settings.countriesGeoJsonUrl)
      .then((res) => res.json())
      .then((countries) => {
        this.bordersData = countries.features;
        this.updateCountryBorders(this.settings?.enableCountryBorders ?? true);
      });

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "lightMode") {
        this.updateColorScheme(settings);
      } else if (event.detail.field_changed == "enableAtmosphere") {
        this.globe?.showAtmosphere(settings.enableAtmosphere);
      } else if (event.detail.field_changed == "enableGraticules") {
        this.globe?.showGraticules(settings.enableGraticules);
      } else if (event.detail.field_changed == "enableCountryBorders") {
        this.updateCountryBorders(settings.enableCountryBorders);
      } else if (event.detail.field_changed == "simpleCountryBorders") {
        this.updateCountryBordersType(settings.simpleCountryBorders);
      } else if (event.detail.field_changed == "globeMapUrl") {
        this.globe?.globeImageUrl(settings.globeMapUrl);
      } else if (event.detail.field_changed == "globeBumpMapUrl") {
        this.globe?.bumpImageUrl(settings.globeBumpMapUrl);
      } else if (event.detail.field_changed == "countriesGeoJsonUrl") {
        fetch(settings.countriesGeoJsonUrl)
          .then((res) => res.json())
          .then((countries) => {
            this.bordersData = countries.features;
            this.updateCountryBorders(
              this.settings?.enableCountryBorders ?? true,
            );
          });
      }
    });
  }

  private updateColorScheme(settings: Settings) {
    if (settings.lightMode) {
      this.globe
        ?.atmosphereColor(ATMOSPHERE_COLOR_LIGHT)
        ?.atmosphereAltitude(ATMOSPHERE_SIZE_LIGHT)
        ?.polygonStrokeColor(() => BORDER_COLOR_LIGHT);
    } else {
      this.globe
        ?.atmosphereColor(ATMOSPHERE_COLOR_DARK)
        ?.atmosphereAltitude(ATMOSPHERE_SIZE_DARK)
        ?.polygonStrokeColor(() => BORDER_COLOR_DARK);
    }
  }

  private updateCountryBorders(enabled: boolean) {
    if (enabled) {
      this.globe?.polygonsData(this.bordersData);
    } else {
      this.globe?.polygonsData([]);
    }
  }

  private updateCountryBordersType(simple: boolean) {
    if (simple) {
      this.globe
        ?.polygonCapMaterial(COUNTRY_BORDERS_SIMPLE_MATERIAL)
        .polygonSideMaterial(COUNTRY_BORDERS_SIMPLE_MATERIAL)
        .polygonAltitude(0.0011);
    } else {
      this.globe
        ?.polygonCapMaterial(COUNTRY_BORDERS_MATERIAL)
        .polygonSideMaterial(COUNTRY_BORDERS_MATERIAL)
        .polygonAltitude(0.005);
    }
  }
}
