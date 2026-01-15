import { clamp } from "three/src/math/MathUtils.js";

export type AudioData = {
  url: string;
  volume?: number;
};

export function prepareAudio(audioData: AudioData): HTMLAudioElement {
  const audio = new Audio(audioData.url);
  audio.volume = clamp((audioData.volume ?? 5) / 10, 0, 1);
  return audio;
}

export function waitForLoad(audio: HTMLAudioElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const loadListener = () => {
      resolve();
      audio.removeEventListener("canplaythrough", loadListener);
    };
    const errorListener = (_e: Event) => {
      reject(audio.error);
      audio.removeEventListener("error", errorListener);
    };
    audio.addEventListener("canplaythrough", loadListener);
    audio.addEventListener("error", errorListener);
  });
}

export function playAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    audio.play().catch((error) => reject(error));
    const listener = () => {
      resolve();
      audio.removeEventListener("ended", listener);
    };
    const errorListener = (_e: Event) => {
      reject(audio.error);
      audio.removeEventListener("error", errorListener);
    };
    audio.addEventListener("ended", listener);
    audio.addEventListener("error", errorListener);
  });
}

export function delay(duration: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}
