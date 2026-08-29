"use client";

import { useState } from "react";

import { clearWire, useWire, type WireDirection } from "@/lib/wire";

const directionStyles: Record<
  WireDirection,
  { glyph: string; label: string; className: string }
> = {
  request: {
    glyph: "→",
    label: "Browser to server",
    className: "text-cream/70",
  },
  response: {
    glyph: "←",
    label: "Server to browser",
    className: "text-yellow",
  },
  device: {
    glyph: "◆",
    label: "Authenticator",
    className: "text-yellow",
  },
  error: {
    glyph: "✕",
    label: "Error",
    className: "text-red",
  },
};

function Json({ value }: { value: unknown }) {
  return (
    <pre className="thin-scroll max-h-72 overflow-auto border border-cream/15 bg-black/40 p-3 font-mono text-[12.5px] leading-relaxed text-cream/85">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function WireInspector() {
  const events = useWire();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <section className="on-dark flex h-full flex-col border border-ink">
      <header className="flex items-center justify-between gap-4 border-b border-cream/15 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Wire inspector
          </h2>
          <p className="text-sm text-cream/60">
            Every byte exchanged during the ceremony.
          </p>
        </div>
        <button
          type="button"
          onClick={clearWire}
          className="border border-cream/30 px-3 py-1.5 text-sm text-cream/80 transition hover:bg-cream hover:text-ink"
        >
          Clear
        </button>
      </header>

      <div className="thin-scroll flex-1 overflow-auto px-5 py-4">
        {events.length === 0 ? (
          <p className="py-10 text-center text-sm text-cream/50">
            Nothing yet. Start a sign-in or create an account and every step will
            appear here.
          </p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => {
              const style = directionStyles[event.direction];
              const isCollapsed = collapsed[event.id];

              return (
                <li key={event.id} className="pk-fade-in">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((current) => ({
                        ...current,
                        [event.id]: !current[event.id],
                      }))
                    }
                    className="flex w-full items-baseline gap-3 text-left"
                  >
                    <span
                      className={`font-mono text-base ${style.className}`}
                      title={style.label}
                    >
                      {style.glyph}
                    </span>
                    <span className="flex-1 text-sm font-semibold">
                      {event.step}. {event.label}
                    </span>
                    <span className="font-mono text-xs text-cream/40">
                      {isCollapsed ? "show" : "hide"}
                    </span>
                  </button>

                  {event.note ? (
                    <p className="mt-1 pl-7 text-sm text-cream/60">
                      {event.note}
                    </p>
                  ) : null}

                  {!isCollapsed ? (
                    <div className="mt-2 pl-7">
                      <Json value={event.payload} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
