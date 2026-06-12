// © 2026 [YOUR NAME HERE]. All rights reserved.
// Unauthorized copying, distribution, or use of this software is strictly prohibited.

/**
 * Streamed soundtrack player built on HTMLAudioElement (separate from the
 * WebAudio synth in audio.js). Plays a downloaded track per "kind":
 *   'menu'   -> a menu loop
 *   'battle' -> a random battle loop
 * Tracks loop, crossfade (~1s) when switching, and follow a 0..1 volume.
 *
 * FAIL-SAFE BY DESIGN: every file load / play is wrapped — if an asset is
 * missing or playback is blocked, the game runs silently with no thrown error.
 */

const BASE = "./assets/music/";
const TRACKS = {
  menu: ["menu_01.ogg", "menu_02.ogg"],
  battle: ["battle_01.mp3", "battle_02.ogg", "battle_03.mp3", "battle_04.ogg"],
};
const FADE_MS = 1000;
const STEP_MS = 50;

let volume = 0.35; // 0..1 target music volume
/** @type {{el: HTMLAudioElement, kind: string, raf: number} | null} */
let current = null;

const supported = () =>
  typeof Audio !== "undefined" && typeof document !== "undefined";

function pick(kind) {
  const list = TRACKS[kind] || TRACKS.menu;
  if (!list.length) return null;
  return BASE + list[Math.floor(Math.random() * list.length)];
}

function fade(el, from, to, ms, onDone) {
  try {
    el.volume = Math.max(0, Math.min(1, from));
  } catch {
    /* ignore */
  }
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  let i = 0;
  const id = globalThis.setInterval(() => {
    i += 1;
    const k = i / steps;
    try {
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    } catch {
      /* ignore */
    }
    if (i >= steps) {
      globalThis.clearInterval(id);
      onDone?.();
    }
  }, STEP_MS);
  return id;
}

function makeEl(src) {
  const el = new Audio();
  el.src = src;
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  // Never let a media error bubble — just go silent.
  el.addEventListener("error", () => {});
  return el;
}

function stopEl(el) {
  if (!el) return;
  try {
    el.pause();
    el.src = "";
    el.load();
  } catch {
    /* ignore */
  }
}

/** Start (or crossfade to) a track of the given kind. Safe to call anytime. */
export function musicPlay(kind = "menu") {
  if (!supported()) return;
  const k = kind === "battle" ? "battle" : "menu";
  // Already playing this kind — leave it running.
  if (current && current.kind === k) return;

  const src = pick(k);
  if (!src) return;

  let next;
  try {
    next = makeEl(src);
  } catch {
    return;
  }

  const prev = current;
  current = { el: next, kind: k, raf: 0 };

  const play = next.play?.();
  if (play && typeof play.then === "function") {
    play.then(() => fade(next, 0, volume, FADE_MS)).catch(() => {
      // Autoplay blocked or load failed — fade in once a gesture resumes,
      // and don't throw. The element stays; first user gesture elsewhere
      // (which resumes WebAudio) typically unblocks this too on retry.
      fade(next, 0, volume, FADE_MS);
    });
  } else {
    fade(next, 0, volume, FADE_MS);
  }

  if (prev) {
    fade(prev.el, prev.el.volume, 0, FADE_MS, () => stopEl(prev.el));
  }
}

/** Fade out and stop all music. */
export function musicHalt(fadeMs = FADE_MS) {
  const prev = current;
  current = null;
  if (!prev) return;
  fade(prev.el, prev.el.volume, 0, fadeMs, () => stopEl(prev.el));
}

/** Set the music volume (0..1); applies live to the playing track. */
export function musicVolume(v) {
  volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  if (current) {
    try {
      current.el.volume = volume;
    } catch {
      /* ignore */
    }
  }
}

/** Nudge the current track to resume if a gesture unblocked autoplay. */
export function musicResume() {
  if (!current) return;
  const el = current.el;
  if (el.paused) {
    try {
      const p = el.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* ignore */
    }
  }
}
