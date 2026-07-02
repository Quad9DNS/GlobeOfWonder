import { Settings } from "../settings";
import { AppState, GraphEvent } from "./state";

export interface Subscription {
  callbackfn: (points: Map<number, number>, removedOld: boolean) => void;
  graph: string;
  done: boolean;
}

interface GraphConfig {
  bucket_size: number;
  bucket_count?: number;
}

const graphEvents: Map<string, [GraphConfig, Map<number, number>]> = new Map();
const subscriptions: Map<string, Subscription[]> = new Map();

export function setupGraphService(state: AppState, settings: Settings) {
  setInterval(() => {
    updateEvents(state.newGraphEventsQueue);
  }, settings.eventCountersUpdateInterval);
}

function updateEvents(newEventsQueue: GraphEvent[]) {
  newEventsQueue.splice(0, newEventsQueue.length).forEach((e: GraphEvent) => {
    e.graphs.forEach((g: string) => {
      const grp = graphEvents.get(g);
      if (grp !== undefined) {
        const [conf, points] = grp;
        const bucket = Math.floor(
          Math.floor(e.startTime / conf.bucket_size) * conf.bucket_size,
        );
        const current = points.get(bucket) ?? 0;
        points.set(bucket, current + e.count);
      }
    });
  });
}

export function subscribeToGraph(
  graph: string,
  config: GraphConfig,
  callbackfn: (points: Map<number, number>, removedOld: boolean) => void,
): Subscription {
  if (!graphEvents.has(graph)) {
    graphEvents.set(graph, [config, new Map()]);
  }
  if (!subscriptions.has(graph)) {
    subscriptions.set(graph, []);
  }
  const subscription = {
    callbackfn: callbackfn,
    graph: graph,
    done: false,
  };
  function callback_loop() {
    const grp = graphEvents.get(graph);
    if (grp !== undefined) {
      const [conf, points] = grp;
      let remove = false;
      if (conf.bucket_count !== undefined) {
        const currentTime = Date.now();
        const toRemove = new Set<number>();
        for (const time of points.keys()) {
          // Removing only when sufficient items to be removed are there, to prevent too many graph updates
          if (
            time <
            Math.floor(
              (Math.floor(currentTime / conf.bucket_size) -
                conf.bucket_count * 2) *
                conf.bucket_size,
            )
          ) {
            remove = true;
          }
          if (
            time <
            Math.floor(
              (Math.floor(currentTime / conf.bucket_size) - conf.bucket_count) *
                conf.bucket_size,
            )
          ) {
            toRemove.add(time);
          }
        }
        if (remove) {
          for (const time of toRemove) {
            points.delete(time);
          }
        }
      }
      callbackfn(points, remove);
    }
    if (!subscription.done) {
      setTimeout(
        () => {
          callback_loop();
        },
        Math.ceil(
          Math.ceil(Date.now() / config.bucket_size) * config.bucket_size,
        ) - Date.now(),
      );
    }
  }
  setTimeout(
    () => {
      callback_loop();
    },
    Math.ceil(Math.ceil(Date.now() / config.bucket_size) * config.bucket_size) -
      Date.now(),
  );
  subscriptions.get(graph)?.push(subscription);
  const grp = graphEvents.get(graph);
  if (grp !== undefined) {
    const [_conf, points] = grp;
    callbackfn(points, false);
  }
  return subscription;
}

export function unsubscribeFromGraph(subscription: Subscription) {
  const res = subscriptions.get(subscription.graph);
  if (res !== undefined) {
    const index = res.indexOf(subscription);
    if (index !== -1) {
      subscription.done = true;
      res.splice(index, 1);
    }
  }
}
