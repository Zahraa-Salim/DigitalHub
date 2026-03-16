import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem } from "../components/ToastStack";

type ToastTone = ToastItem["tone"];

export function useDashboardToasts(durationMs = 5000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());
  const nextIdRef = useRef(1);
  const timersRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    setExitingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    delete timersRef.current[String(id)];
    delete timersRef.current[`exit_${id}`];
  }, []);

  const beginExit = useCallback((id: number) => {
    setExitingIds((current) => {
      if (current.has(id)) return current;
      return new Set([...current, id]);
    });
    if (timersRef.current[`exit_${id}`]) return;
    const exitTimer = window.setTimeout(() => removeToast(id), 230);
    timersRef.current[`exit_${id}`] = exitTimer;
  }, [removeToast]);

  const dismissToast = useCallback((id: number) => {
    const autoTimer = timersRef.current[String(id)];
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      delete timersRef.current[String(id)];
    }
    beginExit(id);
  }, [beginExit]);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    const id = nextIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    const timer = window.setTimeout(() => beginExit(id), durationMs);
    timersRef.current[String(id)] = timer;
  }, [beginExit, durationMs]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return { toasts, exitingIds, pushToast, dismissToast };
}
