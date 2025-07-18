import "./style.css";
import { setupGlobe } from "./globe";
import { setupWebsocket } from "./service/websocket.ts";
import { Settings, setupSettingsDialog } from "./settings";
import { setupEventCounters } from "./components/event_counter.ts";
import { setupEventCountKey } from "./components/globe_key.ts";
import { registerSharedComponents } from "./components";
import { setupLightMode } from "./light_mode.ts";
import { createState, ServiceState } from "./service/state.ts";
import { DateTimeElement } from "./components/datetime.ts";
import "./components";
import { ExplosionData } from "./data/explosion.ts";
import { PointData } from "./data/index.ts";
import { CircleData } from "./data/circle.ts";
import { PointerData } from "./data/pointer.ts";
import { BarData } from "./data/bar.ts";
import { DownloadedData } from "./data/downloaded.ts";
import { ArcData } from "./data/arc.ts";
import { setupDataDownloader } from "./service/downloader.ts";

let appContainer = document.querySelector<HTMLDivElement>("#app")!;
appContainer.innerHTML = `
  <div style="width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; overflow: hidden;">
    <div style="position: absolute; bottom: 10px; right: 10px; zIndex: 20px; padding: 10px;">
      <date-time id="datetimedisplay"></date-time>
      <p id="wsstatus" style="font-size: 0.8em; text-align: end; margin-bottom: 5px; line-height: 1;" hidden>Websocket server: - </p>
      <div id="wsconfigcontainer" class="two-col-grid"></div>
    </div>
  </div>
`;
appContainer = appContainer.children[0] as HTMLDivElement;

const settings = new Settings();
const websocketServiceState = new ServiceState();
const dataDownloaderServiceState = new ServiceState();
settings.services = [websocketServiceState, dataDownloaderServiceState];
settings.connectoToUrlSearchParameters();
setupLightMode(settings);

const dateTimeDisplay =
  document.querySelector<DateTimeElement>("#datetimedisplay")!;
dateTimeDisplay.setup(settings);

/**
 * Shared state between the data sources and the globe
 */
const state = createState(settings);

registerSharedComponents(appContainer);
const settingsFields = setupSettingsDialog(appContainer, settings);
setupWebsocket(
  document.querySelector<HTMLDivElement>("#wsconfigcontainer")!,
  settingsFields,
  state,
  websocketServiceState,
  settings,
  settings.autoconnect,
);
setupDataDownloader(
  settingsFields,
  state,
  dataDownloaderServiceState,
  settings,
);
setupEventCounters(appContainer, state, settings);
setupEventCountKey(appContainer, state, settings);

setupGlobe(appContainer, state, settings);

if (import.meta.env.VITE_RELOAD_INTERVAL_MS) {
  setTimeout(
    () => {
      location.reload();
    },
    import.meta.env.VITE_RELOAD_INTERVAL_MS,
  );
}

// Debugging tools
declare global {
  interface Window {
    ExplosionData: typeof ExplosionData;
    CircleData: typeof CircleData;
    PointerData: typeof PointerData;
    BarData: typeof BarData;
    DownloadedData: typeof DownloadedData;
    ArcData: typeof ArcData;
    addObject: (newPoint: PointData) => void;
  }
}
if (import.meta.env.MODE == "development") {
  window.ExplosionData = ExplosionData;
  window.CircleData = CircleData;
  window.PointerData = PointerData;
  window.BarData = BarData;
  window.DownloadedData = DownloadedData;
  window.ArcData = ArcData;
  window.addObject = (newPoint: PointData) => {
    state.newPointsQueue.push(newPoint);
  };
}
