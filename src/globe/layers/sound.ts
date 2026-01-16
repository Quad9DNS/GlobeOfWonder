import * as THREE from "three";
import { Settings, SettingsChangedEvent } from "../../settings";
import {
  CustomObjectLayerBuildHook,
  CustomObjectLayerFrameUpdateHook,
} from "./customobject";
import { PointData } from "../../data";
import {
  GlobeLayerAttachHook,
  GlobeLayerPrepareNewDataHook,
  GlobeLayerSettingsHook,
} from "../layer";
import ThreeGlobe from "three-globe";
import {
  isSoundLink,
  isSoundPause,
  isSoundSet,
  SoundLink,
} from "../../data/sound";

/**
 * Globe layer implementation for all objects that implement {@link SoundLink} or {@link SoundSet}.
 *
 * Adds just one child to the root object for {@link SoundLink}:
 * - THREE.Audio (soundlink)
 */
export class SoundObjectsLayer
  implements
    GlobeLayerAttachHook,
    GlobeLayerSettingsHook,
    CustomObjectLayerBuildHook,
    CustomObjectLayerFrameUpdateHook
{
  readonly layerName: string = "Labeled";
  private playSounds: boolean = false;
  private listener!: THREE.AudioListener;

  attachToGlobe(
    _globe: ThreeGlobe,
    camera: THREE.Camera,
    _renderer: THREE.WebGLRenderer,
  ): void {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
  }

  attachToSettings(settings: Settings): void {
    this.playSounds = settings.enableAudioCommands;

    settings.addChangedListener((event: CustomEvent<SettingsChangedEvent>) => {
      if (event.detail.field_changed == "enableAudioCommands") {
        this.playSounds = settings.enableAudioCommands;
      }
    });
  }

  buildObject(parent: THREE.Object3D, object: PointData): void {
    if (!this.playSounds) {
      return;
    }

    if (isSoundLink(object) && object.sound_url) {
      const audio = new THREE.Audio(this.listener);
      audio.setVolume((object.sound_volume ?? 10) / 10);
      object.getSoundLoaderPromise().then((data) => {
        audio.setBuffer(data);
        audio.play();
      });
      audio.name = "soundlink";
      parent.add(audio);
    } else if (isSoundSet(object) && object.sound_set) {
      const soundset = new THREE.Group();
      soundset.name = "soundset";
      let loadedPromise = Promise.resolve();
      let buffersCount = 0;
      const buffers: [AudioBuffer, number][] = [];
      let extraDelays = 0;
      for (const promise of object.getSoundSetLoaderPromise()) {
        loadedPromise = loadedPromise
          .then(() =>
            promise.then((data) => {
              if (isSoundPause(data)) {
                extraDelays += data.sound_pause_milliseconds / 1000;
              } else {
                buffers[buffersCount++] = [data, extraDelays];
                extraDelays = 0;
              }
            }),
          )
          .catch((err) => console.error("Soundset item load failed: ", err));
      }
      loadedPromise.then(() => {
        let currentDelay = 0;
        for (const [sound, delay] of buffers) {
          const audio = new THREE.Audio(this.listener!);
          audio.setBuffer(sound);
          audio.play(currentDelay + delay);
          soundset.add(audio);
          currentDelay += delay + sound.duration;
        }
      });
      parent.add(soundset);
    }
  }

  updateObjectFrame(parent: THREE.Object3D, object: PointData): void {
    if (isSoundLink(object) && object.sound_url) {
      const audio = parent.getObjectByName("soundlink");
      if (!audio) return;
      const fadeFactor = object.fadeFactor();
      (audio as THREE.Audio).setVolume(
        ((object.sound_volume ?? 10) / 10) * (fadeFactor ?? 1),
      );
    } else if (isSoundSet(object) && object.sound_set) {
      const set = parent.getObjectByName("soundset");
      if (!set) return;
      const fadeFactor = object.fadeFactor();
      let sound_i = 0;
      for (const child of (set as THREE.Group).children) {
        while (true) {
          if (object.sound_set[sound_i].type == "sound_link") {
            break;
          }
          sound_i++;
        }
        (child as THREE.Audio).setVolume(
          (((object.sound_set[sound_i] as SoundLink).sound_volume ?? 10) / 10) *
            (fadeFactor ?? 1),
        );
        sound_i++;
      }
    }
  }
}

export class SoundObjectPreloader implements GlobeLayerPrepareNewDataHook {
  readonly layerName: string = "SoundObjectPreloader";

  private audioLoader = new THREE.AudioLoader();

  constructor() {
    this.audioLoader.setRequestHeader({ Range: "" });
  }

  prepareNewPoint(point: PointData): void {
    if (isSoundLink(point)) {
      point.preloadSound(this.audioLoader);
    }
    if (isSoundSet(point)) {
      point.preloadSoundSet(this.audioLoader);
    }
  }
}
