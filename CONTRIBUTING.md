# Contributing

First, thank you for contributing! The goal of this document is to provide everything you need to start contributing to Globe of Wonder.

- [Quick start](#quick-start)
- [Your First Contribution](#your-first-contribution)
  - [New layers](#new-layers)
    - [New custom object layer](#new-custom-object-layer)
    - [New three globe layer](#new-three-globe-layer)
    - [New scene layer](#scene-modifying-layer)
  - [New data types](#new-data-types)
  - [New settings](#new-settings)
  - [New data source](#new-data-source)
- [Testing](#testing)

## Quick start

- Ensure you have Node installed (tested with v23.9.0, but older should be fine too)
- Install npm packages using `npm install`
- Run development server using `npm run dev`

## Your First Contribution

1. For large PRs or for breaking changes, ensure your change has an issue! Find an
   existing issue or open a new issue.
2. Once approved, fork the repository in your own GitHub account.
3. Create a new Git branch.
4. Make your changes.
5. Ensure the project builds successfully (`npm run build`) and also run the linter (`npm run lint` and `npm run lint:fix` to automatically fix some of the issues). *(optional - this will be run in CI too)*
6. Submit a pull request to the main repository.

### New layers

If you wish to add a new layer to the globe, first check out [the available hooks](./src/globe/layer.ts). Since the project depends on [three-globe](https://www.npmjs.com/package/three-globe), make sure you understand the available layers there. Most Globe of Wonder layers depend on [custom layer](https://www.npmjs.com/package/three-globe#custom-layer), for which [custom layer hooks](./src/globe/layers/customobject.ts) are provided. Make sure you understand which layers are currently occupied by other layers in the project - all layers are added to the registry in [main globe configuration](./src/globe/index.ts).

For example, [AnalysisModeLayer](./src/globe/layers/analysismode.ts) takes up [Hex Bin layer](https://www.npmjs.com/package/three-globe#hex-bin-layer). If another layer needs access to hex bins, there should first be a layer group provided, similar to how there is a [layer group for custom objects](./src/globe/layers/customobject.ts).

Checklist:
- [ ] How does this layer interact with the globe?
  - [ ] [New custom object defined by lat/lon?](#new-custom-object-layer)
  - [ ] [New unused layer type?](#new-three-globe-layer)
  - [ ] [Modifies existing scene?](#scene-modifying-layer)
- [ ] Does this layer rely on a [new data type](#new-data-types)?
- [ ] Does this layer need [additional settings](#new-settings)?
- [ ] Ensure the layer is added in the [main layer registry](./src/globe/index.ts)
- [ ] Does this layer need access to other layers (sub layers or similar)? Check out [RegistryHook](./src/globe/layer.ts).

#### New custom object layer

To add a new custom object layer, we can rely on the [CustomObjectLayerGroup](./src/globe/layers/customobject.ts) to handle most of the data handling and we can just focus on our specific additions.

For example, lets say we want to add satellites to the globe. We will represent them with simple spheres. We should define [new data type for it](#new-data-types). For this section, lets assume we have already added that new data type - `SatelliteData`. Lets first prepare our mesh - simple sphere in green color:
```typescript
const satelliteGeometry = new THREE.SphereGeometry(4, 12);
const satelliteMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("green"),
  side: THREE.FrontSide,
});
```

We can move on to our layer implementation. Lets start with the basics, just adding a static satellite. Since this will be a custom object layer, we need to implement `CustomObjectLayerBuildHook`:
```typescript
export class SatellitesLayer
  implements
  CustomObjectLayerBuildHook {
  readonly layerName: string = "Satellites";

  buildObject(parent: THREE.Object3D, object: PointData): void {
    // All layers are called with all objects, so we need to make sure this is actually satellite data
    if (!(object instanceof SatelliteData)) {
      return;
    }

    // Build our simple mesh
    const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
    // Give it a name for easy lookup (if needed)
    satellite.name = "satellite";

    parent.add(satellite);
  }
}
```

We can now add this layer to the registry in [src/globe/index.ts](./src/globe/index.ts). This will still not work (we can test it by adding our new object to either a downloaded file, or adding it via debugging utility in [src/main.ts](./src/main.ts)(window.addObject)). Since this is also a new object type, all custom object layers need a provider for these objects:
```typescript
export class SatellitesObjectProvider extends CommonObjectProvider<SatelliteData> {
  readonly layerName: string = "SatellitesProvider";

  layerEnabled(settings: Settings): boolean {
    return settings.enableSatellites;
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof SatelliteData;
  }
}
```

For easier provider implementation, base class `CommonObjectProvider` is available. This implementation assumes that a new setting was added for showing or hiding satellites. This provider is also a globe layer, so it needs to be added to the registry. The satellite should now be visible, but it will be static. To add movement to it, we need to update its data regularly. Each data type has an `update` method. We can add this logic there:
```typescript
export class SatelliteData...{
...
  update(currentTime: number): PointData | null {
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.lon =
      (this.lon + delta * (this.satellite_speed_factor ?? 4) * Math.PI) % 360;
    return super.update(currentTime);
  }
...
}
```

Most objects are static in Globe of Wonder, so the change in longitude will not be represented on the globe. We need to make sure we update satellites position each frame. To do so, we need to implement `CustomObjectLayerFrameUpdateHook`:
```typescript
export class SatellitesLayer
  implements
  GlobeLayerAttachHook,
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook {
  ...
  private globe!: ThreeGlobe;

  // We will need the globe in update hook, so store it in the layer.
  // This will always be called before any updates, so we can safely assume that the globe will
  // be available by the time of our first update.
  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.globe = globe;
  }
  ...
  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    // All layers are called with all objects, so we need to make sure this is actually satellite data
    if (!(object instanceof SatelliteData)) {
      return;
    }

    Object.assign(
      parent.position,
      // ThreeGlobe provides a helper for generating a position based on coordinates
      // We need to take globe in the attach hook for it to be available
      this.globe.getCoords(
        object.lat,
        object.lon,
         // heightOffset returns a value in world units, but getCoords works with globe radius units
        object.heightOffset() / DEFAULT_GLOBE_RADIUS,
      ),
    );
  }
  ...
}
```

Now our satellite will rotate around the globe!

#### New three globe layer

To add a new layer depending on one of [three-globe's supported layers](https://www.npmjs.com/package/three-globe), we first need to make sure that there are no layers already depending on that layer. If there is a layer already depending on it, it should have a `LayerGroup` implementation, which should delegate to sub layers, to be able to control the same three globe layer from different layers in this project. For an example of that, check out [CustomObjectLayerGroup](./src/globe/layers/customobject.ts).

For example, [the rings layer](https://www.npmjs.com/package/three-globe#rings-layer) might be unused. We could add a new layer utilizing it. This part assumes that `RingData` is implemented according to [new data type guide](#new-data-types):
```typescript
export class RingsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerPreUpdateHook,
    GlobeLayerNewDataHook,
    GlobeLayerDataUpdateHook
{
  readonly layerName: string = "Rings";
  private data: RingData[] = [];

  attachToGlobe(
    globe: ThreeGlobe,
    _camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    globe
      .ringsData(this.data)
      .ringLat("lat")
      .ringLng("lon");
  }

  preUpdate(): void {
    mapAndFilter(this.data);
  }

  shouldTakePoint(point: PointData): boolean {
    return point instanceof RingData;
  }

  takeNewPoint(point: PointData): void {
    this.data.push(point as RingData);
  }

  updateData(globe: ThreeGlobe, settings: Settings): void {
    globe.ringsData(this.data);
  }
}
```

We can now add this layer to the registry in [src/globe/index.ts](./src/globe/index.ts).

#### Scene modifying layer

Layers don't have to work with the globe directly. They can modify the scene, camera or the renderer. Examples of these are the [ambient light layer](./src/globe/layers/ambientlight.ts), [window resize layer](./src/globe/layers/windowresize.ts). We could add a layer that adds a sun to our scene. Globe is always in the middle of the scene, so we can position objects based on that. We can remove the ambient light and have a sun shine on our earth.

Here is how that `SunLayer` could be implemented:
```typescript
const sunGeometry = new THREE.SphereGeometry(4, 12);
const sunMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xffffdd),
  side: THREE.FrontSide,
});

export class SunLayer implements GlobeLayerSceneAttachHook {
  readonly layerName: string = "Sun";

  attachToScene(scene: Scene, _camera: Camera, _renderer: WebGLRenderer): void {
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.add(new THREE.PointLight(new THREE.Color(0xffffdd), 10000000));
    sun.position.set(500, 500, 500);
    scene.add(sun);
  }
}
```

For this to make sense, we could remove the `AmbientLightLayer` from [the registry](./src/globe/index.ts) and add this `SunLayer` instead.

### New data types

Many layers will require new data types to be defined to be able to work. To make that job easier, there is a base class that can be used for all new data types (but it doesn't have to be used). Check out [CommonData](./src/data/common.ts) for more information on methods that can be implemented.

```typescript
// We define any keys that are not shared between all objects in `CustomizationData` interface
export interface SatelliteCustomizationData {
  satellite_altitude?: number;
  satellite_speed_factor?: number;
}

export class SatelliteData
  // The customization data interface needs to be passed in CommonData generic type argument
  // This will ensure that common data stores all that customization data in `additional_data` field.
  extends CommonData<SatelliteCustomizationData>
  implements
  SatelliteCustomizationData,
  // Most objects will implement all of these interfaces + CustomizationData
  // PointData is mandatory, all other are optional, but generally expected
  PointData,
  LabelsData,
  LinkData,
  LayerData,
  ScaleData,
  HoverTextData {
  // Storing last frame time for delta time calculation
  private lastTime: number = Date.now();

  // Base class constructor will ensure that all data is stored properly to implement all of these interfaces
  constructor(
    data: PositionData &
      LifetimeData &
      SatelliteCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super(data);
  }

  // We need to manually provide accessors for our `CustomizationData` interface, using `additional_data` field
  public get satellite_altitude(): number | undefined {
    return this.additional_data.satellite_altitude;
  }

  public get satellite_speed_factor(): number | undefined {
    return this.additional_data.satellite_speed_factor;
  }

  // In this case we need to override `heightOffset`, because our satellites shouldn't be placed on the ground
  heightOffset(): number {
    return (this.satellite_altitude ?? 2000) / UNIT_KMS;
  }

  // Clone is the only mandatory function to override (base class throws when it is called)
  clone(): SatelliteData {
    const new_data = new SatelliteData({
      lat: this.lat,
      lon: this.lon,
      ttl: this.total_lifetime,
      fade_duration: this.fade_duration,
      always_faces_viewer: this.always_faces_viewer,
      ...this.additional_data,
    });
    return new_data;
  }

  // Overriding update method to ensure that our satellite get their position updated
  update(currentTime: number): PointData | null {
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.lon =
      (this.lon + delta * (this.satellite_speed_factor ?? 4) * Math.PI) % 360;
    // We have to call the super method, because it will ensure that our objects properly expire (if TTL is defined)
    return super.update(currentTime);
  }
}
```

All new types are meant to be processed in services (like [websocket](./src/service/websocket.ts) and [downloader](./src/service/downloader.ts)). All services share [common data loading code](./src/service/data.ts). We need to define our new type there. In this example we will be adding `satellite` data type for the `SatellitesLayer` from above:
```typescript
// Defining how our new type is described in incoming JSON data
type SatelliteTypeData = {
  type: "satellite";
};
// Defining our new type
export type SatelliteServiceData = SatelliteTypeData &
  SharedServiceData &
  FilterData &
  SatelliteCustomizationData;

export type ServiceData =
  | ExplosionServiceData
  | CircleServiceData
  | PointerServiceData
  | BarServiceData
  | DownloadedServiceData
  | ArcServiceData
  | SatelliteServiceData; // Add our type to main `ServiceData` type
```

We also need to specify which parts of our objects are not usable for filtering (any keys found in incoming JSON data is usable for filtering except keys listed here and in common non filter keys):
```typscript
const NON_FILTER_KEYS = {
  ...
  satellite: ["satellite_altitude", "satellite_speed_factor"],
};
```

To ensure correct typing, we need to add our numerical keys in `FLOAT_KEYS`:
```typescript
const FLOAT_KEYS = [
  ...,
  "satellite_altitude",
  "satellite_speed_factor",
];
```

And add our type to `TypeData`:
```typescript
type TypeData = {
  type:
  | ExplosionTypeData["type"]
  | CircleTypeData["type"]
  | PointerTypeData["type"]
  | BarTypeData["type"]
  | DownloadedTypeData["type"]
  | ArcTypeData["type"]
  | SatelliteTypeData["type"] // Added satellite type
  | null;
};
```

If there are some other adjustments that need to be made to the keys or validation that needs to be performed, check out `parseServiceData` function in [src/servicce/data.ts](./src/service/data.ts).

Finally, we need to ensure our type gets added to the `newPointsQueue`, by adding a case for it in `buildAndPublishType` in [src/service/data.ts](./src/service/data.ts):
```typescript
function buildAndPublishType(
  type: TypeData["type"],
  data: ServiceData,
  settings: Settings,
  state: AppState,
) {
  switch (type) {
    case "satellite":
      state.newPointsQueue.push(
        new SatelliteData(data as SatelliteServiceData),
      );
      break;
    ...
  }
}
```

For testing purposes, we can optionally expose `SatelliteData` for access in console, by adding it to other types in [src/main.ts](./src/main.ts):
```typescript
// Debugging tools
declare global {
  interface Window {
    ...
    SatelliteData: typeof SatelliteData; // Adding our new type here
    addObject: (newPoint: PointData) => void;
  }
}
if (import.meta.env.MODE == "development") {
  ...
  window.SatelliteData = SatelliteData; // and here too
  window.addObject = (newPoint: PointData) => {
    state.newPointsQueue.push(newPoint);
  };
}
```

Now we can test it by calling `addObject(new SatelliteData({lat: 0, lon: 0, satellite_altitude: 3000}))` in console, or we can create a JSON file to be downloaded and make it available by storing it in the `public/assets/data` directory:
```json
[
  {
    "type": "satellite",
    "lat": 0,
    "lon": 0,
    "satellite_altitude": 3000
  }
]
```

We can then directly add it to URL query params: `http://localhost:5173/?dataDownloadUrl=assets%2Fdata%2Fsatellites.json`, or define it in the settings to test it out.

Checklist:
- [ ] Provide a class that implements at least `PointData`
  - [ ] Define all additional data in an interface
  - [ ] Consider using `CommonData` base class to easily implement all the layers dependencies
- [ ] Add type data to [src/service/data.ts](./src/service/data.ts)
- [ ] Add new keys to NON_FILTER_KEYS in [src/service/data.ts](./src/service/data.ts), if needed
- [ ] Add new keys to FLOAT_KEYS in [src/service/data.ts](./src/service/data.ts), if needed
- [ ] Add validation to `parseServiceData` in [src/service/data.ts](./src/service/data.ts), if needed
- [ ] Publish the new data type in `buildAndPublishType` in [src/service/data.ts](./src/service/data.ts)
- [ ] Add new properties descriptions to the [README](./README.md)
- [ ] Optionally expose the type for debugging in [src/main.ts](./src/main.ts)

### New settings

To add new settings, a `SettingsField` decorator is provided, to make it easier to notify other components when a setting has been changed. For example, if we wanted to add a setting to enable / disable `SatellitesLayer`, we would need to add a new field to [Settings](./src/settings/index.ts):
```typescript
export class Settings extends EventTarget {
  ...
  @SettingsField()
  accessor enableCircles: boolean = true;
  @SettingsField()
  accessor enableSatellites: boolean = true; // Our new field
  ...
}
```

And then also ensure we hook it up to UI in `setupSettingsDialog`:
```typescript
export function setupSettingsDialog(
  appContainer: HTMLElement,
  settings: Settings,
): SettingsFields {
  ...
  for (const [selector, type, property] of [
    ...
    ["#enablecircles", "boolean", "enableCircles"],
    ["#enablesatellites", "boolean", "enableSatellites"], // hooking up the UI ID, type and field
    ...
  ] as fieldType[]) {
  ...
```

And then also add it to the settings UI in `renderDialog`. It is expected to be an `input` field:
```typecript
function renderDialog(dialogContainer: HTMLElement) {
  ...
  dialogContainer.innerHTML = `
    ...
        <label for="enablecircles">Show circles:</label>
        <input type="checkbox" id="enablecircles" name="enablecircles" />
        <label for="enablesatellites">Show satellites:</label> // Label for our new field
        <input type="checkbox" id="enablesatellites" name="enablesatellites" /> // The field itself
    ...
  `;
}
```

The new setting will now be available in the settings UI and will notify other components when it has been changed.

### New data source

Data sources are not as well defined as globe layers, but it should still not be hard to add another source of incoming data. Currently websockets and download via URL are available.

Each data source has a `ServiceState` associated with it, to ensure that filters behavior correctly (and that different sources don't overwrite stored filters).

For example, lets build a static data source, just producing a single hardcoded object (a single `satellite` for `SatellitesLayer` from above). The implementation is very simple, because we just directly feed a single data object:
```typescript
export function setupStaticDataSource(
  settingsFields: SettingsFields,
  appState: AppState,
  serviceState: ServiceState,
  settings: Settings,
) {
  processServiceData(
    JSON.stringify({
      type: "satellite",
      lat: 10,
      lon: 10,
      satellite_altitude: 3000,
    }),
    settings,
    settingsFields,
    appState,
    serviceState,
  );
}
```

We need to add its state to settings in [src/main.ts](./src/main.ts):
```typescript
const dataDownloaderServiceState = new ServiceState();
const staticServiceState = new ServiceState(); // Our new service state
settings.services = [
  websocketServiceState,
  dataDownloaderServiceState,
  staticServiceState, // added to settings
];
...
```

And call our setup function:
```typescript
setupDataDownloader(
  settingsFields,
  state,
  dataDownloaderServiceState,
  settings,
);
setupStaticDataSource( // Our new source
  settingsFields,
  state,
  staticServiceState,
  settings,
);

```

## Testing

Initially, this project was meant to be used with [Vector](https://vector.dev/), specifically with its `websocket_server` sink. It is possible to test out websocket data source using the following configuration:
```yaml
api:
  enabled: true

sources:
  demo_logs_test:
    type: "demo_logs"
    format: "json"
    interval: 0.1

transforms:
  lat_lon_filter:
    type: "remap"
    inputs: ["demo_logs_test"]
    source: |
      .lat = to_string(random_float(-90.0, 90.0))
      .lon = to_string(random_float(-180.0, 180.0))
      .type = "explosion"
      .counter = to_string(random_int(1, 20))
      .explosion_initial_color = "#" + to_string(random_int(100000, 999999))
      .explosion_initial_radius_interval = to_string(random_int(100, 5000))
      .explosion_initial_radius_size = to_string(random_int(150, 300))
      .explosion_fallback_color = "#" + to_string(random_int(100000, 999999))
      .explosion_fallback_radius_interval = to_string(random_int(10000, 25000))
      .explosion_fallback_radius_size = to_string(random_int(20, 120))
      .

sinks:
  websocket_sink:
    inputs: ["lat_lon_filter"]
    type: "websocket_server"
    address: "0.0.0.0:1234"
    encoding:
      codec: "json"
```

The above configuration will allow connections on `localhost:1234` with no username and password. It will generate a random stream of explosions on the globe.

If you wish to provide a different websocket server implementation, keep in mind that credentials are sent as a protocol (in "Sec-WebSocket-Protocol" header), due to limitations of browser `WebSocket` implementation. They are sent as BASE64, percent encoded "username:password" string:
```typescript
websocketCredentials = encodeURIComponent(btoa(`${username}:${password}`));
```

Testing out data downloader is much more simple. It is enough to put a JSON file containing a JSON array of all the objects in `public/assets/data` directory and point to it in the `dataDownloadUrl` URL query param or in the settings UI.

Development builds also have the `addObject` function available in the console.
