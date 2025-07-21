import { PointData } from ".";

/**
 * Simplified implementation of {@link PointData} specifically for analysis mode.
 */
export class AnalysisModeData implements PointData {
  lat: number;
  lon: number;
  total_lifetime: number;
  startTime: number;
  counter: number | null;

  public get fade_duration(): number {
    return 0;
  }
  public get always_faces_viewer(): boolean {
    return false;
  }

  constructor(data: PointData, lifetime: number) {
    this.lon = data.lon;
    this.lat = data.lat;
    this.counter = data.counter;
    this.total_lifetime = lifetime;
    this.startTime = Date.now();
  }

  visible(): boolean {
    return true;
  }
  clone(): AnalysisModeData {
    return new AnalysisModeData(this, this.total_lifetime);
  }
  update(currentTime: number): AnalysisModeData | null {
    if (currentTime - this.startTime > this.total_lifetime) {
      return null;
    } else {
      return this;
    }
  }
  faceCamera(): boolean {
    return false;
  }
  scale(): number {
    return 1;
  }
  variableScale(): boolean {
    return false;
  }
  scaleZ(): boolean {
    return false;
  }
  heightOffset(): number {
    return 0;
  }
  applyGlobalScale(): boolean {
    return false;
  }
  fadeFactor(): number | null {
    return null;
  }
  // Unimportant for analysis mode - this allows us to have 1 less field store in here
  timeLeft(): number {
    return this.total_lifetime;
  }
}
