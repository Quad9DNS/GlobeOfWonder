import { Settings, SettingsChangedEvent, SettingsFields } from "../settings";
import { processServiceData } from "./data";
import { AppState, ServiceState } from "./state";

let lastInterval: number | undefined = undefined;

/**
 * Prepares data downloader, fetching data from URL provided in settings
 *
 * @param settingsFields UI elements that are used for settings, to configure filters section
 * @param appState shared state to push incoming websocket data into
 * @param serviceState state of this service
 * @param settings Settings container which is used for filter configuration
 */
export function setupDataDownloader(
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
) {
  updateDownloader(settingsFields, appState, serviceState, settings);
  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    if (
      event.detail.field_changed == "dataDownloadUrl" ||
      event.detail.field_changed == "dataDownloadInterval"
    ) {
      serviceState.filtersConfigured = false;
      updateDownloader(settingsFields, appState, serviceState, settings);
    }
  });
}

function updateDownloader(
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
) {
  if (settings.dataDownloadUrl.length != 0) {
    runDownload(settings, settingsFields, appState, serviceState);
    if (settings.dataDownloadInterval > 0) {
      clearInterval(lastInterval);
      lastInterval = setInterval(
        () => runDownload(settings, settingsFields, appState, serviceState),
        settings.dataDownloadInterval,
      );
    }
  }
}

function runDownload(
  settings: Settings,
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
) {
  fetch(settings.dataDownloadUrl)
    .then((data) => data.json())
    .then((jsonData: object[]) => {
      for (const data of jsonData) {
        processServiceData(
          JSON.stringify(data),
          settings,
          settingsFields,
          appState,
          serviceState,
        );
      }
    });
}
