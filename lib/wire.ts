"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny pub/sub log of everything that crosses the wire during a ceremony.
 *
 * The whole point of the inspector panel is that the audience shouldn't have to
 * take the presenter's word for what a passkey exchange contains -- they can
 * read the actual challenge, the actual signature, and see for themselves that
 * no private key appears anywhere.
 */

export type WireDirection = "request" | "response" | "device" | "error";

export type WireEvent = {
  id: string;
  step: number;
  at: number;
  direction: WireDirection;
  label: string;
  /** Plain-English gloss shown above the JSON. */
  note?: string;
  payload: unknown;
};

let events: WireEvent[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function logWire(
  direction: WireDirection,
  label: string,
  payload: unknown,
  note?: string,
) {
  counter += 1;
  events = [
    ...events,
    {
      id: `${counter}-${Date.now()}`,
      step: counter,
      at: Date.now(),
      direction,
      label,
      note,
      payload,
    },
  ];
  emit();
}

export function clearWire() {
  events = [];
  counter = 0;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return events;
}

const emptySnapshot: WireEvent[] = [];

export function useWire(): WireEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
}
