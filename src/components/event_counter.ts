import { clamp, lerp } from "three/src/math/MathUtils.js";
import QuestionMark from "../question_mark.svg?url";
import QuestionMarkDark from "../question_mark_dark.svg?url";
import { Settings, SettingsChangedEvent } from "../settings";
import { registerInfoDialog } from "./info_dialog";
import { AppState } from "../service/state";

const SECONDS_TO_MILLIS = 1000;
const MINUTES_TO_SECONDS = 60;
const MINUTES_TO_MILLIS = MINUTES_TO_SECONDS * SECONDS_TO_MILLIS;

class EventCounterData {
  last5min: number = 0;
  last1min: number = 0;
  last10s: number = 0;
  total: number = 0;

  reset() {
    this.last5min = 0;
    this.last1min = 0;
    this.last10s = 0;
    this.total = 0;
  }

  addToAll(addition: number) {
    this.last10s += addition;
    this.last1min += addition;
    this.last5min += addition;
    this.total += addition;
  }

  lerpTo(newData: EventCounterData, factor: number): EventCounterData {
    const result = new EventCounterData();
    result.last10s = Math.round(lerp(this.last10s, newData.last10s, factor));
    result.last1min = Math.round(lerp(this.last1min, newData.last1min, factor));
    result.last5min = Math.round(lerp(this.last5min, newData.last5min, factor));
    result.total = Math.round(lerp(this.total, newData.total, factor));
    return result;
  }
}

const events: [Date, number][] = [];
let prevData = new EventCounterData();
let lastData = new EventCounterData();
let lastUpdate = 0;

/**
 * Adds event counters to provided container and hooks it up to passed events queue
 *
 * @param appContainer Main app container element
 * @param state shared app state
 * @param settings Settings container which is used to detect filter changes, to restart counters
 */
export function setupEventCounters(
  appContainer: HTMLElement,
  state: AppState,
  settings: Settings,
) {
  const container = document.createElement("div");
  container.setAttribute("id", "eventcountercontainer");
  container.setAttribute(
    "style",
    "position: absolute; top: 10px; left: 10px; zIndex: 30px; padding: 10px;",
  );
  appContainer.appendChild(container);

  const elements = addElements(appContainer, container, settings);

  elements.total.hidden = !settings.showEventCountersTotal;
  elements.totalLabel.hidden = !settings.showEventCountersTotal;
  elements.last5min.hidden = !settings.showEventCountersLast5m;
  elements.last5minLabel.hidden = !settings.showEventCountersLast5m;
  elements.last1min.hidden = !settings.showEventCountersLast1m;
  elements.last1minLabel.hidden = !settings.showEventCountersLast1m;
  elements.last10s.hidden = !settings.showEventCountersLast10s;
  elements.last10sLabel.hidden = !settings.showEventCountersLast10s;
  elements.helpButton.style.display = settings.showHelp ? "inline" : "none";

  setInterval(() => {
    updateCounters(state.newEventsQueue);
  }, 1000);

  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    // Reset counters when a filter is changed
    if (event.detail.field_changed.includes("Filter")) {
      events.length = 0;
      prevData.reset();
      lastData.reset();
      state.newEventsQueue.length = 0;
    }

    if (event.detail.field_changed == "showEventCounters") {
      container.hidden = !settings.showEventCounters;
    }

    if (event.detail.field_changed == "lightMode") {
      elements.helpButton.src = settings.lightMode
        ? QuestionMarkDark
        : QuestionMark;
    }

    if (event.detail.field_changed == "showHelp") {
      elements.helpButton.style.display = settings.showHelp ? "inline" : "none";
    }

    if (event.detail.field_changed == "countersTitle") {
      container.querySelector<HTMLHeadingElement>(
        "#counterintervalstitle",
      )!.innerText = settings.countersTitle;
    }

    if (event.detail.field_changed == "countersLabel") {
      const labelPrefix = settings.countersLabel;
      elements.totalLabel.innerText = `${labelPrefix} total:`;
      elements.last5minLabel.innerText = `${labelPrefix} last 5m:`;
      elements.last1minLabel.innerText = `${labelPrefix} last 1m:`;
      elements.last10sLabel.innerText = `${labelPrefix} last 10s:`;
    }

    if (event.detail.field_changed == "showEventCountersTotal") {
      elements.total.hidden = !settings.showEventCountersTotal;
      elements.totalLabel.hidden = !settings.showEventCountersTotal;
    }

    if (event.detail.field_changed == "showEventCountersLast5m") {
      elements.last5min.hidden = !settings.showEventCountersLast5m;
      elements.last5minLabel.hidden = !settings.showEventCountersLast5m;
    }

    if (event.detail.field_changed == "showEventCountersLast1m") {
      elements.last1min.hidden = !settings.showEventCountersLast1m;
      elements.last1minLabel.hidden = !settings.showEventCountersLast1m;
    }

    if (event.detail.field_changed == "showEventCountersLast10s") {
      elements.last10s.hidden = !settings.showEventCountersLast10s;
      elements.last10sLabel.hidden = !settings.showEventCountersLast10s;
    }
  });

  requestAnimationFrame((timestamp: DOMHighResTimeStamp) =>
    updateCountersUI(timestamp, elements),
  );
}

interface EventCounterElements {
  last5min: HTMLElement;
  last5minLabel: HTMLElement;
  last1min: HTMLElement;
  last1minLabel: HTMLElement;
  last10s: HTMLElement;
  last10sLabel: HTMLElement;
  total: HTMLElement;
  totalLabel: HTMLElement;
  helpButton: HTMLInputElement;
}

function addElements(
  appContainer: HTMLElement,
  container: HTMLElement,
  settings: Settings,
): EventCounterElements {
  const questionMarkIcon = settings.lightMode ? QuestionMarkDark : QuestionMark;
  const labelPrefix = settings.countersLabel;
  container.innerHTML = `
  <div class="two-col-grid">
    <div class="grid-item-2cols">
      <h2 style="text-decoration: underline; display: inline; line-height: 1; margin-bottom: 0px;" id="counterintervalstitle">${settings.countersTitle}</h2>
      <input id="infodialogbutton" type="image" src="${questionMarkIcon}" width='15' style="display: inline; margin-left: 10px;" />
    </div>
    <div class="two-col-grid grid-item-2cols" style="justify-items: stretch;">
      <p class="counter-label" id="totalcountlabel">${labelPrefix} total:</p>
      <p id="totalcount" class="counter-value">0</p>
      <p class="counter-label" id="last5minlabel">${labelPrefix} last 5m:</p>
      <p id="last5min" class="counter-value">0</p>
      <p class="counter-label" id="last1minlabel">${labelPrefix} last 1m:</p>
      <p id="last1min" class="counter-value">0</p>
      <p class="counter-label" id="last10slabel">${labelPrefix} last 10s:</p>
      <p id="last10s" class="counter-value">0</p>
    </div>
  </div>
  `;

  container.hidden = !settings.showEventCounters;

  registerInfoDialog(
    appContainer,
    "info-dialog-container",
    container.querySelector<HTMLElement>("#infodialogbutton")!,
    INFO_DIALOG_CONTENTS,
  );

  return {
    last5min: container.querySelector<HTMLInputElement>("#last5min")!,
    last5minLabel: container.querySelector<HTMLInputElement>("#last5minlabel")!,
    last1min: container.querySelector<HTMLInputElement>("#last1min")!,
    last1minLabel: container.querySelector<HTMLInputElement>("#last1minlabel")!,
    last10s: container.querySelector<HTMLInputElement>("#last10s")!,
    last10sLabel: container.querySelector<HTMLInputElement>("#last10slabel")!,
    total: container.querySelector<HTMLInputElement>("#totalcount")!,
    totalLabel: container.querySelector<HTMLInputElement>("#totalcountlabel")!,
    helpButton: container.querySelector<HTMLInputElement>("#infodialogbutton")!,
  };
}

function updateCounters(newEventsQueue: number[]) {
  const currentData = new EventCounterData();

  const currentDate = new Date();
  lastUpdate = performance.now();
  events.forEach(([date, count]) => {
    currentData.total += count;
    if (date.getTime() + 5 * MINUTES_TO_MILLIS > currentDate.getTime()) {
      currentData.last5min += count;

      if (date.getTime() + 1 * MINUTES_TO_MILLIS > currentDate.getTime()) {
        currentData.last1min += count;

        if (date.getTime() + 10 * SECONDS_TO_MILLIS > currentDate.getTime()) {
          currentData.last10s += count;
        }
      }
    }
  });

  const newSum = newEventsQueue
    .splice(0, newEventsQueue.length)
    .reduce((l: number, r: number, _index, _array) => l + r, 0);
  if (newSum > 0) {
    events.push([new Date(), newSum]);

    currentData.addToAll(newSum);
  }

  prevData = lastData;
  lastData = currentData;
}

function updateCountersUI(
  timestamp: DOMHighResTimeStamp,
  elements: EventCounterElements,
) {
  const delta = clamp(timestamp - lastUpdate, 0, 1000);
  const factor = delta / 1000;
  const scaledValue = prevData.lerpTo(lastData, factor);
  for (const [element, value] of [
    [elements.total, scaledValue.total],
    [elements.last5min, scaledValue.last5min],
    [elements.last1min, scaledValue.last1min],
    [elements.last10s, scaledValue.last10s],
  ] as [HTMLElement, number][]) {
    element.innerHTML = value.toString();
  }
  requestAnimationFrame((nt: DOMHighResTimeStamp) =>
    updateCountersUI(nt, elements),
  );
}

const INFO_DIALOG_CONTENTS =
  import.meta.env.VITE_APP_INFO_DIALOG_CONTENTS ||
  `
<h2>The Globe Of Wonder</h2>
<p>
This is the realtime viewer for Quad9 blocking data. Quad9 collects "fuzzed" geolocation data (see our <a href="https://www.quad9.net/privacy/policy/">privacy policy</a>) every time a user on our systems is protected against a malicious domain (phishing, malware, botnets, ransomware, stalkerware, etc.) We determine the metropolitan region and nation of the event, and this display will show those events as circles on the map.
</p>
<h3>Aggregation</h3>
<p>
We often receive many block events for a single area within a few seconds. In order to prevent overwhelming the display, and also to show "higher weight" for those areas, we perform a 3 second aggregation function. We count the number of events within a specific city/country per 3 seconds, then then put a proportionally-larger dot on the map for that aggregated interval. This is why some dots are smaller and some are larger. There is a maximum size dot that we put on the map (20 or more events in 3 seconds) but it is useful to know that some of these dots may actually represent hundreds or thousands of blocked queries but this particular map can't represent that quite yet.
</p>
<h3>IP Geolocation Artifacts</h3>
<p>
There are some regions that look like they have less activity than others, but that may be misleading. Africa often looks more quiet than other areas, for instance, even though there may be almost as much traffic as other denser-appearing areas. We surmise this is because much of the IP address space in Africa (and other areas) is not well-mapped to the actual physical location of the end user, and therefore all the block events appear to be coming from the capital city, or the largest city in the region. This causes all the dots to be superimposed on each other, leading to a single very active spot on the map which does not make visible the activity that is actually occurring.
</p>
<p>
Questions? Send to <a href="mailto:jtodd@quad9.net">jtodd@quad9.net</a>
</p>
`;
