import { Settings, SettingsChangedEvent } from "../settings";

/**
 * Custom element that displays current date and time.
 * Can be connected to {@link Settings} for time zone configuration.
 */
export class DateTimeElement extends HTMLElement {
  dateTimeDisplayElement: HTMLElement | null;

  constructor() {
    super();
    this.dateTimeDisplayElement = null;
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <p style="font-size: 0.8em; text-align: end; margin-bottom: 5px; line-height: 1;"></p>
    `;
    this.dateTimeDisplayElement = shadow.children[0] as HTMLElement;
  }

  /**
   * Updates this element with currentTime - formatted in DD-MM-YYYY HH:MM:SS format
   *
   * @param currentTime reference time to render
   * @param timeZone time zone to use
   */
  updateDate(currentTime: Date, timeZone: string) {
    const format = Intl.DateTimeFormat("default", {
      timeZone: timeZone,
      timeZoneName: "longOffset",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour12: false,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    const parts = format.formatToParts(currentTime);

    const parsedParts = {
      year: "0000",
      month: "00",
      day: "00",
      hour: "00",
      minute: "00",
      second: "00",
      offset: "+00:00",
    };

    for (const part of parts) {
      switch (part.type) {
        case "year":
          parsedParts.year = part.value;
          break;
        case "month":
          parsedParts.month = part.value.padStart(2, "0");
          break;
        case "day":
          parsedParts.day = part.value.padStart(2, "0");
          break;
        case "hour":
          parsedParts.hour = part.value.padStart(2, "0");
          break;
        case "minute":
          parsedParts.minute = part.value.padStart(2, "0");
          break;
        case "second":
          parsedParts.second = part.value.padStart(2, "0");
          break;
        case "timeZoneName":
          if (part.value.includes("+") || part.value.includes("-")) {
            parsedParts.offset = part.value.replace("GMT", "");
          } else {
            parsedParts.offset = part.value.replace("GMT", "+00:00");
          }
          break;
        default:
          break;
      }
    }

    if (this.dateTimeDisplayElement) {
      this.dateTimeDisplayElement.innerHTML = `${parsedParts.year}-${parsedParts.month}-${parsedParts.day} ${parsedParts.hour}:${parsedParts.minute}:${parsedParts.second} ${parsedParts.offset}`;
    }
  }

  /**
   * Sets up this element to diplay current time and refresh regularly
   *
   * @param settings Settings container which is used for fetching selected time zone and element visibility
   */
  setup(settings: Settings) {
    this.updateDate(new Date(), settings.timeZone);
    // Update date every second
    setInterval(() => {
      this.updateDate(new Date(), settings.timeZone);
    }, 1000);

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "showDateAndTime") {
        // Immediately update visibility
        this.hidden = !settings.showDateAndTime;
      } else if (event.detail.field_changed == "timeZone") {
        this.updateDate(new Date(), settings.timeZone);
      }
    });
  }
}

customElements.define("date-time", DateTimeElement);
