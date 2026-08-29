"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a value that only exists in the browser (`window.location`, WebAuthn
 * feature detection) without hydration mismatches and without a setState call
 * inside an effect.
 *
 * `read` must return a primitive, or a value stable across calls -- a fresh
 * object each time would re-render forever.
 */
export function useClientValue<T>(read: () => T): T | null {
  return useSyncExternalStore(noopSubscribe, read, () => null);
}
