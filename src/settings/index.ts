import { registerDialogContainer } from "../components";
import Quad9LogoLight from "../logo_light.svg?url";
import Quad9LogoDark from "../logo_dark.svg?url";
import { ServiceState } from "../service/state";

const DEFAULT_DARK_BG = "#000000";
const DEFAULT_LIGHT_BG = "#FFFFFF";

/**
 * UI elements related to settings
 */
export interface SettingsFields {
  /**
   * Element which opens up settings dialog
   */
  openSettingsButton: HTMLElement;
  /**
   * Parent to render dialog in
   */
  dialogContainer: HTMLElement;
}

export interface SettingsChangedEvent {
  field_changed: string;
}

export type LayerConfig = {
  name: string;
  opacity: number;
};

/**
 * Decorator for settigns fields that notifies all listeners that the field has been changed
 */
function SettingsField<T>(
  fieldMapper: ((instance: Settings, value: T) => T) | undefined = undefined,
) {
  return function (
    target: ClassAccessorDecoratorTarget<Settings, T>,
    context: ClassAccessorDecoratorContext<Settings, T>,
  ): ClassAccessorDecoratorResult<Settings, T> {
    return {
      set(this: Settings, value: T) {
        target.set.call(this, fieldMapper ? fieldMapper(this, value) : value);
        this.dispatchChangedEvent(context.name.toString());
      },
    };
  };
}

/**
 * Holds all currently selected customizable settings
 * Changes should be made using methods, to ensure that events are triggered
 */
export class Settings extends EventTarget {
  private readonly eventType = "settings-changed";
  private validProperties: string[] | null = null;
  @SettingsField()
  accessor antialiasingEnabled: boolean = true;
  @SettingsField()
  accessor autoRotateGlobe: boolean = true;
  @SettingsField()
  accessor enableAtmosphere: boolean = true;
  @SettingsField()
  accessor enableGraticules: boolean = false;
  @SettingsField()
  accessor showWebsocketStatus: boolean = false;
  @SettingsField()
  accessor showWebsocketUi: boolean = true;
  @SettingsField()
  accessor showDateAndTime: boolean = true;
  @SettingsField()
  accessor enableCounterScaling: boolean = true;
  @SettingsField()
  accessor showCountersKey: boolean = true;
  @SettingsField()
  accessor showHelp: boolean = true;
  @SettingsField()
  accessor maximumScale: number = 2.5;
  @SettingsField()
  accessor maximumScaleCounter: number = 20;

  @SettingsField()
  accessor enableEventExplosions: boolean = true;
  @SettingsField()
  accessor enableEventLabels: boolean = true;
  @SettingsField()
  accessor enableEventClickActions: boolean = true;
  @SettingsField((_settings: Settings, value: boolean) =>
    navigator.gpu ? value : false,
  )
  accessor enableHeatmaps: boolean = false;
  @SettingsField()
  accessor enableAnalysisMode: boolean = false;
  @SettingsField()
  accessor enableCountryBorders: boolean = true;
  @SettingsField()
  accessor simpleCountryBorders: boolean = false;
  @SettingsField()
  accessor enabledBoundariesLayers: string = "";
  @SettingsField()
  accessor enableCircles: boolean = true;
  @SettingsField()
  accessor enablePointers: boolean = true;
  @SettingsField()
  accessor enableBars: boolean = true;
  @SettingsField()
  accessor enableDownloadedObjects: boolean = true;
  @SettingsField()
  accessor enableArcs: boolean = true;

  @SettingsField()
  accessor analysisModeResolution: number = 3;
  @SettingsField()
  accessor analysisModeDecay: number = 60;
  @SettingsField()
  accessor analysisModeStartColor: string = "#dc205e";
  @SettingsField()
  accessor analysisModeEndColor: string = "#ff2000";
  @SettingsField()
  accessor analysisModeMaxHeightCount: number = 10000;
  @SettingsField()
  accessor analysisModeMaxHeightKms: number = 800;

  @SettingsField()
  accessor filters: Record<string, string> = {};

  @SettingsField()
  accessor globalOpacity: number = 100;
  @SettingsField()
  accessor layers: Record<number, LayerConfig> = {};

  @SettingsField()
  accessor timeZone: string = "UTC";

  @SettingsField()
  accessor startupZoom: number = 0.0;
  @SettingsField()
  accessor startupLat: number = 0.0;
  @SettingsField()
  accessor startupLon: number = 0.0;

  @SettingsField()
  accessor websocketUrl: string =
    import.meta.env.VITE_WEBSOCKET_URL || "wss://view.quad9.net/websocket/5000";
  @SettingsField()
  accessor websocketUsername: string = "";
  @SettingsField()
  accessor websocketPassword: string = "";
  @SettingsField()
  accessor websocketAutoreconnectIntervalMs: number =
    import.meta.env.VITE_AUTORECONNECT_INTERVAL_MS || 5000;
  @SettingsField()
  accessor autoconnect: boolean = false;

  @SettingsField()
  accessor dataDownloadUrl: string =
    import.meta.env.VITE_DATA_DOWNLOAD_URL ||
      "https://view.quad9.net/assets/data/pops.json";
  @SettingsField()
  accessor dataDownloadInterval: number =
    import.meta.env.VIEW_DATA_DOWNLOAD_INTERVAL_MS || 600000;

  @SettingsField()
  accessor showEventCounters: boolean = true;
  @SettingsField()
  accessor showEventCountersTotal: boolean = true;
  @SettingsField()
  accessor showEventCountersLast5m: boolean = true;
  @SettingsField()
  accessor showEventCountersLast1m: boolean = true;
  @SettingsField()
  accessor showEventCountersLast10s: boolean = true;
  @SettingsField()
  accessor countersTitle: string =
    import.meta.env.VITE_DEFAULT_COUNTERS_TITLE || "Malicious Lookups Blocked";
  @SettingsField()
  accessor countersLabel: string =
    import.meta.env.VITE_DEFAULT_COUNTERS_LABEL || "Events";

  @SettingsField((settings: Settings, newValue: boolean) => {
    if (settings.bgColor == DEFAULT_DARK_BG && newValue == true) {
      settings.bgColor = DEFAULT_LIGHT_BG;
    } else if (settings.bgColor == DEFAULT_LIGHT_BG && newValue == false) {
      settings.bgColor = DEFAULT_DARK_BG;
    }
    return newValue;
  })
  accessor lightMode: boolean = false;
  @SettingsField()
  accessor bgColor: string = "#000000";

  @SettingsField()
  accessor enableSettingsDialog: boolean = true;

  services: ServiceState[] = [];

  setFilter(key: string, newValue: string): void {
    this.filters[key] = newValue;
    this.dispatchChangedEvent(key + "Filter");
  }

  setLayerOpacity(key: number, newValue: number): void {
    this.layers[key].opacity = newValue;
    this.dispatchChangedEvent("LayerOpacity[" + key + "]");
  }

  addChangedListener(
    callback: (event: CustomEvent<SettingsChangedEvent>) => void,
  ): void {
    return this.addEventListener(this.eventType, (event: Event) =>
      callback(event as CustomEvent<SettingsChangedEvent>),
    );
  }

  removeChangedListener(
    callback: (event: CustomEvent<SettingsChangedEvent>) => void,
  ): void {
    return this.removeEventListener(this.eventType, (event: Event) =>
      callback(event as CustomEvent<SettingsChangedEvent>),
    );
  }

  dispatchChangedEvent(field_changed: string): boolean {
    return this.dispatchEvent(
      new CustomEvent<SettingsChangedEvent>(this.eventType, {
        detail: { field_changed: field_changed },
      }),
    );
  }

  getValidProperties() {
    if (!this.validProperties) {
      const properties = Object.getOwnPropertyNames(this);
      properties.push(
        ...Object.getOwnPropertyNames(Object.getPrototypeOf(this)),
      );
      this.validProperties = properties.filter(
        (name) =>
          ![
            "eventType",
            "validProperties",
            "filters",
            "services",
            "layers",
          ].includes(name),
      );
    }
    return this.validProperties;
  }

  connectoToUrlSearchParameters() {
    this.loadUrlSearchParameters(new URLSearchParams(window.location.search));
    this.addChangedListener((_event: CustomEvent<SettingsChangedEvent>) => {
      if (window.history.replaceState) {
        const currentUrl = new URL(window.location.toLocaleString());
        currentUrl.search = this.toUrlSearchParameters().toString();
        window.history.replaceState(null, "", currentUrl.toString());
      }
    });
  }

  loadUrlSearchParameters(parameters: URLSearchParams) {
    const validProperties = this.getValidProperties();
    parameters.forEach((value, key, _parent) => {
      if (validProperties.includes(key)) {
        const field = this[key as keyof typeof this];
        switch (typeof field) {
          case "string":
            (this[key as keyof typeof this] as string) = value;
            break;
          case "number":
            (this[key as keyof typeof this] as number) = parseFloat(value);
            break;
          case "boolean":
            (this[key as keyof typeof this] as boolean) = value === "true";
            break;
          case "bigint":
          case "symbol":
          case "undefined":
          case "object":
          case "function":
            console.warn("Failed setting URL property: " + key);
            break;
        }
      } else if (key.includes("Filter")) {
        const filterKey = key.replace("Filter", "");
        this.setFilter(filterKey, value);
        for (const service of this.services) {
          service.filterKeys.push(filterKey);
        }
      } else if (key.includes("LayerOpacity")) {
        const layerId = key.replace("LayerOpacity[", "").replace("]", "");
        this.layers[parseInt(layerId)] = {
          name: layerId,
          opacity: parseFloat(value),
        };
        this.dispatchChangedEvent("LayerOpacity[" + layerId + "]");
      }
    });
  }

  toUrlSearchParameters(): URLSearchParams {
    const defaults = new Settings();
    const params = this.getValidProperties().reduce(
      (acc, name, _index, _array) => {
        const key = name as keyof typeof defaults;
        const value = this[key];
        if (value != defaults[key]) {
          acc[name] = value as string;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
    for (const filter in this.filters) {
      const trimmed = this.filters[filter].trim();
      if (trimmed.length > 0) {
        params[filter + "Filter"] = trimmed;
      }
    }
    for (const layer in this.layers) {
      if (this.layers[layer].opacity != 100) {
        params["LayerOpacity[" + layer + "]"] =
          this.layers[layer].opacity.toString();
      }
    }
    return new URLSearchParams(params);
  }
}

// Fix for missing `supportedValuesOf` function
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
  type Key =
    | "calendar"
    | "collation"
    | "currency"
    | "numberingSystem"
    | "timeZone"
    | "unit";

  function supportedValuesOf(input: Key): string[];
}

/**
 * Places settings dialog in the passed dialog container and connects it up to the passed button
 * When the button is pressed, dialog will be displayed and all settings will be reflected in the passed Settings
 *
 * @param appContainer Main app container element
 * @param settings Settings container which should be controled by this dialog
 */
export function setupSettingsDialog(
  appContainer: HTMLElement,
  settings: Settings,
): SettingsFields {
  const settingsContainer = document.createElement("div");
  settingsContainer.setAttribute(
    "style",
    "position: absolute; top: 10px; right: 10px; zIndex: 20px; padding: 10px;",
  );
  settingsContainer.className = "two-col-grid";
  const logo = settings.enableSettingsDialog
    ? document.createElement("input")
    : document.createElement("img");
  logo.setAttribute("type", "image");
  logo.id = "quad9logo";
  logo.src = settings.lightMode ? Quad9LogoDark : Quad9LogoLight;
  logo.width = 200;
  logo.className = "grid-item-2cols";
  logo.setAttribute("style", "background-color: rgba(0, 0, 0, 0.0);");
  settingsContainer.appendChild(logo);
  appContainer.appendChild(settingsContainer);
  const fields: SettingsFields = {
    openSettingsButton: logo,
    dialogContainer: registerDialogContainer(
      appContainer,
      "settings-dialog-container",
    ),
  };

  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    if (event.detail.field_changed == "lightMode") {
      if (settings.lightMode) {
        logo.src = Quad9LogoDark;
      } else {
        logo.src = Quad9LogoLight;
      }
    }
  });

  renderDialog(fields.dialogContainer);
  renderLayers(fields, settings);

  const dialog =
    fields.dialogContainer.querySelector<HTMLDialogElement>("#settingsDialog")!;
  dialog.addEventListener("click", (_event: Event) => {
    dialog.close();
  });
  const dialogArea = fields.dialogContainer.querySelector<HTMLDivElement>(
    "#settingsDialogArea",
  )!;
  dialogArea.addEventListener("click", (event: Event) => {
    event?.stopPropagation();
  });
  dialog.close();

  if (settings.enableSettingsDialog) {
    fields.openSettingsButton.addEventListener("click", (_event: Event) => {
      dialog.showModal();
    });
  }

  const applyButton =
    fields.dialogContainer.querySelector<HTMLElement>("#applybutton")!;
  applyButton.addEventListener("click", (_event: Event) => {
    dialog.close();
  });

  const tzSelector =
    fields.dialogContainer.querySelector<HTMLSelectElement>("#timezone")!;
  for (const tz of Intl.supportedValuesOf("timeZone")) {
    const option = '<option value="' + tz + '" >' + tz + "</option>";
    tzSelector.insertAdjacentHTML("beforeend", option);
  }

  type fieldType = [
    string,
    "boolean" | "number" | "string" | "selectstring",
    keyof typeof settings,
  ];
  for (const [selector, type, property] of [
    ["#antialiasing", "boolean", "antialiasingEnabled"],
    ["#autorotateglobe", "boolean", "autoRotateGlobe"],
    ["#enableatmosphere", "boolean", "enableAtmosphere"],
    ["#enablegraticules", "boolean", "enableGraticules"],
    ["#showwebsocketui", "boolean", "showWebsocketUi"],
    ["#showwsstatus", "boolean", "showWebsocketStatus"],
    ["#showtime", "boolean", "showDateAndTime"],
    ["#showeventcounters", "boolean", "showEventCounters"],
    ["#showeventcounterstotal", "boolean", "showEventCountersTotal"],
    ["#showeventcounters5m", "boolean", "showEventCountersLast5m"],
    ["#showeventcounters1m", "boolean", "showEventCountersLast1m"],
    ["#showeventcounters10s", "boolean", "showEventCountersLast10s"],
    ["#showcounterskey", "boolean", "showCountersKey"],
    ["#enableheatmaps", "boolean", "enableHeatmaps"],
    ["#enableanalysismode", "boolean", "enableAnalysisMode"],
    ["#enablecountryborders", "boolean", "enableCountryBorders"],
    ["#simplecountryborders", "boolean", "simpleCountryBorders"],
    ["#enabledboundarieslayers", "string", "enabledBoundariesLayers"],
    ["#analysismoderesolution", "number", "analysisModeResolution"],
    ["#analysismodemaxheightcount", "number", "analysisModeMaxHeightCount"],
    ["#analysismodemaxheightkms", "number", "analysisModeMaxHeightKms"],
    ["#analysismodedecay", "number", "analysisModeDecay"],
    ["#analysismodestartcolor", "string", "analysisModeStartColor"],
    ["#analysismodeendcolor", "string", "analysisModeEndColor"],
    ["#enableeventexplosions", "boolean", "enableEventExplosions"],
    ["#enableeventlabels", "boolean", "enableEventLabels"],
    ["#enableeventclickactions", "boolean", "enableEventClickActions"],
    ["#enablecircles", "boolean", "enableCircles"],
    ["#enablepointers", "boolean", "enablePointers"],
    ["#enablearcs", "boolean", "enableArcs"],
    ["#enabledownloadedobjects", "boolean", "enableDownloadedObjects"],
    ["#enablebars", "boolean", "enableBars"],
    ["#scalecounter", "boolean", "enableCounterScaling"],
    ["#lightmode", "boolean", "lightMode"],
    ["#showhelp", "boolean", "showHelp"],
    ["#counterstitle", "string", "countersTitle"],
    ["#counterslabel", "string", "countersLabel"],
    ["#bgcolor", "string", "bgColor"],
    ["#maxscale", "number", "maximumScale"],
    ["#maxscalecounter", "number", "maximumScaleCounter"],
    ["#timezone", "selectstring", "timeZone"],
    ["#startupzoom", "number", "startupZoom"],
    ["#startuplat", "number", "startupLat"],
    ["#startuplon", "number", "startupLon"],
    ["#autoconnect", "boolean", "autoconnect"],
    ["#datadownloadurl", "string", "dataDownloadUrl"],
    ["#datadownloadinterval", "number", "dataDownloadInterval"],
    [
      "#websocketautoreconnectinterval",
      "number",
      "websocketAutoreconnectIntervalMs",
    ],
  ] as fieldType[]) {
    const inputField = fields.dialogContainer.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(selector)!;
    function updateField() {
      switch (type) {
        case "boolean":
          (inputField as HTMLInputElement).checked = settings[
            property
          ] as boolean;
          break;
        case "number":
          (inputField as HTMLInputElement).valueAsNumber = settings[
            property
          ] as number;
          break;
        default:
          inputField.value = settings[property] as string;
          break;
      }
    }
    settings.addChangedListener((_event: Event) => {
      updateField();
    });
    updateField();
    inputField.addEventListener("change", (_event: Event) => {
      switch (type) {
        case "boolean":
          (settings[property] as boolean) = (
            inputField as HTMLInputElement
          ).checked;
          break;
        case "number":
          (settings[property] as number) = (
            inputField as HTMLInputElement
          ).valueAsNumber;
          break;
        default:
          (settings[property] as string) = inputField.value.trim();
          break;
      }
    });
  }

  const maxScaleField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#maxscale")!;
  maxScaleField.disabled =
    !settings.enableCounterScaling || !settings.enableEventExplosions;
  const maxScaleCounterField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#maxscalecounter")!;
  maxScaleCounterField.disabled =
    !settings.enableCounterScaling || !settings.enableEventExplosions;
  const showCountersKeyField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#showcounterskey")!;
  showCountersKeyField.disabled =
    !settings.enableCounterScaling || !settings.enableEventExplosions;
  const enableCounterScalingField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#scalecounter")!;
  enableCounterScalingField.disabled = !settings.enableEventExplosions;

  const eventCountersTitleField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#counterstitle")!;
  eventCountersTitleField.disabled = !settings.showEventCounters;
  const eventCountersLabelField =
    fields.dialogContainer.querySelector<HTMLInputElement>("#counterslabel")!;
  eventCountersLabelField.disabled = !settings.showEventCounters;
  const showEventCountersTotalField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#showeventcounterstotal",
    )!;
  showEventCountersTotalField.disabled = !settings.showEventCounters;
  const showEventCountersLast5mField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#showeventcounters5m",
    )!;
  showEventCountersLast5mField.disabled = !settings.showEventCounters;
  const showEventCountersLast1mField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#showeventcounters1m",
    )!;
  showEventCountersLast1mField.disabled = !settings.showEventCounters;
  const showEventCountersLast10sField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#showeventcounters10s",
    )!;
  showEventCountersLast10sField.disabled = !settings.showEventCounters;

  const analysisModeResolutionField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismoderesolution",
    )!;
  analysisModeResolutionField.disabled = !settings.enableAnalysisMode;
  const analysisModeDecayField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismodedecay",
    )!;
  analysisModeDecayField.disabled = !settings.enableAnalysisMode;
  const analysisModeStartColorField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismodestartcolor",
    )!;
  analysisModeStartColorField.disabled = !settings.enableAnalysisMode;
  const analysisModeEndColorField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismodeendcolor",
    )!;
  analysisModeEndColorField.disabled = !settings.enableAnalysisMode;
  const analysisModeMaxHeightCountField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismodemaxheightcount",
    )!;
  analysisModeMaxHeightCountField.disabled = !settings.enableAnalysisMode;
  const analysisModeMaxHeightKmsField =
    fields.dialogContainer.querySelector<HTMLInputElement>(
      "#analysismodemaxheightkms",
    )!;
  analysisModeMaxHeightKmsField.disabled = !settings.enableAnalysisMode;

  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    if (event.detail.field_changed == "enableCounterScaling") {
      showCountersKeyField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
      maxScaleField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
      maxScaleCounterField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
    }

    if (event.detail.field_changed == "enableEventExplosions") {
      showCountersKeyField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
      maxScaleField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
      maxScaleCounterField.disabled =
        !settings.enableCounterScaling || !settings.enableEventExplosions;
      enableCounterScalingField.disabled = !settings.enableEventExplosions;
    }

    if (event.detail.field_changed == "enableAnalysisMode") {
      analysisModeResolutionField.disabled = !settings.enableAnalysisMode;
      analysisModeDecayField.disabled = !settings.enableAnalysisMode;
      analysisModeStartColorField.disabled = !settings.enableAnalysisMode;
      analysisModeEndColorField.disabled = !settings.enableAnalysisMode;
      analysisModeMaxHeightCountField.disabled = !settings.enableAnalysisMode;
      analysisModeMaxHeightKmsField.disabled = !settings.enableAnalysisMode;
    }

    if (event.detail.field_changed == "showEventCounters") {
      eventCountersTitleField.disabled = !settings.showEventCounters;
      eventCountersLabelField.disabled = !settings.showEventCounters;
      showEventCountersTotalField.disabled = !settings.showEventCounters;
      showEventCountersLast5mField.disabled = !settings.showEventCounters;
      showEventCountersLast1mField.disabled = !settings.showEventCounters;
      showEventCountersLast10sField.disabled = !settings.showEventCounters;
    }
  });

  if (!navigator.gpu) {
    const heatmapsField =
      fields.dialogContainer.querySelector<HTMLInputElement>(
        "#enableheatmaps",
      )!;
    heatmapsField.checked = false;
    heatmapsField.disabled = true;
    heatmapsField.title = "WebGPU support is required for Heatmaps!";
  }

  renderFilters(fields, settings);

  return fields;
}

function renderFilters(fields: SettingsFields, settings: Settings) {
  const filtersArea =
    fields.dialogContainer.querySelector<HTMLDivElement>("#filtersArea")!;
  filtersArea.innerHTML = ``;

  for (const field in settings.filters) {
    filtersArea.insertAdjacentHTML(
      "beforeend",
      `
      <label for="${field}filter" class="filter-label">${field}:</label>
      <input type="text" id="${field}filter" name="${field}filter" class="filter-value" />
    `,
    );
    const inputField = fields.dialogContainer.querySelector<HTMLInputElement>(
      `#${field}filter`,
    )!;
    inputField.value = settings.filters[field] ?? "";
    inputField.addEventListener("change", (_event: Event) => {
      settings.setFilter(field, inputField.value);
    });
  }
}

/**
 * Updates filters in {@link Settings} and in the UI too.
 * {@link ServiceState} needs to be updated beforehand and it has to be available in {@link Settings#services}.
 *
 * @param fields the settings UI
 * @param settings settings state
 */
export function updateFilters(fields: SettingsFields, settings: Settings) {
  const filterFields: string[] = [];
  for (const service of settings.services) {
    filterFields.push(...service.filterKeys);
  }

  for (const key in settings.filters) {
    if (!filterFields.includes(key)) {
      delete settings.filters[key];
    }
  }

  for (const field of filterFields) {
    settings.filters[field] = settings.filters[field] ?? "";
  }
  renderFilters(fields, settings);
}

export function registerNewLayer(
  fields: SettingsFields,
  settings: Settings,
  layerId: number,
  layerName?: string,
) {
  if (settings.layers[layerId]) {
    if (layerName && settings.layers[layerId].name == layerId.toString()) {
      settings.layers[layerId].name = layerName;
    }
    return;
  }

  settings.layers[layerId] = {
    name: layerName ?? layerId.toString(),
    opacity: 100,
  };

  renderLayers(fields, settings);
}

function renderLayers(fields: SettingsFields, settings: Settings) {
  const layersArea =
    fields.dialogContainer.querySelector<HTMLDivElement>("#layersArea")!;

  layersArea.innerHTML = `
    <label for="globalopacity">Global opacity:</label>
    <input type="range" id="globalopacity" name="globalopacity" value="100" />
  `;

  const globalField =
    layersArea.querySelector<HTMLInputElement>("#globalopacity")!;
  globalField.valueAsNumber = settings.globalOpacity;
  globalField.addEventListener("change", (_event: Event) => {
    settings.globalOpacity = globalField.valueAsNumber;
  });

  for (const layer in settings.layers) {
    layersArea.insertAdjacentHTML(
      "beforeend",
      `
      <label for="layer${layer}" class="filter-label">Layer ${settings.layers[layer].name} opacity:</label>
      <input type="range" id="layer${layer}" name="layer${layer}" />
    `,
    );
    const inputField = fields.dialogContainer.querySelector<HTMLInputElement>(
      `#layer${layer}`,
    )!;
    inputField.valueAsNumber = settings.layers[layer].opacity;
    inputField.addEventListener("change", (_event: Event) => {
      settings.setLayerOpacity(
        layer as unknown as number,
        inputField.valueAsNumber,
      );
    });
  }
}

function renderDialog(dialogContainer: HTMLElement) {
  const version: string =
    import.meta.env.VITE_APP_VERSION || "dev-build." + new Date().getTime();
  let appVersionElement: string = "";
  if (
    import.meta.env.VITE_SHOW_APP_VERSION ||
    import.meta.env.MODE == "development"
  ) {
    appVersionElement = `<p style="font-size: 0.6em;">App version: ${version}</p>`;
  }
  dialogContainer.innerHTML = `
    <dialog id="settingsDialog" class="dialog-container">
      <div id="settingsDialogArea" class="two-col-grid">
        <h2 class="grid-item-2cols">Rendering</h2>
        <label for="antialiasing">Antialiasing enabled (requires reload):</label>
        <input type="checkbox" id="antialiasing" name="antialiasing" />
        <label for="autorotateglobe">Automatically rotate globe:</label>
        <input type="checkbox" id="autorotateglobe" name="autorotateglobe" />
        <label for="enableatmosphere">Show earth atmosphere:</label>
        <input type="checkbox" id="enableatmosphere" name="enableatmosphere" />
        <label for="enablegraticules">Show earth graticules:</label>
        <input type="checkbox" id="enablegraticules" name="enablegraticules" />
        <label for="simplecountryborders">Simpler country borders:</label>
        <input type="checkbox" id="simplecountryborders" name="simplecountryborders" />
        <h3 class="grid-item-2cols" style="margin: auto;">Layers</h3>
        <label for="enableheatmaps">Enable heatmaps (requires WebGPU):</label>
        <input type="checkbox" id="enableheatmaps" name="enableheatmaps" />
        <label for="enableanalysismode">Enable analysis mode:</label>
        <input type="checkbox" id="enableanalysismode" name="enableanalysismode" />
        <label for="enablecountryborders">Enable country borders:</label>
        <input type="checkbox" id="enablecountryborders" name="enablecountryborders" />
        <label for="enableeventexplosions">Show explosions:</label>
        <input type="checkbox" id="enableeventexplosions" name="enableeventexplosions" />
        <label for="enableeventclickactions">Enable click and hover actions on events:</label>
        <input type="checkbox" id="enableeventclickactions" name="enableeventclickactions" />
        <label for="enableeventlabels">Show event labels:</label>
        <input type="checkbox" id="enableeventlabels" name="enableeventlabels" />
        <label for="enablecircles">Show circles:</label>
        <input type="checkbox" id="enablecircles" name="enablecircles" />
        <label for="enablepointers">Show pointers:</label>
        <input type="checkbox" id="enablepointers" name="enablepointers" />
        <label for="enablebars">Show bars:</label>
        <input type="checkbox" id="enablebars" name="enablebars" />
        <label for="enablearcs">Show arcs:</label>
        <input type="checkbox" id="enablearcs" name="enablearcs" />
        <label for="enabledownloadedobjects">Show downloaded objects:</label>
        <input type="checkbox" id="enabledownloadedobjects" name="enabledownloadedobjects" />
        <label for="enabledboundarieslayers">Enabled boundaries layers (us,ch,de,...):</label>
        <input type="text" id="enabledboundarieslayers" name="enabledboundarieslayers" />
        <h4 class="grid-item-2cols" style="margin: auto;">Analysis mode</h4>
        <label for="analysismoderesolution">Analysis mode resolution:</label>
        <input type="number" min="0" max="15" step="1" id="analysismoderesolution" name="analysismoderesolution" />
        <label for="analysismodemaxheightcount">Analysis mode event count at maximum height:</label>
        <input type="number" min="1" step="1" id="analysismodemaxheightcount" name="analysismodemaxheightcount" />
        <label for="analysismodemaxheightkms">Analysis mode event maximum height in kms:</label>
        <input type="number" min="1" step="1" id="analysismodemaxheightkms" name="analysismodemaxheightkms" />
        <label for="analysismodedecay">Analysis mode decay in seconds:</label>
        <input type="number" min="1" step="0.1" id="analysismodedecay" name="analysismodedecay" />
        <label for="analysismodestartcolor">Analysis mode color at lowest height:</label>
        <input type="color" id="analysismodestartcolor" name="analysismodestartcolor" />
        <label for="analysismodeendcolor">Analysis mode color at highest height:</label>
        <input type="color" id="analysismodeendcolor" name="analysismodeendcolor" />
        <h4 class="grid-item-2cols" style="margin: auto;">Explosions</h4>
        <label for="scalecounter">Scale explosions based on counter:</label>
        <input type="checkbox" id="scalecounter" name="scalecounter" />
        <label for="maxscale">Maximum explosions scale based on counter:</label>
        <input type="number" min="1" step="0.01" max="5" id="maxscale" name="maxscale" />
        <label for="maxscalecounter">Counter value for maximum scale:</label>
        <input type="number" min="1" id="maxscalecounter" name="maxscalecounter" />
        <h2 class="grid-item-2cols">UI</h2>
        <label for="lightmode">Light mode:</label>
        <input type="checkbox" id="lightmode" name="lightmode" />
        <label for="bgcolor">Background color:</label>
        <input type="color" id="bgcolor" name="bgcolor" value="#000000" />
        <label for="showwebsocketui">Show websocket connection UI:</label>
        <input type="checkbox" id="showwebsocketui" name="showwebsocketui" />
        <label for="showwsstatus">Show websocket status:</label>
        <input type="checkbox" id="showwsstatus" name="showwsstatus" />
        <label for="showtime">Show date and time:</label>
        <input type="checkbox" id="showtime" name="showtime" />
        <label for="showhelp">Show help buttons:</label>
        <input type="checkbox" id="showhelp" name="showhelp" />
        <label for="showeventcounters">Show event counter data:</label>
        <input type="checkbox" id="showeventcounters" name="showeventcounters" />
        <label for="counterstitle">Counter intervals title:</label>
        <input type="text" id="counterstitle" name="counterstitle" />
        <label for="counterslabel">Counter intervals label prefix:</label>
        <input type="text" id="counterslabel" name="counterslabel" />
        <label for="showeventcounterstotal">Show total events:</label>
        <input type="checkbox" id="showeventcounterstotal" name="showeventcounterstotal" />
        <label for="showeventcounters5m">Show events last 5m:</label>
        <input type="checkbox" id="showeventcounters5m" name="showeventcounters5m" />
        <label for="showeventcounters1m">Show events last 1m:</label>
        <input type="checkbox" id="showeventcounters1m" name="showeventcounters1m" />
        <label for="showeventcounters10s">Show events last 10s:</label>
        <input type="checkbox" id="showeventcounters10s" name="showeventcounters10s" />
        <label for="showcounterskey">Show event counter key:</label>
        <input type="checkbox" id="showcounterskey" name="showcounterskey" />
        <label for="timezone">Time zone:</label>
        <select type="text" id="timezone" name="timezone"></select>
        <h2 class="grid-item-2cols">Data loading</h2>
        <label for="websocketautoreconnectinterval">Websocket autoreconnect interval (ms):</label>
        <input type="number" min="0" step="1" id="websocketautoreconnectinterval" name="websocketautoreconnectinterval" />
        <label for="datadownloadurl">Data download URL:</label>
        <input type="text" id="datadownloadurl" name="datadownloadurl" />
        <label for="datadownloadinterval">Data download interval (ms):</label>
        <input type="number" min="0" step="1" id="datadownloadinterval" name="datadownloadinterval" />
        <h2 class="grid-item-2cols" style="margin-bottom: auto;">Marker opacity layers</h2>
        <p class="grid-item-2cols" style="font-size: 0.6em; margin: auto;">Configuration for opacity of different objects, grouped into layers by their layer ID.</p>
        <div id="layersArea" class="grid-item-2cols two-col-grid">
        </div>
        <h2 class="grid-item-2cols">Startup (only applied after reload)</h2>
        <label for="startupzoom">Startup zoom level:</label>
        <input type="number" min="-10" max="10" step="0.01" id="startupzoom" name="startupzoom" />
        <label for="startuplat">Startup lat:</label>
        <input type="number" min="-90" max="90" step="0.01" id="startuplat" name="startuplat" />
        <label for="startuplon">Startup lon:</label>
        <input type="number" min="-180" max="180" step="0.01" id="startuplon" name="startuplon" />
        <label for="autoconnect">Autoconnect on startup:</label>
        <input type="checkbox" id="autoconnect" name="autoconnect" />
        <h2 class="grid-item-2cols" style="margin-bottom: auto;">Filtering (supports regex)</h2>
        <p class="grid-item-2cols" style="font-size: 0.6em; margin: auto;">Filters only apply to new data. Existing data will not be filtered.</p>
        <div id="filtersArea" class="grid-item-2cols two-col-grid">
        </div>
      </div>
      <p style="font-size: 0.6em;">Some map data thanks to <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener noreferrer">geoboundaries</a></p>
      ${appVersionElement}
      <button id="applybutton" type="button" class="light">Apply</button>
    </dialog>
  `;
}
