import { Settings } from "../settings";
import { AppState, GraphEvent } from "./state";

export interface Subscription {
  callbackfn: (points: Map<number, number>) => void;
  graph: string;
}

interface GraphConfig {
  bucket_size: number;
}

const graphEvents: Map<
  string,
  [GraphConfig, GraphEvent[], Map<number, number>]
> = new Map();
const subscriptions: Map<string, Subscription[]> = new Map();

export function setupGraphService(state: AppState, settings: Settings) {
  setInterval(() => {
    updateEvents(state.newGraphEventsQueue);
  }, settings.eventCountersUpdateInterval);
}

function updateEvents(newEventsQueue: GraphEvent[]) {
  const modified = new Set();
  newEventsQueue.splice(0, newEventsQueue.length).forEach((e: GraphEvent) => {
    e.graphs.forEach((g: string) => {
      modified.add(g);
      const grp = graphEvents.get(g);
      if (grp !== undefined) {
        const [conf, events, points] = grp;
        events.push(e);
        const bucket =
          Math.floor(e.startTime / conf.bucket_size) * conf.bucket_size;
        const current = points.get(bucket) ?? 0;
        points.set(bucket, current + e.count);
      }
    });
  });
  for (const graph of modified) {
    const grp = graphEvents.get(graph);
    subscriptions.get(graph)?.forEach((s: Subscription) => {
      if (grp !== undefined) {
        const [_conf, _events, points] = grp;
        s.callbackfn(points);
      }
    });
  }
}

export function subscribeToGraph(
  graph: string,
  config: GraphConfig,
  callbackfn: (points: Map<number, number>) => void,
): Subscription {
  if (!graphEvents.has(graph)) {
    graphEvents.set(graph, [config, [], new Map()]);
  } else {
    const [_conf, events, _points] = graphEvents.get(graph)!;
    // Recalculate points for new config
    const points = new Map();
    for (const event of events) {
      const bucket =
        Math.floor(event.startTime / config.bucket_size) * config.bucket_size;
      const current = points.get(bucket) ?? 0;
      points.set(bucket, current + event.count);
    }
    graphEvents.set(graph, [config, events, points]);
  }
  if (!subscriptions.has(graph)) {
    subscriptions.set(graph, []);
  }
  const subscription = {
    callbackfn: callbackfn,
    graph: graph,
  };
  subscriptions.get(graph)?.push(subscription);
  const grp = graphEvents.get(graph);
  if (grp !== undefined) {
    const [_conf, _events, points] = grp;
    callbackfn(points);
  }
  return subscription;
}

export function unsubscribeFromGraph(subscription: Subscription) {
  const res = subscriptions.get(subscription.graph);
  if (res !== undefined) {
    const index = res.indexOf(subscription);
    if (index !== -1) {
      res.splice(index, 1);
    }
  }
}
