import * as THREE from "three";
import { clamp, lerp } from "three/src/math/MathUtils.js";
import { ExplosionCustomizationData, ExplosionData } from "../data/explosion";
import { LabelsData } from "../data/label";
import { LinkData } from "../data/link";
import { HoverTextData } from "../data/hover";
import {
  registerNewLayer,
  Settings,
  SettingsFields,
  updateFilters,
} from "../settings";
import { AppState, ServiceState } from "./state";
import { CircleCustomizationData, CircleData } from "../data/circle";
import { PointerCustomizationData, PointerData } from "../data/pointer";
import { BarData, BarCustomizationData } from "../data/bar";
import {
  DownloadedCustomizationData,
  DownloadedData,
} from "../data/downloaded";
import { ArcCustomizationData, ArcData } from "../data/arc";
import { LayerData, ScaleData } from "../data";

const COMMON_NON_FILTER_KEYS = [
  "lat",
  "lon",
  "ttl",
  "fade_duration",
  "opacity",
  "counter",
  "counter_include",
  "always_faces_viewer",
  "display_text_interval",
  "display_text_font",
  "display_text_font_size",
  "display_text_font_style",
  "display_text_color",
  "display_text_outline_color",
  "display_text_always_faces_viewer",
  "display_text_hover_only",
  "layer_id",
  "layer_name",
  "ignore_zoom",
];
const NON_FILTER_KEYS = {
  explosion: [
    "explosion_initial_color",
    "explosion_initial_radius_interval",
    "explosion_initial_radius_size",
    "explosion_fallback_color",
    "explosion_fallback_radius_interval",
    "explosion_fallback_radius_size",
  ],
  circle: [
    "circle_radius",
    "circle_color",
    "circle_outline_color",
    "circle_outline_thickness",
  ],
  pointer: [
    "pointer_background_color",
    "pointer_border_color",
    "pointer_scale",
    "pointer_glyph_color",
  ],
  bar: ["bar_height", "bar_diameter", "bar_bottom_color", "bar_top_color"],
  downloaded: ["downloaded_object_url", "downloaded_object_scale"],
  arc: [
    "point2_lon",
    "point2_lat",
    "arc_color",
    "arc_line_type",
    "arc_line_thickness",
    "arc_animated",
    "arc_draw_duration",
    "arc_max_height",
  ],
};
const FLOAT_KEYS = [
  "lat",
  "lon",
  "explosion_initial_radius_interval",
  "explosion_fallback_radius_interval",
  "explosion_initial_radius_size",
  "explosion_fallback_radius_size",
  "display_text_interval",
  "display_text_font_size",
  "circle_radius",
  "circle_outline_thickness",
  "pointer_scale",
  "bar_diameter",
  "bar_height",
  "downloaded_object_scale",
  "arc_draw_duration",
  "arc_max_height",
  "arc_line_thickness",
  "fade_duration",
];

export type PositionData = {
  lat: number;
  lon: number;
  always_faces_viewer: boolean | null;
};
export type LifetimeData = {
  ttl: number | null;
  fade_duration: number | null;
};
export type CounterData = {
  counter: number | null;
  counter_include: boolean | null;
};
type TypeData = {
  type:
    | ExplosionTypeData["type"]
    | CircleTypeData["type"]
    | PointerTypeData["type"]
    | BarTypeData["type"]
    | DownloadedTypeData["type"]
    | ArcTypeData["type"]
    | null;
};
export type SharedServiceData = PositionData &
  LifetimeData &
  CounterData &
  LabelsData &
  LinkData &
  LayerData &
  ScaleData &
  HoverTextData;
export type CommonServiceData = SharedServiceData & TypeData;
export type FilterData = Record<string, string> & TypeData;

type ExplosionTypeData = {
  type: "explosion";
};
export type ExplosionServiceData = ExplosionTypeData &
  SharedServiceData &
  FilterData &
  ExplosionCustomizationData;

type CircleTypeData = {
  type: "circle";
};
export type CircleServiceData = CircleTypeData &
  SharedServiceData &
  FilterData &
  CircleCustomizationData;

type PointerTypeData = {
  type: "pointer";
};
export type PointerServiceData = PointerTypeData &
  SharedServiceData &
  FilterData &
  PointerCustomizationData;

type BarTypeData = {
  type: "bar";
};
export type BarServiceData = BarTypeData &
  SharedServiceData &
  FilterData &
  BarCustomizationData;

type DownloadedTypeData = {
  type: "downloaded";
};
export type DownloadedServiceData = DownloadedTypeData &
  SharedServiceData &
  FilterData &
  DownloadedCustomizationData;

type ArcTypeData = {
  type: "arc";
};
export type ArcServiceData = ArcTypeData &
  SharedServiceData &
  FilterData &
  ArcCustomizationData;

export type ServiceData =
  | ExplosionServiceData
  | CircleServiceData
  | PointerServiceData
  | BarServiceData
  | DownloadedServiceData
  | ArcServiceData;

/**
 * Expects incoming data as a string and tries to parse it as JSON and publish it in the state.
 *
 * @param data incoming data string
 * @param settings current settings for filter access
 * @param settingsFields access to settings UI for inserting new filters
 * @param appState current app state to publish new data to
 * @param serviceState current service state to keep track of
 */
export function processServiceData(
  data: string,
  settings: Settings,
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
): void {
  const incomingEvent = parseServiceData(data);
  if (incomingEvent) {
    if (!serviceState.filtersConfigured) {
      const keys = [];
      for (const key in incomingEvent as FilterData) {
        if (
          COMMON_NON_FILTER_KEYS.includes(key) ||
          (NON_FILTER_KEYS[incomingEvent.type ?? "explosion"] ?? []).includes(
            key,
          )
        ) {
          continue;
        }
        keys.push(key);
      }
      serviceState.updateFilters(keys);
      updateFilters(settingsFields, settings);
      serviceState.filtersConfigured = true;
    }

    if (incomingEvent.layer_id) {
      registerNewLayer(
        settingsFields,
        settings,
        incomingEvent.layer_id,
        incomingEvent.layer_name,
      );
    }

    // run filters
    if (!filterServiceData(incomingEvent, settings)) {
      return;
    }
    if (incomingEvent.counter_include ?? true) {
      appState.newEventsQueue.push(incomingEvent.counter ?? 1);
    }

    // Ignore invalid 0-0 data
    if (
      (incomingEvent.lat == 0.0 && incomingEvent.lon == 0.0) ||
      isNaN(incomingEvent.lat) ||
      isNaN(incomingEvent.lon)
    ) {
      return;
    }
    buildAndPublishType(incomingEvent.type, incomingEvent, settings, appState);
  } else {
    console.warn("Incoming data didn't match expected format: " + data);
  }
}

function parseServiceData(data: string): ServiceData | null {
  const parsed: ServiceData | null = JSON.parse(
    data,
    (k: string, v: string) => {
      if (FLOAT_KEYS.indexOf(k) !== -1) {
        return parseFloat(v);
      } else if (k == "counter" || k == "ttl" || k == "layer_id") {
        return parseInt(v);
      } else if (k == "opacity") {
        return clamp(parseInt(v), 0, 100);
      } else if (k.includes("_color")) {
        if (v == null || v == "none" || v == "<null>") {
          return null;
        } else {
          return new THREE.Color(v);
        }
      } else if (
        k == "new_window" ||
        k == "arc_animated" ||
        k == "counter_include" ||
        k == "ignore_zoom" ||
        k == "always_faces_viewer" ||
        k == "display_text_always_faces_viewer" ||
        k == "display_text_hover_only"
      ) {
        return Boolean(v);
      } else {
        return v;
      }
    },
  );

  if (parsed) {
    switch (parsed.type) {
      case "downloaded":
        if (!parsed.downloaded_object_url) {
          console.warn(
            "Missing required downloaded type fields! (downloaded_object_url)",
          );
          return null;
        }
        break;
      case "arc":
        if (!parsed.point2_lat || !parsed.point2_lon) {
          console.warn(
            "Missing required arc type fields! (point2_lat, point2_lon)",
          );
          return null;
        }
        break;
      case "bar":
        if (!parsed.bar_height) {
          console.warn("Missing required bar type fields! (bar_height)");
          return null;
        }
        break;
      default:
        break;
    }
  }

  return parsed;
}

function filterServiceData(data: FilterData, settings: Settings): boolean {
  for (const key in data) {
    if (
      COMMON_NON_FILTER_KEYS.includes(key) ||
      (NON_FILTER_KEYS[data.type ?? "explosion"] ?? []).includes(key)
    ) {
      continue;
    }
    if (settings.filters[key]) {
      if (!data[key].match(new RegExp(settings.filters[key], "i"))) {
        return false;
      }
    }
  }
  return true;
}

function buildAndPublishType(
  type: TypeData["type"],
  data: ServiceData,
  settings: Settings,
  state: AppState,
) {
  switch (type) {
    case "circle":
      state.newPointsQueue.push(new CircleData(data as CircleServiceData));
      break;
    case "pointer":
      state.newPointsQueue.push(new PointerData(data as PointerServiceData));
      break;
    case "bar":
      state.newPointsQueue.push(new BarData(data as BarServiceData));
      break;
    case "arc":
      state.newPointsQueue.push(new ArcData(data as ArcServiceData));
      break;
    case "downloaded":
      state.newPointsQueue.push(
        new DownloadedData(data as DownloadedServiceData),
      );
      break;
    case "explosion":
    default:
      state.newPointsQueue.push(
        new ExplosionData({
          inflation_factor:
            (data.counter ?? 1) == 1 || settings.enableCounterScaling == false
              ? 1.0
              : lerp(
                  1,
                  settings.maximumScale,
                  clamp(data.counter ?? 1, 1, settings.maximumScaleCounter) /
                    settings.maximumScaleCounter,
                ),
          ...(data as ExplosionServiceData),
        }),
      );
      break;
  }
}
