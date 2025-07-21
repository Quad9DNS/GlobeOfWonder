import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings, SettingsChangedEvent } from "../../settings";
import { mapAndFilter, PointData } from "../../data";
import {
  DEFAULT_CRITICAL_COLOR,
  DEFAULT_GLOBE_RADIUS,
  QUAD9_COLOR,
  UNIT_KMS,
} from "../common";
import {
  GlobeLayerAttachHook,
  GlobeLayerDataUpdateHook,
  GlobeLayerNewDataHook,
  GlobeLayerPreUpdateHook,
  GlobeLayerSettingsHook,
} from "../layer";
import { AnalysisModeData } from "../../data/analysismode";

/**
 * Globe layer that provides analysis mode implementation
 * It is implemented using {@link ThreeGlobe#hexBinPointsData}.
 * Based on {@link ExplosionData}.
 *
 * Holds its own {@link ExplosionData} instances, to be able to control lifetime,
 * to support {@link Settings#analysisModeDecay} setting.
 */
export class AnalysisModeLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerDataUpdateHook
{
  readonly layerName: string = "AnalysisMode";
  private data: AnalysisModeData[] = [];
  private analysisModeDecay: number = 60;
  private startColor = QUAD9_COLOR;
  private endColor = DEFAULT_CRITICAL_COLOR;
  private maxHeightCount = 10000;
  private maxHeightKms = 800;
  private globe?: ThreeGlobe;

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.globe = globe;
    globe
      .hexSideColor(({ sumWeight }) =>
        this.startColor
          .clone()
          .lerp(
            this.endColor,
            Math.min(1.0, Math.log(sumWeight) / Math.log(this.maxHeightCount)),
          )
          .getStyle(),
      )
      .hexTopColor(({ sumWeight }) =>
        this.startColor
          .clone()
          .lerp(
            this.endColor,
            Math.min(1.0, Math.log(sumWeight) / Math.log(this.maxHeightCount)),
          )
          .getStyle(),
      )
      .hexBinPointLat("lat")
      .hexBinPointLng("lon")
      .hexBinPointWeight((o: object) => {
        // WARN: Internally, three-globe breaks down objects passed to hexBin, so we can't use methods from AnalysisModeData, only fields
        return (o as AnalysisModeData).counter ?? 1;
      })
      .hexBinMerge(true)
      .hexBinResolution(3)
      .hexAltitude(({ sumWeight }) =>
        Math.max(
          ((Math.log(sumWeight) / Math.log(this.maxHeightCount)) *
            this.maxHeightKms) /
            UNIT_KMS /
            DEFAULT_GLOBE_RADIUS,
          0.01 / UNIT_KMS / DEFAULT_GLOBE_RADIUS,
        ),
      );
  }

  attachToSettings(settings: Settings): void {
    this.analysisModeDecay = settings.analysisModeDecay;
    this.startColor = new THREE.Color(settings.analysisModeStartColor);
    this.endColor = new THREE.Color(settings.analysisModeEndColor);
    this.maxHeightCount = settings.analysisModeMaxHeightCount;
    this.maxHeightKms = settings.analysisModeMaxHeightKms;
    this.globe?.hexBinResolution(settings.analysisModeResolution);

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      switch (event.detail.field_changed) {
        case "analysisModeDecay":
          this.analysisModeDecay = settings.analysisModeDecay;
          break;
        case "analysisModeStartColor":
          this.startColor = new THREE.Color(settings.analysisModeStartColor);
          break;
        case "analysisModeEndColor":
          this.endColor = new THREE.Color(settings.analysisModeEndColor);
          break;
        case "analysisModeMaxHeightCount":
          this.maxHeightCount = settings.analysisModeMaxHeightCount;
          break;
        case "analysisModeMaxHeightKms":
          this.maxHeightKms = settings.analysisModeMaxHeightKms;
          break;
        case "analysisModeResolution":
          this.globe?.hexBinResolution(settings.analysisModeResolution);
          break;
        default:
          break;
      }
    });
  }

  preUpdate(): void {
    mapAndFilter(this.data);
  }

  shouldTakePoint(point: PointData): boolean {
    return point.counter_include ?? true;
  }

  takeNewPoint(point: PointData): void {
    this.data.push(new AnalysisModeData(point, this.analysisModeDecay * 1000));
  }

  updateData(globe: ThreeGlobe, settings: Settings): void {
    if (settings.enableAnalysisMode) {
      globe.hexBinPointsData(this.data);
    } else {
      globe.hexBinPointsData([]);
    }
  }
}
