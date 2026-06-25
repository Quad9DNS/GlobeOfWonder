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
import { QUAD9_COLOR } from "../globe/common";

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
          const index = indicators.findIndex(
            (val) =>
              val.data instanceof TextboxData &&
              boxesEqual(val.data as TextboxData, i),
          );
          if (index !== -1) {
            indicators.splice(index, 1);
            if (i.text == undefined) {
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
          const index = indicators.findIndex(
            (val) =>
              val.data instanceof GraphData &&
              boxesEqual(val.data as GraphData, i),
          );
          if (index !== -1) {
            const removed = indicators.splice(index, 1);
            if (removed.length > 0) {
              const removed_i = removed[0];
              if (removed_i.data instanceof GraphData) {
                if (removed_i.data.subscription !== undefined) {
                  unsubscribeFromGraph(removed_i.data.subscription);
                }
              }
            }
          }
          if (i.name == undefined) {
            return;
          }

          const root = overlayContainer.children[0] as HTMLElement;
          const svg = d3
            .create("svg")
            .attr("width", i.right - i.left)
            .attr("height", i.bottom - i.top);

          let x = d3.scaleTime().range([0, i.right - i.left - 31]);
          let y = d3.scaleLinear().range([i.bottom - i.top - 30, 0]);

          const build_axes = function (x, y) {
            let yAxisCall = d3
              .axisLeft(y)
              .ticks(i.graph_y_segments !== undefined ? i.graph_y_segments : 10)
              .tickFormat((val: number) => {
                if (val >= 1e9) {
                  return `${(val / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
                } else if (val >= 1e6) {
                  return `${(val / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
                } else if (val >= 1e3) {
                  return `${(val / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
                } else {
                  return val.toLocaleString();
                }
              });
            let xAxisCall = d3
              .axisBottom(x)
              .ticks(d3.timeSecond.every(i.graph_interval_duration ?? 60)!);

            if (i.graph_x_axis_labels_visible === false) {
              xAxisCall = xAxisCall.tickFormat((_v, _i) => "");
            }
            if (i.graph_y_axis_labels_visible === false) {
              yAxisCall = yAxisCall.tickFormat((_v, _i) => "");
            }

            return [xAxisCall, yAxisCall];
          };

          const [xAxisCall, yAxisCall] = build_axes(x, y);

          const gy = svg
            .append("g")
            .attr("class", "yAxis")
            .attr("transform", `translate(30, 0)`)
            .attr("width", i.right - i.left - 31)
            .attr("height", i.bottom - i.top - 30)
            .call(yAxisCall);

          if (i.graph_y_axis_font !== undefined) {
            gy.attr("font-family", i.graph_y_axis_font);
          }
          if (i.graph_y_axis_font_size !== undefined) {
            gy.attr("font-size", i.graph_y_axis_font_size);
          }
          if (i.graph_y_axis_font_style !== undefined) {
            gy.attr("font-style", i.graph_y_axis_font_style);
          }
          const gx = svg
            .append("g")
            .attr("class", "xAxis")
            .attr("transform", `translate(30, ${i.bottom - i.top - 30})`)
            .attr("width", i.right - i.left - 31)
            .attr("height", i.bottom - i.top - 30)
            .call(xAxisCall);
          if (i.graph_x_axis_font !== undefined) {
            gx.attr("font-family", i.graph_x_axis_font);
          }
          if (i.graph_x_axis_font_size !== undefined) {
            gx.attr("font-size", i.graph_x_axis_font_size);
          }
          if (i.graph_x_axis_font_style !== undefined) {
            gx.attr("font-style", i.graph_x_axis_font_style);
          }

          svg
            .append("clipPath")
            .attr("id", "chart-area")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", i.right - i.left)
            .attr("height", i.bottom - i.top - 30);

          const line_color =
            "#" + (i.graph_line_color ?? QUAD9_COLOR).getHexString();
          const path = svg
            .append("path")
            .attr("clip-path", "url(#chart-area)")
            .attr("fill", i.graph_filled ? line_color : "none")
            .attr("stroke", line_color)
            .attr("stroke-width", i.graph_line_width ?? 1)
            .attr("margin-left", `30`)
            .attr("transform", `translate(30, 0)`);

          root.appendChild(svg.node()!);

          const bucket_size = 1000 * (i.graph_interval_duration ?? 60);
          subscribeToGraph(
            i.name,
            { bucket_size: bucket_size, bucket_count: i.graph_intervals },
            (points: Map<number, number>) => {
              x = x.domain(
                i.graph_intervals !== undefined
                  ? [
                      Math.floor(
                        Math.floor(
                          (Date.now() -
                            i.graph_intervals! *
                              (i.graph_interval_duration ?? 60) *
                              1000) /
                            bucket_size,
                        ) * bucket_size,
                      ),
                      Math.floor(
                        Math.floor(Date.now() / bucket_size) * bucket_size,
                      ),
                    ]
                  : d3.extent(points.entries(), function ([time, _val]) {
                      return time;
                    }),
              );
              const y_max =
                d3.max(points.entries(), function ([_time, val]) {
                  return val;
                }) ?? 0;
              y = y.domain([
                i.graph_y_min !== undefined ? i.graph_y_min : 0,
                i.graph_y_max !== undefined ? i.graph_y_max : y_max,
              ]);

              const [xAxisCall, yAxisCall] = build_axes(x, y);
              if (i.graph_transition_duration !== undefined) {
                gx.transition()
                  .duration(i.graph_transition_duration)
                  .call(xAxisCall);
                gy.transition()
                  .duration(i.graph_transition_duration)
                  .call(yAxisCall);
              } else {
                gx.call(xAxisCall);
                gy.call(yAxisCall);
              }

              let datum = function* () {
                yield* [...points.entries()].sort();
              };
              if (i.graph_filled) {
                const last = Math.max(...points.keys());
                const first = Math.min(...points.keys());
                datum = function* () {
                  yield* [...points.entries()].sort();
                  yield [last, 0];
                  yield [first, 0];
                };
              }
              const path_d = path.datum(datum);
              if (i.graph_transition_duration !== undefined) {
                path_d
                  .transition()
                  .duration(i.graph_transition_duration)
                  .attr(
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
              } else {
                path_d.attr(
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
              }

              if (i.grid_enabled) {
                let color = i.grid_color?.getHexString();
                if (color === undefined) {
                  color = "#ffffffcf";
                } else {
                  color = "#" + color + "cf";
                }
                d3.selectAll("g.tick line.gridline").remove();
                const ygrid = d3
                  .selectAll("g.yAxis g.tick")
                  .append("line")
                  .attr("class", "gridline")
                  .attr("x1", 0)
                  .attr("y1", 0)
                  .attr("x2", i.right - i.left)
                  .attr("y2", 0)
                  .attr("stroke", color);

                const xgrid = d3
                  .selectAll("g.xAxis g.tick")
                  .append("line")
                  .attr("class", "gridline")
                  .attr("x1", 0)
                  .attr("y1", -(i.bottom - i.top))
                  .attr("x2", 0)
                  .attr("y2", 0)
                  .attr("stroke", color);

                switch (i.grid_style) {
                  case "solid":
                    break;
                  case "dashed_large":
                    ygrid.attr("stroke-dasharray", "8 4");
                    xgrid.attr("stroke-dasharray", "8 4");
                    break;
                  case "dashed_small":
                    ygrid.attr("stroke-dasharray", "4");
                    xgrid.attr("stroke-dasharray", "4");
                    break;
                  case "dots":
                    ygrid.attr("stroke-dasharray", "1");
                    xgrid.attr("stroke-dasharray", "1");
                    break;
                }
              }
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
