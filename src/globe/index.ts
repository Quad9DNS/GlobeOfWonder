import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { Settings, SettingsChangedEvent } from "../settings";
import { AppState } from "../service/state";
import { GlobeLayerRegistry } from "./layer";
import { RotationLayer } from "./layers/rotation";
import { CoreMapLayer } from "./layers/coremap";
import { WindowResizeLayer } from "./layers/windowresize";
import { AnalysisModeLayer } from "./layers/analysismode";
import { AdministrativeBoundariesLayer } from "./layers/admboundaries";
import { ExplosionDataLayerGroup } from "./layers/explosiondata";
import { ExplosionsLayer } from "./layers/explosiondata/explosions";
import { HeatMapLayer } from "./layers/explosiondata/heatmap";
import { CustomObjectLayerGroup } from "./layers/customobject";
import { HoverTextObjectsLayer } from "./layers/hovertext";
import { LabeledObjectsLayer } from "./layers/labeled";
import { PointData } from "../data";
import { CirclesLayer, CirclesObjectProvider } from "./layers/circles";
import { PointersLayer, PointersObjectProvider } from "./layers/pointers";
import { BarsLayer, BarsObjectProvider } from "./layers/bars";
import {
  DownloadedObjectsProvider,
  DownloadedObjectsLayer,
} from "./layers/downloaded_objects";
import { ArcsLayer } from "./layers/arcs";
import { OpacityLayer } from "./layers/opacity";
import { DEFAULT_CAMERA_DISTANCE } from "../data/camera";
import { MouseEventsLayer } from "./layers/mouseevents";
import { GlobalZoomLayer } from "./layers/globalzoom";
import { AmbientLightLayer } from "./layers/ambientlight";
import { OrbitControlsLayer } from "./layers/orbitcontrols";
import { NewCameraPositionsLayer } from "./layers/newcamerapositions";

// Configures the registry
// WARN: All the layers should be added here!
const registry = new GlobeLayerRegistry();
for (const layer of [
  new CoreMapLayer(),
  new AmbientLightLayer(),
  new RotationLayer(),
  new NewCameraPositionsLayer(),
  new OrbitControlsLayer(),
  new WindowResizeLayer(),
  new MouseEventsLayer(),
  new AnalysisModeLayer(),
  new AdministrativeBoundariesLayer(),
  new ExplosionsLayer(),
  new CirclesObjectProvider(),
  new PointersObjectProvider(),
  new BarsObjectProvider(),
  new DownloadedObjectsProvider(),
  new ExplosionDataLayerGroup(),
  new HeatMapLayer(),
  new ArcsLayer(),
  new CustomObjectLayerGroup(),
  new HoverTextObjectsLayer(),
  new LabeledObjectsLayer(),
  new CirclesLayer(),
  new PointersLayer(),
  new BarsLayer(),
  new DownloadedObjectsLayer(),
  new OpacityLayer(),
  new GlobalZoomLayer(),
]) {
  registry.registerLayer(layer);
}

/**
 * Configures globe to render in the globeContainer, periodically consuming data from newPointsQueue to draw new points
 *
 * @param appContainer Main app container element
 * @param state shared app state with websocket data
 * @param settings Settings container which is used to configure rendering
 */
export function setupGlobe(
  appContainer: HTMLElement,
  state: AppState,
  settings: Settings,
) {
  const camera = new THREE.PerspectiveCamera();
  const globe: ThreeGlobe = new ThreeGlobe();

  const globeContainer = document.createElement("div");
  globeContainer.setAttribute("id", "globe-canvas");
  globeContainer.setAttribute("style", "width: 100%; height: 100vh;");
  appContainer.appendChild(globeContainer);

  registry.attachToState(state);

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    antialias: settings.antialiasingEnabled,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(settings.bgColor);
  globeContainer.appendChild(renderer.domElement);

  scene.add(globe);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  camera.position.z = DEFAULT_CAMERA_DISTANCE;

  registry.attachToGlobe(globe, camera, renderer);
  registry.attachToScene(scene, camera, renderer);
  registry.attachToSettings(settings);

  // Animation
  function animate() {
    registry.updateFrame(globe, settings);

    globe.setPointOfView(camera);
    renderer?.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  setInterval(() => {
    registry.preUpdate();

    state.newPointsQueue
      .splice(0, state.newPointsQueue.length)
      .forEach((p: PointData) => {
        registry.takeNewPoint(p);
      });

    registry.updateData(globe, settings);
  }, 200);

  renderer?.setClearColor(settings.bgColor);
  settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
    if (event.detail.field_changed == "bgColor") {
      renderer?.setClearColor(settings.bgColor);
    }
  });
}
