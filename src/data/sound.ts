export interface SoundPause {
  readonly sound_pause_milliseconds: number;
}

export type SoundLinkNodeObject = { type: "sound_link" } & SoundLink;
export type SoundPauseNodeObject = { type: "sound_pause" } & SoundPause;
export type SoundNodeObject = SoundLinkNodeObject | SoundPauseNodeObject;

export interface SoundLink {
  /**
   * URL of a single sound to play (exclusive with soundset)
   */
  readonly sound_url?: string;
  /**
   * Volume to play the single sound at (0-10)
   */
  readonly sound_volume?: number;

  preload(): void;

  getLoaderPromise(): Promise<AudioBuffer>;
}

export interface SoundSet {
  /**
   * Sound set to play in sequence
   */
  readonly sound_set?: SoundNodeObject[];

  preloadAll(): void;
}

export type SoundSetObject = { sound_type: "sound_set" } & SoundSet;
export type SoundLinkObject = { sound_type: "sound_link" } & SoundLink;
export type AudioObjectData = SoundSetObject | SoundLinkObject;

/**
 * Checks whether the object implements {@link SoundLink} interface
 */
export function isSoundLink(object: unknown): object is SoundLink {
  return (object as SoundLink).sound_url !== undefined;
}

/**
 * Checks whether the object implements {@link SoundSet} interface
 */
export function isSoundSet(object: unknown): object is SoundSet {
  return (object as SoundSet).sound_set !== undefined;
}
