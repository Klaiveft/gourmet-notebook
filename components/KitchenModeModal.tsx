"use client";

import { ChevronLeft, ChevronRight, Flame, Lightbulb, ListChecks, Pause, Play, Plus, RotateCcw, Timer, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useKitchenTimer } from "@/hooks/useKitchenTimer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { parseDurationMinutes } from "@/lib/duration";
import type { RecipeFull } from "@/lib/recipes";
import { cn, formatQuantity } from "@/lib/utils";

const SWIPE_DISTANCE = 60;
const RING_LENGTH = 2 * Math.PI * 44;

function formatClock(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const clock = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, "0")}` : ""}`;
}

export function KitchenModeModal({ recipe, onClose }: { recipe: RecipeFull; onClose: () => void }) {
  const steps = recipe.recipe_steps;
  const [index, setIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const wakeLocked = useWakeLock();
  const timer = useKitchenTimer();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const stepMinutes = step.duration_minutes ?? parseDurationMinutes(step.instruction);

  // Effet sans dépendance : le popstate re-rend le parent, un onClose en dépendance
  // retirerait l'écouteur avant son appel et la modale ne se fermerait jamais.
  const onBack = useEffectEvent(() => onClose());

  // Le bouton retour d'Android doit fermer le mode cuisine, pas quitter la recette
  useEffect(() => {
    history.pushState(null, "");
    window.addEventListener("popstate", onBack);
    document.body.style.overflow = "hidden";
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener("popstate", onBack);
      document.body.style.overflow = "";
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, []);

  const close = () => history.back();
  const goTo = (next: number) => setIndex(Math.min(steps.length - 1, Math.max(0, next)));

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || drawerOpen) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) goTo(index + (dx < 0 ? 1 : -1));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Mode Cuisine : ${recipe.title}`}
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={onTouchEnd}
      className={cn(
        "bg-cream text-espresso fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        timer.status === "done" && "animate-alarm",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={close} aria-label="Quitter le mode cuisine" className="btn-icon">
          <X className="size-7" aria-hidden />
        </button>
        <p className="flex-1 text-lg font-bold" aria-live="polite">
          Étape {index + 1} / {steps.length}
        </p>
        {wakeLocked && (
          <span className="text-terracotta-deep flex items-center gap-1 text-sm font-bold">
            <Flame className="fill-terracotta text-terracotta size-5" aria-hidden />
            Écran maintenu allumé
          </span>
        )}
      </header>

      <div className="bg-espresso/10 h-1.5" aria-hidden>
        <div className="bg-terracotta h-full transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
        <p className="text-[2rem] leading-snug font-semibold">{step.instruction}</p>

        {step.tip && (
          <p className="text-sage flex gap-2 text-xl font-semibold">
            <Lightbulb className="mt-1 size-5 shrink-0" aria-hidden />
            {step.tip}
          </p>
        )}

        {timer.status === "idle" && stepMinutes !== null && stepMinutes > 0 && (
          <button type="button" onClick={() => timer.start(stepMinutes)} className="btn-primary min-h-16 text-2xl">
            <Timer className="size-7" aria-hidden />
            Démarrer {formatMinutes(stepMinutes)}
          </button>
        )}

        {timer.status === "done" && (
          <button type="button" onClick={timer.reset} className="btn-primary bg-espresso min-h-20 text-3xl">
            C’est prêt ! Arrêter
          </button>
        )}

        {(timer.status === "running" || timer.status === "paused") && (
          <section aria-label="Minuteur" className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="size-24 shrink-0 -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r="44" fill="none" strokeWidth="10" className="stroke-cream-deep" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - timer.remaining / timer.total)}
                  className="stroke-terracotta transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <p role="timer" className="font-serif text-5xl font-semibold tabular-nums">
                {formatClock(timer.remaining)}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {timer.status === "running" ? (
                <button type="button" onClick={timer.pause} className="btn-secondary px-1">
                  <Pause className="size-5" aria-hidden />
                  Pause
                </button>
              ) : (
                <button type="button" onClick={timer.resume} className="btn-secondary px-1">
                  <Play className="size-5" aria-hidden />
                  Reprendre
                </button>
              )}
              <button type="button" onClick={timer.addMinute} className="btn-secondary px-1">
                <Plus className="size-5" aria-hidden />1 min
              </button>
              <button type="button" onClick={timer.reset} className="btn-secondary px-1">
                <RotateCcw className="size-5" aria-hidden />
                Réinitialiser
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl px-3 pb-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 font-bold"
        >
          <ListChecks className="size-5" aria-hidden />
          Ingrédients
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="btn-secondary min-h-24 text-xl disabled:opacity-40"
          >
            <ChevronLeft className="size-7" aria-hidden />
            Étape précédente
          </button>
          <button
            type="button"
            onClick={() => (isLast ? close() : goTo(index + 1))}
            className="btn-primary min-h-24 text-xl"
          >
            {isLast ? "Terminer" : "Étape suivante"}
            {!isLast && <ChevronRight className="size-7" aria-hidden />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="bg-espresso/30 absolute inset-0 z-10 flex items-end" onClick={() => setDrawerOpen(false)}>
          <div
            role="dialog"
            aria-label="Ingrédients"
            onClick={(e) => e.stopPropagation()}
            className="bg-cream/90 max-h-[75dvh] w-full overflow-y-auto rounded-t-3xl px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-espresso backdrop-blur-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Ingrédients</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fermer les ingrédients" className="btn-icon">
                <X className="size-7" aria-hidden />
              </button>
            </div>
            <ul className="divide-espresso/10 divide-y text-xl">
              {recipe.recipe_ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex justify-between gap-4 py-3">
                  <span>{ingredient.name}</span>
                  <span className="shrink-0 font-bold">{formatQuantity(ingredient.quantity, ingredient.unit)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
