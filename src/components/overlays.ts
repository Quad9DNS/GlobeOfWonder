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
import { Settings, SettingsChangedEvent } from "../settings";
import { GraphData } from "../data/graph";
import { subscribeToGraph, unsubscribeFromGraph } from "../service/graph";
import * as d3 from "d3";
import * as THREE from "three";
import { QUAD9_COLOR } from "../globe/common";
import QuestionMark from "../question_mark.svg?url";
import QuestionMarkDark from "../question_mark_dark.svg?url";
import { registerInfoDialog } from "./info_dialog";

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
  settings: Settings,
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
          <div id="overlaybox" style="top: ${i.top}px; bottom: ${bottom}px; left: ${i.left}px; right: ${right}px; position: absolute;">
            <div id="overlayboxbg" style="height: ${i.bottom - i.top}px; width: ${i.right - i.left}px; position: absolute; z-index: -1; background-color: ${boxColor};">
            </div>
          </div>
          `;

          const root = overlayContainer.children[0] as HTMLElement;
          const box_bg = root.children[0] as HTMLElement;
          if (isBoxBorderData(i)) {
            if (i.box_opacity != undefined) {
              box_bg.style.opacity = `${i.box_opacity}%`;
            }

            if (i.box_corner_radius != undefined) {
              box_bg.style.borderRadius = `${i.box_corner_radius}px`;
            }

            if (i.border_color != undefined) {
              box_bg.style.borderStyle = "solid";
              if (i.border_opacity != undefined) {
                box_bg.style.borderColor =
                  "#" +
                  i.border_color.getHexString() +
                  (i.border_opacity * 2.55).toString(16);
              } else {
                box_bg.style.borderColor = "#" + i.border_color.getHexString();
              }
              if (i.border_thickness != undefined) {
                box_bg.style.borderWidth = `${i.border_thickness}px`;
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
            const indicator = indicators.splice(index, 1)[0];
            indicator.element.remove();
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
            const removed = indicators.splice(index, 1)[0];
            removed.element.remove();
            if (removed.data instanceof GraphData) {
              if (removed.data.subscription !== undefined) {
                unsubscribeFromGraph(removed.data.subscription);
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

          const label = i.graph_label;
          let label_placement = undefined;

          if (label !== undefined) {
            switch (i.graph_label_placement) {
              case "bottom":
              case "left":
              case "right":
              case "top":
                label_placement = i.graph_label_placement;
                break;
              default:
                label_placement = "top";
            }
          }

          let y_margin =
            i.graph_x_axis_font_size !== undefined
              ? i.graph_x_axis_font_size + 20
              : 30;
          let x_margin = 30;

          if (i.graph_y_axis_font_size !== undefined) {
            const bitmap = document.createElement("canvas");
            const g = bitmap.getContext("2d")!;
            const fontSize = i.graph_y_axis_font_size ?? 24;
            const text = "888M";
            const font = i.graph_y_axis_font ?? "Quad9Sans";
            const fontStyle = i.graph_y_axis_font_style ?? "";
            const fontSpec = fontStyle + " " + fontSize + "px " + font;
            g.font = fontSpec;
            x_margin = g.measureText(text).width + 20;
          }

          let label_margin = 30;
          if (i.graph_label_font_size !== undefined) {
            const bitmap = document.createElement("canvas");
            const g = bitmap.getContext("2d")!;
            const fontSize = i.graph_label_font_size ?? 24;
            const text = "888M";
            const font = i.graph_label_font ?? "Quad9Sans";
            const fontStyle = i.graph_label_font_style ?? "";
            const fontSpec = fontStyle + " " + fontSize + "px " + font;
            g.font = fontSpec;
            label_margin = g.measureText(text).width + 20;
          }

          if (i.graph_x_axis_label !== undefined) {
            y_margin += y_margin + 10;
          }
          if (i.graph_y_axis_label !== undefined) {
            x_margin += x_margin + 10;
          }
          if (label_placement == "bottom") {
            y_margin += label_margin + 10;
          }
          if (label_placement == "right") {
            x_margin += label_margin + 10;
          }

          let x = d3
            .scaleTime()
            .range([0, i.right - i.left - 2 * x_margin - 1]);
          let y = d3.scaleLinear().range([i.bottom - i.top - 2 * y_margin, 0]);

          const build_axes = function (
            x: d3.ScaleTime<number, number, never>,
            y: d3.ScaleLinear<number, number, never>,
          ) {
            let yAxisCall = d3
              .axisLeft(y)
              .ticks(i.graph_y_segments !== undefined ? i.graph_y_segments : 10)
              .tickFormat((val: d3.NumberValue) => {
                const value = val.valueOf();
                if (value >= 1e9) {
                  return `${(value / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
                } else if (value >= 1e6) {
                  return `${(value / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
                } else if (value >= 1e3) {
                  return `${(value / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
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
            .attr("transform", `translate(${x_margin}, ${y_margin})`)
            .attr("width", i.right - i.left - 2 * x_margin - 1)
            .attr("height", i.bottom - i.top - 2 * y_margin)
            .call(yAxisCall);

          applyGraphFontStyle(
            gy,
            i.graph_y_axis_font,
            i.graph_y_axis_font_size,
            i.graph_y_axis_font_style,
            undefined,
          );

          if (i.graph_y_axis_label !== undefined) {
            const ylabel = svg
              .append("text")
              .attr("class", "ylabel")
              .attr("text-anchor", "middle")
              .attr("x", -(i.bottom - i.top) / 2)
              .attr("y", x_margin / (label_placement == "left" ? 3 : 2))
              .attr("width", i.bottom - i.top - 2 * y_margin)
              .attr("transform", "rotate(-90)")
              .text(i.graph_y_axis_label);

            applyGraphFontStyle(
              ylabel,
              i.graph_y_axis_font,
              i.graph_y_axis_font_size,
              i.graph_y_axis_font_style,
              i.graph_y_axis_font_color,
            );
          }

          const gx = svg
            .append("g")
            .attr("class", "xAxis")
            .attr(
              "transform",
              `translate(${x_margin}, ${i.bottom - i.top - y_margin})`,
            )
            .attr("width", i.right - i.left - 2 * x_margin - 1)
            .attr("height", i.bottom - i.top - 2 * y_margin)
            .call(xAxisCall);
          applyGraphFontStyle(
            gx,
            i.graph_x_axis_font,
            i.graph_x_axis_font_size,
            i.graph_x_axis_font_style,
            undefined,
          );

          if (i.graph_x_axis_label !== undefined) {
            const xlabel = svg
              .append("text")
              .attr("class", "xlabel")
              .attr("text-anchor", "middle")
              .attr("x", (i.right - i.left) / 2)
              .attr(
                "y",
                i.bottom -
                  i.top -
                  y_margin / (label_placement == "bottom" ? 1.5 : 2) +
                  10,
              )
              .attr("width", i.right - i.left - 2 * x_margin)
              .text(i.graph_x_axis_label);
            applyGraphFontStyle(
              xlabel,
              i.graph_x_axis_font,
              i.graph_x_axis_font_size,
              i.graph_x_axis_font_style,
              i.graph_x_axis_font_color ?? new THREE.Color("white"),
            );
          }

          if (label !== undefined) {
            const aligment = i.graph_label_alignment ?? "middle";
            const graphlabel = svg
              .append("text")
              .attr("class", "graphlabel")
              .attr("text-anchor", aligment)
              .text(label);
            switch (label_placement) {
              case "top":
              case "bottom":
                graphlabel.attr("width", i.right - i.left - 2 * x_margin);
                switch (aligment) {
                  case "start":
                    graphlabel.attr("x", x_margin);
                    break;
                  case "middle":
                    graphlabel.attr("x", (i.right - i.left) / 2);
                    break;
                  case "end":
                    graphlabel.attr("x", i.right - i.left - x_margin);
                }
                break;
              case "left":
              case "right":
                graphlabel
                  .attr("width", i.bottom - i.top - 2 * y_margin)
                  .attr("y", x_margin / 2);
                switch (aligment) {
                  case "start":
                    graphlabel.attr("x", y_margin);
                    break;
                  case "middle":
                    graphlabel.attr("x", (i.bottom - i.top) / 2);
                    break;
                  case "end":
                    graphlabel.attr("x", i.bottom - i.top - y_margin);
                }
            }
            switch (label_placement) {
              case "top":
                graphlabel.attr("y", label_margin);
                break;
              case "bottom":
                graphlabel.attr("y", i.bottom - i.top - label_margin);
                break;
              case "left":
                graphlabel
                  .attr("y", label_margin)
                  .attr("transform", "rotate(-90)");
                break;
              case "right":
                graphlabel
                  .attr("y", -(i.right - i.left - label_margin))
                  .attr("transform", "rotate(90)");
                break;
            }
            applyGraphFontStyle(
              graphlabel,
              i.graph_label_font,
              i.graph_label_font_size,
              i.graph_label_font_style,
              i.graph_label_font_color,
            );
          }

          svg
            .append("clipPath")
            .attr("id", "chart-area")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", i.right - i.left - 2 * x_margin)
            .attr("height", i.bottom - i.top - 2 * y_margin);

          const line_color =
            "#" + (i.graph_line_color ?? QUAD9_COLOR).getHexString();
          const path = svg
            .append("path")
            .attr("clip-path", "url(#chart-area)")
            .attr("fill", i.graph_filled ? line_color : "none")
            .attr("stroke", line_color)
            .attr("stroke-width", i.graph_line_width ?? 1)
            .attr("margin-left", `${x_margin}`)
            .attr("transform", `translate(${x_margin}, ${y_margin})`);

          root.appendChild(svg.node()!);

          if (i.graph_help_text !== undefined) {
            const questionMarkIcon = settings.lightMode
              ? QuestionMarkDark
              : QuestionMark;
            root.insertAdjacentHTML(
              "beforeend",
              `<input class="graphinfobutton" type = "image" src = "${questionMarkIcon}" width = '15' style = "display: inline; position: absolute; top: 10px; right: 10px" />`,
            );
            const infoButton =
              root.querySelector<HTMLInputElement>(".graphinfobutton")!;
            infoButton.style.pointerEvents = "auto";
            infoButton.style.cursor = "pointer";
            const containerId = i.name + "info-dialog";
            registerInfoDialog(
              appContainer,
              containerId,
              infoButton,
              i.graph_help_text,
            );
            settings.addChangedListener(
              (event: CustomEvent<SettingsChangedEvent>) => {
                if (event.detail.field_changed == "lightMode") {
                  infoButton.src = settings.lightMode
                    ? QuestionMarkDark
                    : QuestionMark;
                }
              },
            );
          }

          const bucket_size = 1000 * (i.graph_interval_duration ?? 60);
          subscribeToGraph(
            i.name,
            { bucket_size: bucket_size, bucket_count: i.graph_intervals },
            (points: Map<number, number>, removedOld: boolean) => {
              let x_extent = [0, 0];
              if (i.graph_intervals !== undefined) {
                x_extent = [
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
                ];
              } else {
                const calculated_extent = d3.extent(
                  points.entries(),
                  function ([time, _val]) {
                    return time;
                  },
                );
                if (calculated_extent[0] !== undefined) {
                  x_extent = calculated_extent;
                }
              }
              x = x.domain(x_extent);
              let y_extent = d3.extent(
                points.entries(),
                function ([_time, val]) {
                  return val;
                },
              );
              if (y_extent[0] === undefined) {
                y_extent = [0, 0];
              }

              y = y.domain([
                i.graph_y_min !== undefined ? i.graph_y_min : y_extent[0],
                i.graph_y_max !== undefined ? i.graph_y_max : y_extent[1],
              ]);

              const [xAxisCall, yAxisCall] = build_axes(x, y);
              if (i.graph_transition_duration !== undefined && !removedOld) {
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

              if (i.graph_y_axis_font_color !== undefined) {
                gy.selectAll("text").style(
                  "stroke",
                  "#" + i.graph_y_axis_font_color.getHexString(),
                );
              }
              if (i.graph_y_axis_color !== undefined) {
                gy.selectAll("path").style(
                  "stroke",
                  "#" + i.graph_y_axis_color.getHexString(),
                );
                gy.selectAll("line").style(
                  "stroke",
                  "#" + i.graph_y_axis_color.getHexString(),
                );
              }
              if (i.graph_x_axis_font_color !== undefined) {
                gx.selectAll("text").style(
                  "stroke",
                  "#" + i.graph_x_axis_font_color.getHexString(),
                );
              }
              if (i.graph_x_axis_color !== undefined) {
                gx.selectAll("path").style(
                  "stroke",
                  "#" + i.graph_x_axis_color.getHexString(),
                );
                gx.selectAll("line").style(
                  "stroke",
                  "#" + i.graph_x_axis_color.getHexString(),
                );
              }

              let original_points: [number, number][] = [];

              if (i.graph_missing_point_value !== undefined) {
                for (
                  let x = x_extent[0];
                  x <= x_extent[1];
                  x += 1000 * (i.graph_interval_duration ?? 60)
                ) {
                  original_points.push([
                    x,
                    points.get(x) ?? i.graph_missing_point_value,
                  ]);
                }
              } else {
                original_points = [...points.entries()];
              }
              original_points.sort();

              let datum = function* () {
                yield* original_points;
              };
              if (i.graph_filled) {
                const last = Math.max(...points.keys());
                const first = Math.min(...points.keys());
                datum = function* () {
                  yield* original_points;
                  yield [last, 0];
                  yield [first, 0];
                };
              }
              const path_d = path.datum(datum);
              // Disable transitions when removing old points, to prevent weird animations
              if (i.graph_transition_duration !== undefined && !removedOld) {
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
                  .attr("x2", i.right - i.left - 2 * x_margin)
                  .attr("y2", 0)
                  .attr("stroke", color);

                const xgrid = d3
                  .selectAll("g.xAxis g.tick")
                  .append("line")
                  .attr("class", "gridline")
                  .attr("x1", 0)
                  .attr("y1", -(i.bottom - i.top - 2 * y_margin))
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

function applyGraphFontStyle<E extends SVGElement>(
  element: d3.Selection<E, undefined, null, undefined>,
  font?: string,
  size?: number,
  style?: string,
  color?: THREE.Color,
) {
  if (font !== undefined) {
    element.attr("font-family", font);
  }
  if (size !== undefined) {
    element.attr("font-size", size);
  }
  if (style !== undefined) {
    element.attr("font-style", style);
  }
  if (color !== undefined) {
    element.style("stroke", "#" + color.getHexString());
  }
}
