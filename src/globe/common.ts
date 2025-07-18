import * as THREE from "three";
import { degToRad, radToDeg } from "three/src/math/MathUtils.js";

export const QUAD9_COLOR = new THREE.Color(0xdc205e);
export const DEFAULT_CRITICAL_COLOR = new THREE.Color(0xff2000);

export const DEFAULT_GLOBE_RADIUS = 100;
export const UNIT_KMS = 6371 / DEFAULT_GLOBE_RADIUS;
export const UNIT_MILES = UNIT_KMS * 0.6213712;

export const KM_TO_LATITUDE = 0.00902;
export const KM_TO_LONGITUDE = 0.00898;

export function geoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const lat1Rad = degToRad(lat1);
  const lat2Rad = degToRad(lat2);
  const lon1Rad = degToRad(lon1);
  const lon2Rad = degToRad(lon2);

  const dlon = lon2Rad - lon1Rad;
  const dlat = lat2Rad - lat1Rad;

  const a =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.pow(Math.sin(dlon / 2), 2);
  return 2 * Math.asin(Math.sqrt(a));
}

export function geoMidPoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): [number, number] {
  const lonDiff = degToRad(lon2 - lon1);
  const lat1Rad = degToRad(lat1);
  const lat2Rad = degToRad(lat2);
  const lon1Rad = degToRad(lon1);

  const bx = Math.cos(lat2Rad) * Math.cos(lonDiff);
  const by = Math.cos(lat2Rad) * Math.sin(lonDiff);

  const latMid = radToDeg(
    Math.atan2(
      Math.sin(lat1Rad) + Math.sin(lat2Rad),
      Math.sqrt((Math.cos(lat1Rad) + bx) * (Math.cos(lat1Rad) + bx) + by * by),
    ),
  );
  const lonMid = radToDeg(lon1Rad + Math.atan2(by, Math.cos(lat1Rad) + bx));

  return [latMid, lonMid];
}
