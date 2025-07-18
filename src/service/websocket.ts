import { Settings, SettingsChangedEvent, SettingsFields } from "../settings";
import { promptPassword } from "../components/password_prompt";
import { AppState, ServiceState } from "./state";
import { processServiceData } from "./data";

let websocketCredentials: string | null = null;
const connectionStatus: { [key: number]: string } = {
  [WebSocket.CONNECTING]: "Connecting",
  [WebSocket.OPEN]: "Open",
  [WebSocket.CLOSING]: "Closing",
  [WebSocket.CLOSED]: "Closed",
};

let websocket: WebSocket | null = null;

/**
 * UI elements related to websocket control
 */
interface WsFields {
  /**
   * Status element - used to display connection URL and status
   */
  status: HTMLElement;
  /**
   * Connect button element - used to initiate connection to websocket server
   */
  connectButton: HTMLButtonElement;
  /**
   * URL input element - field which can be used to customize websocket connection url
   */
  url: HTMLInputElement;
  /**
   * Username input element - field which can be used to customize username to use at connection - optional
   */
  username: HTMLInputElement;
  /**
   * Password input element - field which can be used to customize password to use at connection - optional
   */
  password: HTMLInputElement;
  /**
   * Container of websocket configuration elements - mainly used to hide and show as needed
   */
  configurationContainer: HTMLElement;
}

/**
 * Prepares websocket options by connecting passed fields to event handler, connecting when connect button is pressed
 *
 * @param configurationContainer Container to render the websocket elements into
 * @param settingsFields UI elements that are used for settings, to configure filters section
 * @param appState shared state to push incoming websocket data into
 * @param serviceState state for this service
 * @param settings Settings container which is used for filter configuration
 * @param autoConnect Set to true to automatically connect to websocket
 */
export function setupWebsocket(
  configurationContainer: HTMLElement,
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
  autoConnect: boolean,
) {
  configurationContainer.innerHTML = `
    <label for="wsusername">Username:</label>
    <input type="text" id="wsusername" name="wsusername" />
    <label for="wspassword">Password:</label>
    <input type="password" id="wspassword" name="wspassword" />
    <label for="wsurl" id="wsurllabel">Websocket url:</label>
    <input type="text" id="wsurl" name="wsurl" />
    <button id="connectbutton" type="button" style="grid-area: footer;">Connect</button>
  `;
  const fields: WsFields = {
    status:
      configurationContainer.parentElement!.querySelector<HTMLParagraphElement>(
        "#wsstatus",
      )!,
    connectButton:
      configurationContainer.querySelector<HTMLButtonElement>(
        "#connectbutton",
      )!,
    url: configurationContainer.querySelector<HTMLInputElement>("#wsurl")!,
    username:
      configurationContainer.querySelector<HTMLInputElement>("#wsusername")!,
    password:
      configurationContainer.querySelector<HTMLInputElement>("#wspassword")!,
    configurationContainer: configurationContainer,
  };
  fields.url.value = settings.websocketUrl;
  fields.username.value = settings.websocketUsername;
  if (
    settings.websocketUsername &&
    !settings.websocketPassword &&
    autoConnect
  ) {
    promptPassword({
      text: "Password for " + settings.websocketUsername,
      buttonText: undefined,
      callback: (password: string) => {
        fields.password.value = password;
        if (autoConnect) {
          connectToWebsocket(
            fields,
            settingsFields,
            appState,
            serviceState,
            settings,
          );
        }
      },
    });
  } else {
    fields.password.value = settings.websocketPassword;
  }
  if (autoConnect && fields.password.value.length > 0) {
    connectToWebsocket(
      fields,
      settingsFields,
      appState,
      serviceState,
      settings,
    );
  }
  fields.connectButton.addEventListener("click", (_event: Event) => {
    connectToWebsocket(
      fields,
      settingsFields,
      appState,
      serviceState,
      settings,
    );
  });

  // Immediately update websocket status
  updateWebsocketStatus(fields, settings);

  settings.addChangedListener((_event: CustomEvent<SettingsChangedEvent>) => {
    updateWebsocketStatus(fields, settings);
  });
}

function connectToWebsocket(
  fields: WsFields,
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
) {
  if (
    setWebsocketUrl(fields.url, settings) &&
    setWebsocketCredentials(fields.username, fields.password, settings)
  ) {
    connectWebsocket(fields, settingsFields, appState, serviceState, settings);
  }
}

/**
 * Updates UI elements related to websocket status
 * This should be called periodically to ensure status is updated in time
 *
 * @param fields UI elements that are used to display websocket status
 * @param settings Settings container which is used to optionally disable this element
 */
function updateWebsocketStatus(fields: WsFields, settings: Settings) {
  if (websocket != null) {
    const status = connectionStatus[websocket.readyState];
    fields.status.hidden =
      !settings.showWebsocketStatus || websocket.readyState == WebSocket.CLOSED;
    fields.configurationContainer.style.display =
      websocket.readyState == WebSocket.CLOSED && settings.showWebsocketUi
        ? ""
        : "none";
    fields.status.innerHTML = `Websocket server: ${settings.websocketUrl} - ${status}`;
  } else {
    fields.configurationContainer.style.display = settings.showWebsocketUi
      ? ""
      : "none";
  }
}

function setWebsocketUrl(
  urlField: HTMLInputElement,
  settings: Settings,
): boolean {
  const newUrl = urlField.value;
  const parsedUrl = URL.parse(newUrl);
  if (parsedUrl == null) {
    urlField.setCustomValidity("Invalid URL!");
    return false;
  }
  urlField.setCustomValidity("");

  settings.websocketUrl = newUrl;

  return true;
}

function setWebsocketCredentials(
  usernameField: HTMLInputElement,
  passwordField: HTMLInputElement,
  settings: Settings,
): boolean {
  const username = usernameField.value;
  const password = passwordField.value;
  if (!username && !password) {
    settings.websocketUsername = username;
    websocketCredentials = null;
    return true;
  }

  if (username.includes(":")) {
    usernameField.setCustomValidity("Username can't contain :");
    return false;
  }
  usernameField.setCustomValidity("");
  passwordField.setCustomValidity("");

  settings.websocketUsername = username;
  websocketCredentials = encodeURIComponent(btoa(`${username}:${password}`));
  return true;
}

function connectWebsocket(
  fields: WsFields,
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
) {
  try {
    if (websocketCredentials != null) {
      websocket = new WebSocket(settings.websocketUrl, websocketCredentials);
    } else {
      websocket = new WebSocket(settings.websocketUrl);
    }
  } catch (_e: unknown) {
    console.error("Websocket connection failed.");
    fields.url.setCustomValidity("Websocket error!");
    fields.username.setCustomValidity("Websocket error!");
    fields.password.setCustomValidity("Websocket error!");
    updateWebsocketStatus(fields, settings);
    return;
  }
  websocket.addEventListener("error", (event: Event) => {
    fields.url.setCustomValidity("Websocket error!");
    console.error("WebSocket error: ", event);
    fields.status.hidden = true;
    fields.configurationContainer.style.display = settings.showWebsocketUi
      ? ""
      : "none";
    updateWebsocketStatus(fields, settings);
  });

  websocket.addEventListener("close", (event: CloseEvent) => {
    if (!event.wasClean) {
      fields.url.setCustomValidity("Websocket error!");
      fields.username.setCustomValidity("Websocket error!");
      fields.password.setCustomValidity("Websocket error!");
    }
    fields.status.hidden = true;
    fields.configurationContainer.style.display = settings.showWebsocketUi
      ? ""
      : "none";
    updateWebsocketStatus(fields, settings);
    setTimeout(() => {
      connectWebsocket(
        fields,
        settingsFields,
        appState,
        serviceState,
        settings,
      );
    }, settings.websocketAutoreconnectIntervalMs);
  });

  websocket.addEventListener("open", (_event: Event) => {
    fields.status.hidden = !settings.showWebsocketStatus;
    fields.configurationContainer.style.display = "none";
    // Restart filters configuration when reconnecting
    serviceState.filtersConfigured = false;
    updateWebsocketStatus(fields, settings);
  });

  websocket.addEventListener("message", (event: MessageEvent) => {
    processServiceData(
      event.data,
      settings,
      settingsFields,
      appState,
      serviceState,
    );
  });
}
