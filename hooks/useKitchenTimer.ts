import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "running" | "paused" | "done";

const MINUTE = 60_000;
const VIBRATION = [300, 100, 300, 100, 500];
const MELODY = [523.25, 659.25, 783.99, 1046.5]; // do mi sol do
const RING_EVERY = 4_000;

function playMelody(audio: AudioContext) {
  MELODY.forEach((frequency, index) => {
    const start = audio.currentTime + index * 0.22;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.5);
  });
}

export function useKitchenTimer() {
  const [status, setStatus] = useState<Status>("idle");
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  // Une heure de fin plutôt qu'un décompte : Android ralentit les intervalles et le temps dériverait
  const endsAt = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  const start = useCallback((minutes: number) => {
    // Créé ici, sur le geste de l'utilisatrice : plus tard, Chrome le laisserait muet
    audio.current ??= new AudioContext();
    void audio.current.resume();
    const duration = minutes * MINUTE;
    endsAt.current = Date.now() + duration;
    setTotal(duration);
    setRemaining(duration);
    setStatus("running");
  }, []);

  const pause = useCallback(() => {
    setRemaining(Math.max(0, endsAt.current - Date.now()));
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    endsAt.current = Date.now() + remaining;
    setStatus("running");
  }, [remaining]);

  const addMinute = useCallback(() => {
    endsAt.current += MINUTE;
    setTotal((value) => value + MINUTE);
    setRemaining((value) => value + MINUTE);
  }, []);

  const reset = useCallback(() => setStatus("idle"), []);

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      const left = endsAt.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) setStatus("done");
    }, 250);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "done") return;
    const ring = () => {
      navigator.vibrate?.(VIBRATION);
      if (audio.current) playMelody(audio.current);
    };
    ring();
    const interval = setInterval(ring, RING_EVERY);
    return () => {
      clearInterval(interval);
      navigator.vibrate?.(0);
    };
  }, [status]);

  useEffect(() => () => void audio.current?.close(), []);

  return { status, total, remaining, start, pause, resume, addMinute, reset };
}
