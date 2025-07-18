import { EXPLOSION_COLOR_DARK, EXPLOSION_COLOR_LIGHT } from "../data/explosion";
import QuestionMark from "../question_mark.svg?url";
import QuestionMarkDark from "../question_mark_dark.svg?url";
import { AppState } from "../service/state";
import { Settings, SettingsChangedEvent } from "../settings";
import { registerInfoDialog } from "./info_dialog";

/**
 * Adds event count key that represents sizes of dots in relation to count of events
 *
 * @param appContainer Main app container element
 * @param state shared state to get globe zoom factor from
 * @param settings Settings container which is used to event counts and sizes
 */
export function setupEventCountKey(
  appContainer: HTMLElement,
  state: AppState,
  settings: Settings,
) {
  const container = document.createElement("div");
  container.setAttribute("id", "keycontainer");
  container.setAttribute(
    "style",
    "position: absolute; bottom: 10px; left: 10px; zIndex: 30px; padding: 10px;",
  );
  appContainer.appendChild(container);

  const elements = addElements(appContainer, container, settings);

  elements.helpButton.style.display = settings.showHelp ? "inline" : "none";

  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    // Update key when maximumScale or maximumScaleCounter are changed
    if (event.detail.field_changed == "maximumScaleCounter") {
      elements.midScaleLabel.innerHTML = `2-${settings.maximumScaleCounter} =`;
      elements.maxScaleLabel.innerHTML = `${settings.maximumScaleCounter}+ =`;
    } else if (
      event.detail.field_changed == "enableCounterScaling" ||
      event.detail.field_changed == "showCountersKey" ||
      event.detail.field_changed == "enableEventExplosions"
    ) {
      container.hidden =
        !settings.showCountersKey ||
        !settings.enableCounterScaling ||
        !settings.enableEventExplosions;
    }

    if (event.detail.field_changed == "lightMode") {
      elements.helpButton.src = settings.lightMode
        ? QuestionMarkDark
        : QuestionMark;
      const dotColor = settings.lightMode
        ? EXPLOSION_COLOR_LIGHT.getHexString()
        : EXPLOSION_COLOR_DARK.getHexString();
      elements.maxScaleCircle.setAttribute("fill", `#${dotColor}`);
      elements.midScaleCircle.setAttribute("fill", `#${dotColor}`);
      elements.minScaleCircle.setAttribute("fill", `#${dotColor}`);
    }

    if (event.detail.field_changed == "showHelp") {
      elements.helpButton.style.display = settings.showHelp ? "inline" : "none";
    }
  });

  function updateEventCountKey() {
    const maxScale = 35 * state.globeCurrentZoomFactor;
    const minScale = (maxScale * 1) / settings.maximumScale;
    const midScale = (maxScale + minScale) / 2.0;
    elements.maxScaleCircle.setAttribute("r", maxScale.toString());
    elements.midScaleCircle.setAttribute("r", midScale.toString());
    elements.minScaleCircle.setAttribute("r", minScale.toString());
    requestAnimationFrame(updateEventCountKey);
  }

  requestAnimationFrame(updateEventCountKey);
}

interface EventCountKeyElements {
  maxScaleLabel: HTMLElement;
  midScaleLabel: HTMLElement;
  maxScaleCircle: SVGCircleElement;
  midScaleCircle: SVGCircleElement;
  minScaleCircle: SVGCircleElement;
  helpButton: HTMLInputElement;
}

function addElements(
  appContainer: HTMLElement,
  container: HTMLElement,
  settings: Settings,
): EventCountKeyElements {
  const questionMarkIcon = settings.lightMode ? QuestionMarkDark : QuestionMark;
  const dotColor = settings.lightMode
    ? EXPLOSION_COLOR_LIGHT.getHexString()
    : EXPLOSION_COLOR_DARK.getHexString();
  const maxScale = 15;
  const minScale = (maxScale * 1) / settings.maximumScale;
  const midScale = (maxScale + minScale) / 2.0;
  container.innerHTML = `
  <div class="two-col-grid">
    <div class="grid-item-2cols">
      <h2 style="text-decoration: underline; display: inline; line-height: 1; margin-bottom: 0px;">Event Count Key</h2>
      <input id="keyinfodialogbutton" type="image" src="${questionMarkIcon}" width='15' style="display: inline; margin-left: 10px;" />
    </div>
    <div class="two-col-grid grid-item-2cols" style="justify-items: stretch;">
      <p class="counter-label">1 =</p>
      <svg class="counter-value" height="70" width="70" xmlns="http://www.w3.org/2000/svg">
        <circle id="minscalecircle" r="${minScale}" cx="35" cy="35" fill="#${dotColor}" />
      </svg>
      <p class="counter-label" id="midscalelabel">2-${settings.maximumScaleCounter} =</p>
      <svg class="counter-value" height="70" width="70" xmlns="http://www.w3.org/2000/svg">
        <circle id="midscalecircle" r="${midScale}" cx="35" cy="35" fill="#${dotColor}" />
      </svg>
      <p class="counter-label" id="maxscalelabel">${settings.maximumScaleCounter}+ =</p>
      <svg class="counter-value" height="70" width="70" xmlns="http://www.w3.org/2000/svg">
        <circle id="maxscalecircle" r="${maxScale}" cx="35" cy="35" fill="#${dotColor}" />
      </svg>
    </div>
  </div>
  `;

  container.hidden =
    !settings.showCountersKey ||
    !settings.enableCounterScaling ||
    !settings.enableEventExplosions;

  registerInfoDialog(
    appContainer,
    "key-info-dialog-container",
    container.querySelector<HTMLElement>("#keyinfodialogbutton")!,
    INFO_DIALOG_CONTENTS,
  );

  return {
    maxScaleLabel: container.querySelector<HTMLInputElement>("#maxscalelabel")!,
    midScaleLabel: container.querySelector<HTMLInputElement>("#midscalelabel")!,
    maxScaleCircle:
      container.querySelector<SVGCircleElement>("#maxscalecircle")!,
    midScaleCircle:
      container.querySelector<SVGCircleElement>("#midscalecircle")!,
    minScaleCircle:
      container.querySelector<SVGCircleElement>("#minscalecircle")!,
    helpButton: container.querySelector<HTMLInputElement>(
      "#keyinfodialogbutton",
    )!,
  };
}

const INFO_DIALOG_CONTENTS =
  import.meta.env.VITE_KEY_INFO_DIALOG_CONTENTS ||
  `
<p>
There are short aggregations performed by the monitoring system that turn multiple blocking events into a single graphical representation, otherwise there would be too many dots on the map to reasonably represent the activity happening. We aggregate based on latitude/longitude, usually over a 3 second window. Dots that represent an aggregated quantity of blocks are shown as larger for the first few hundred milliseconds and have a different color, before shrinking to the same size and color as all other events.
</p>
`;
