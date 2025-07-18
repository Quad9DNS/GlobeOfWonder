import { Camera, WebGLRenderer } from "three";
import ThreeGlobe from "three-globe";
import { ExplosionDataLayer as ExplosionDataLayer } from ".";
import { Settings, SettingsChangedEvent } from "../../../settings";
import { ExplosionData } from "../../../data/explosion";
import { GlobeLayerAttachHook, GlobeLayerSettingsHook } from "../../layer";

const HEATMAP_ANIMATION_DURATION = 3000;

/**
 * Globe layer that uses {@link ExplosionData} to generate heatmaps, using {@link ThreeGlobe#heatmapsData}.
 */
export class HeatMapLayer
  implements GlobeLayerAttachHook, GlobeLayerSettingsHook, ExplosionDataLayer
{
  readonly layerName: string = "HeatMap";
  private heatmapsEnabled = false;
  private data: ExplosionData[] = [];
  private globe: ThreeGlobe | null = null;

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: Camera,
    _renderer: WebGLRenderer,
  ): void {
    this.globe = globe;
    if (navigator.gpu) {
      globe
        .heatmapsData([this.data])
        .heatmapPointLat("lat")
        .heatmapPointLng("lon")
        .heatmapPointWeight(
          (o: object) => (o as ExplosionData).inflation_factor,
        )
        .heatmapsTransitionDuration(HEATMAP_ANIMATION_DURATION);

      setInterval(() => {
        this.updateHeatmapData();
      }, HEATMAP_ANIMATION_DURATION);
    }
  }
  attachToSettings(settings: Settings): void {
    this.heatmapsEnabled = settings.enableHeatmaps;
    this.updateHeatmapData();

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "enableHeatmaps") {
        this.heatmapsEnabled = settings.enableHeatmaps;
        this.updateHeatmapData();
      }
    });
  }
  needsCustomObjects(_settings: Settings): boolean {
    return false;
  }
  updateExplosionData(
    _globe: ThreeGlobe,
    _settings: Settings,
    pointsData: ExplosionData[],
  ): void {
    this.data = pointsData;
  }

  private updateHeatmapData() {
    if (this.heatmapsEnabled) {
      this.globe?.heatmapsData([this.data]);
    } else {
      this.globe?.heatmapsData([]);
    }
  }
}
