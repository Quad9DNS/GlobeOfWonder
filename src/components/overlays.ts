import { clamp } from "three/src/math/MathUtils.js";
import { registerDialogContainer } from ".";
import { boxesEqual, mapAndFilter } from "../data";
import { ExpirableObject } from "../data/expirable";
import { IndicatorData } from "../data/indicator";
import { TextboxData } from "../data/textbox";
import { AppState } from "../service/state";
import { Settings } from "../settings";

class IndicatorPair implements ExpirableObject {
  data: IndicatorData;
  element: HTMLElement;

  constructor(data: IndicatorData, element: HTMLElement) {
    this.data = data;
    this.element = element;
  }

  update(currentTime: number): ExpirableObject | null {
    const result = this.data.update(currentTime);
    if (result == null) {
      return null;
    } else {
      this.data = result;
      return this;
    }
  }
}

/**
 * Configures an overlay, periodically consuming data from newNonEventIndicatorsQueue to draw new overlays (indicators)
 *
 * @param appContainer Main app container element
 * @param state shared app state with websocket data
 * @param settings Settings container which is used to configure rendering
 */
export function setupOverlays(
  appContainer: HTMLElement,
  state: AppState,
  _settings: Settings,
) {
  const overlaysContainer = document.createElement("div");
  overlaysContainer.setAttribute("id", "overlays-container");
  overlaysContainer.setAttribute(
    "style",
    "pointer-events: none; position: fixed; width: 100%; height: 100%; top: 0; left:0; right: 0; bottom: 0;",
  );
  appContainer.appendChild(overlaysContainer);

  const indicators: IndicatorPair[] = [];

  setInterval(() => {
    mapAndFilter(indicators, {
      removedElementCallback: (indicator: IndicatorPair) => {
        indicator.element.remove();
      },
    });
    state.newNonEventIndicatorsQueue
      .splice(0, state.newNonEventIndicatorsQueue.length)
      .forEach((i: IndicatorData) => {
        if (i instanceof TextboxData) {
          const overlayContainer = registerDialogContainer(
            overlaysContainer,
            "textbox-test",
          );

          if (i.text == undefined) {
            const index = indicators.findIndex(
              (val) =>
                val.data instanceof TextboxData &&
                boxesEqual(val.data as TextboxData, i),
            );
            if (index !== -1) {
              indicators.splice(index, 1);
              return;
            }
          }

          indicators.push(new IndicatorPair(i, overlayContainer));
          const bottom = window.innerHeight - i.bottom;
          const right = window.innerWidth - i.right;
          let boxColor = "transparent";
          if (i.box_color) {
            boxColor = "#" + i.box_color.getHexString();
          }
          overlayContainer.innerHTML = `
          <div id="textbox" style="top: ${i.top}px; bottom: ${bottom}px; left: ${i.left}px; right: ${right}px; position: absolute; background-color: ${boxColor};">
          <p id="textboxText"></p>
          </div>
          `;

          const root = overlayContainer.children[0] as HTMLElement;

          if (i.link_url != undefined) {
            root.style.pointerEvents = "auto";
            root.style.cursor = "pointer";
            root.addEventListener("click", () => {
              window.open(
                i.link_url,
                i.new_window === false ? "_self" : "_blank",
              );
            });
          }

          if (i.box_opacity != undefined) {
            root.style.opacity = `${i.box_opacity}%`;
          }

          if (i.box_corner_radius != undefined) {
            root.style.borderRadius = `${i.box_corner_radius}px`;
          }

          if (i.border_color != undefined) {
            root.style.borderStyle = "solid";
            if (i.border_opacity != undefined) {
              root.style.borderColor =
                "#" +
                i.border_color.getHexString() +
                (i.border_opacity * 2.55).toString(16);
            } else {
              root.style.borderColor = "#" + i.border_color.getHexString();
            }
            if (i.border_thickness != undefined) {
              root.style.borderWidth = `${i.border_thickness}px`;
            }
          }

          const textElement =
            overlayContainer.querySelector<HTMLElement>("#textboxText")!;
          // TODO: support for bold, italic spans
          textElement.textContent = i.text!;
          if (!i.scroll_direction) {
            textElement.style.whiteSpace = "pre";
          }
          const font = i.text_font ?? "Quad9Sans";
          const fontSize = i.text_font_size ?? 24;
          let fontStyle = i.text_font_style ?? "";
          if (fontStyle.includes("underline")) {
            fontStyle = fontStyle.replace("underline", "");
            textElement.style.textDecoration = "underline";
          }
          const fontSpec = `${fontStyle} ${fontSize}px ${font}`;
          textElement.style.font = fontSpec;
          if (i.text_opacity != undefined) {
            textElement.style.opacity = `${i.text_opacity}%`;
          }

          if (i.scroll_direction) {
            textElement.style.display = "inline-block";
            textElement.parentElement!.style.overflow = "hidden";
            // This is just an approximation - we don't measure the text really
            const speed =
              (i.text?.length ?? 50) / clamp(i.scroll_speed ?? 3, 1, 10);
            switch (i.scroll_direction) {
              case "rtl":
                textElement.style.paddingLeft = "100%";
                textElement.style.whiteSpace = "nowrap";
                textElement.style.animation = `scrollrl ${speed}s linear infinite`;
                break;
              case "ltr":
                textElement.style.translate = "-100%";
                textElement.style.paddingLeft = "100%";
                textElement.style.whiteSpace = "nowrap";
                textElement.style.animation = `scrolllr ${speed}s linear infinite`;
                break;
              case "btt":
                textElement.style.paddingTop = "100%";
                textElement.style.animation = `scrollbt ${speed}s linear infinite`;
                break;
              case "ttb":
                textElement.style.translate = "0 -100%";
                textElement.style.paddingTop = "100%";
                textElement.style.animation = `scrolltb ${speed}s linear infinite`;
                break;
            }
          }

          overlayContainer.hidden = !i.visible();
        }
      });
  }, 200);

  function animate() {
    indicators.forEach((i: IndicatorPair) => {
      i.element.hidden = !i.data.visible();
    });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  function onWindowResize() {
    indicators.forEach((i: IndicatorPair) => {
      if (i.data instanceof TextboxData) {
        const data = i.data as TextboxData;
        const root = i.element.children[0] as HTMLElement;
        const bottom = window.innerHeight - data.bottom;
        const right = window.innerWidth - data.right;
        root.style.bottom = `${bottom}px`;
        root.style.right = `${right}px`;
      }
    });
  }
  window.addEventListener("resize", onWindowResize);
}
