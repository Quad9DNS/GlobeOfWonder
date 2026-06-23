import { clamp } from "three/src/math/MathUtils.js";
import { registerDialogContainer } from ".";
import {
  boxesEqual,
  isBoundingBoxData,
  isBoxBorderData,
  mapAndFilter,
} from "../data";
import { ExpirableObject } from "../data/expirable";
import { IndicatorData } from "../data/indicator";
import { TextboxData } from "../data/textbox";
import { AppState } from "../service/state";
import { Settings } from "../settings";
import { GraphData } from "../data/graph";
import { subscribeToGraph, unsubscribeFromGraph } from "../service/graph";
import * as d3 from "d3";

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
        const overlayId = typeof i + "-overlay";
        const overlayContainer = registerDialogContainer(
          overlaysContainer,
          overlayId,
        );

        if (isBoundingBoxData(i)) {
          const bottom = window.innerHeight - i.bottom;
          const right = window.innerWidth - i.right;
          let boxColor = "transparent";
          if (isBoxBorderData(i) && i.box_color) {
            boxColor = "#" + i.box_color.getHexString();
          }
          overlayContainer.innerHTML = `
          <div id="overlaybox" style="top: ${i.top}px; bottom: ${bottom}px; left: ${i.left}px; right: ${right}px; position: absolute; background-color: ${boxColor};">
          </div>
          `;

          const root = overlayContainer.children[0] as HTMLElement;
          if (isBoxBorderData(i)) {
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
          }
        }

        if (i instanceof TextboxData) {
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

          root.innerHTML = `
          <p id="textboxText"></p>
          `;
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
        } else if (i instanceof GraphData) {
          if (i.name == undefined) {
            const index = indicators.findIndex(
              (val) =>
                val.data instanceof GraphData &&
                boxesEqual(val.data as GraphData, i),
            );
            if (index !== -1) {
              indicators.splice(index, 1);
              if (i.subscription !== undefined) {
                unsubscribeFromGraph(i.subscription);
              }
            }
            return;
          }

          const root = overlayContainer.children[0] as HTMLElement;
          const svg = d3
            .create("svg")
            .attr("width", i.right - i.left)
            .attr("height", i.bottom - i.top);

          let x = d3.scaleTime().range([0, i.right - i.left - 31]);
          let y = d3.scaleLinear().range([i.bottom - i.top - 30, 0]);

          const gy = svg
            .append("g")
            .attr("transform", `translate(30, 0)`)
            .attr("height", i.bottom - i.top - 30)
            .call(d3.axisLeft(y));
          const gx = svg
            .append("g")
            .attr("transform", `translate(30, ${i.bottom - i.top - 30})`)
            .attr("width", i.right - i.left - 31)
            .call(d3.axisBottom(x).ticks(d3.timeSecond.every(10)!));

          const path = svg
            .append("path")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("transform", `translate(30, )`);

          root.appendChild(svg.node()!);

          subscribeToGraph(
            i.name,
            { bucket_size: 1000 * 10 },
            (points: Map<number, number>) => {
              x = x.domain(
                d3.extent(points.entries(), function ([time, _val]) {
                  return time;
                }),
              );
              gx.transition()
                .duration(500)
                .call(d3.axisBottom(x).ticks(d3.timeSecond.every(10)!));
              y = y.domain([
                0,
                d3.max(points.entries(), function ([_time, val]) {
                  return val;
                }),
              ]);
              gy.transition().duration(500).call(d3.axisLeft(y));
              path.datum(points.entries()).attr(
                "d",
                d3.line(
                  function ([time, _val]: [number, number]) {
                    return x(time);
                  },
                  function ([_time, val]: [number, number]) {
                    return y(val);
                  },
                ),
              );
            },
          );
        }

        overlayContainer.hidden = !i.visible();
        indicators.push(new IndicatorPair(i, overlayContainer));
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
      if (isBoundingBoxData(i.data)) {
        const root = i.element.children[0] as HTMLElement;
        const bottom = window.innerHeight - i.data.bottom;
        const right = window.innerWidth - i.data.right;
        root.style.bottom = `${bottom}px`;
        root.style.right = `${right}px`;
      }
    });
  }
  window.addEventListener("resize", onWindowResize);
}
