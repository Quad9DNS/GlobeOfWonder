import { Settings, SettingsChangedEvent } from "./settings";

/**
 * Configures light mode setting.
 * Ensures that main app UI properly reacts to {@link Settings#lightMode}
 */
export function setupLightMode(settings: Settings) {
  updateLightMode(settings);

  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    if (
      event.detail.field_changed == "bgColor" ||
      event.detail.field_changed == "lightMode"
    ) {
      updateLightMode(settings);
    }
  });
}

function updateLightMode(settings: Settings) {
  if (settings.lightMode) {
    document.body.classList.add("light");
    document.body.classList.remove("dark");
  } else {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  }
}
