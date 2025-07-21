/**
 * Represents common point data, absolutely required for any point displayed on the globe.
 */
export interface PointData {
  /**
   * Latitude of the point
   */
  lat: number;
  /**
   * Longitude of the point
   */
  lon: number;

  /**
   * Total lifetime of the point
   */
  total_lifetime: number;

  /**
   * Fade duration of the point.
   * If > 0, the point will gradually disappear towards the end of the lifetime.
   */
  fade_duration: number;

  /**
   * If set to true, the object will always turn to face the camera.
   */
  always_faces_viewer: boolean;

  /**
   * Number of actual events represented by this point.
   */
  counter?: number;

  /**
   * Whether the object should be displayed. It can change throughout the object lifetime.
   *
   * @returns true if object should be visible, false otherwise
   */
  visible(): boolean;

  /**
   * Creates a new copy of this object. It should be a deep copy.
   */
  clone(): PointData;

  /**
   * Updates the state of this object according to current time.
   *
   * @param currentTime current UTC time in milliseconds
   * @returns this instance, or null if this object is expired and should be deleted
   */
  update(currentTime: number): PointData | null;

  /**
   * Whether the object should turn to face the camera at all times.
   *
   * @returns true if the object should always face the camera
   */
  faceCamera(): boolean;

  /**
   * Scale of the object.
   * In most cases it should stay 1, because it will affect anything attached to the object.
   *
   * @returns relative scale (default is 1)
   */
  scale(): number;

  /**
   * Returns true if the scale of the object may be changed during lifetime.
   */
  variableScale(): boolean;

  /**
   * Whether the global scaling should affect Z (height) too.
   * Should usually be false, unless the object has a significant height component.
   *
   * @returns true if the object should scale in height as well
   */
  scaleZ(): boolean;

  /**
   * Returns the height offset of the object. If > 0 then object will be placed at defined height above the surface.
   * 0 means the object is placed on the ground.
   *
   * @returns height offset of the object
   */
  heightOffset(): number;

  /**
   * Whether the object should be freely scaled from the outside.
   * Should be set to false if object defines its own scale (applied to the root object in hierarchy).
   *
   * @returns true if scale may be directly set to the object, false otherwise - in that case value from `scale()` is applied
   */
  applyGlobalScale(): boolean;

  /**
   * Object fade factor - opacity factor in its fade out period.
   *
   * @returns opacity factor if in fade out period, null otherwise
   */
  fadeFactor(): number | null;

  /**
   * Returns number of milliseconds left before this object disappears.
   * Useful for optimization - to sort objects by lifetime for easier removal.
   */
  timeLeft(): number;
}

/**
 * Represents opacity layer data.
 */
export interface LayerData {
  /**
   * Opacity specific to this object. Number between 0 and 100. Null is equivalent to 100.
   */
  opacity?: number;
  /**
   * Id of the opacity layer this object belongs to.
   * Objects are grouped per layer id and their opacity can be controlled as a group via settings.
   */
  layer_id?: number;
  /**
   * Optional name of the layer this object belongs to - it sets the name in the settings UI.
   */
  layer_name?: string;
}

/**
 * Represents objects optional scale data.
 */
export interface ScaleData {
  /**
   * Whether the object ignores zoom.
   * If set to true, the object will stay roughly the same size on the screen, regardless of the zoom level.
   */
  ignore_zoom?: boolean;
}

/**
 * Sorting comparator for {@link PointData}, comparing positions (lon first then lat)
 */
export function comparePositions(left: PointData, right: PointData): number {
  if (
    Math.abs(left.lon - right.lon) < 0.001 &&
    Math.abs(left.lat - right.lat) < 0.001
  ) {
    return 0;
  }

  const leftNum = left.lon * 1000 + left.lat;
  const rightNum = right.lon * 1000 + right.lat;
  return rightNum - leftNum;
}

/**
 * Sorting comparator for {@link PointData}, comparing time left - useful for quick expired objects removal
 */
export function compareTimeLeft(left: PointData, right: PointData): number {
  return right.timeLeft() - left.timeLeft();
}

/**
 * Updates all objects for frame update (meaning they just get updated, without removing expired objects)
 */
export function updateDataForFrame<T extends PointData>(collection: T[]) {
  const currentTime = Date.now();
  for (const item of collection) {
    item.update(currentTime);
  }
}

/**
 * Updates all objects and removes expired objects.
 *
 * @param [opts={}] takes additional options - `sortedByLifetime` can be set to true if the collection is sorted by lifetime in descending order, to remove expired objects more easily, `retainedElementCallback` is called for every object that is not removed
 */
export function mapAndFilter<T extends PointData>(
  collection: T[],
  opts: {
    retainedElementCallback?: (element: T) => void;
    sortedByLifetime?: boolean;
  } = {},
) {
  const currentTime = Date.now();
  // filter and map in place
  let i = 0;
  let newLength = 0;

  while (i < collection.length) {
    const val = collection[i].update(currentTime);
    if (val != null) {
      collection[newLength++] = val as T;
      if (opts.retainedElementCallback) {
        opts.retainedElementCallback(val as T);
      }
    } else if (opts.sortedByLifetime) {
      break;
    }
    i++;
  }

  collection.length = newLength;
}

/**
 * Performs binary search of collection and replaces or inserts a new item
 * Mutates the collection
 *
 * @param [comparator=comparePositions] comparator to use when sorting
 * @param [opts={}] additional options - `noReplace` forces this to always insert objects, even if comparator tells they are the same, `ascending` forces ascending sort order
 */
export function binarySearchReplace<T extends PointData>(
  collection: T[],
  item: T,
  comparator: (left: T, right: T) => number = comparePositions,
  opts: { noReplace?: boolean; ascending?: boolean } = {},
) {
  let start = 0;
  let end = collection.length - 1;

  while (start <= end) {
    const mid = (start + end) >> 1;

    let comp = comparator(collection[mid], item);
    if (opts.ascending) {
      comp *= -1;
    }
    if (comp == 0) {
      collection.splice(mid, opts.noReplace ? 0 : 1, item);
      return;
    } else if (comp < 0) {
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }

  collection.splice(start, 0, item);
}
