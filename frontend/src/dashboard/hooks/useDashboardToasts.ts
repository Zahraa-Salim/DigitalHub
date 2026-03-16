import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem } from "../components/ToastStack";

type ToastTone = ToastItem["tone"];

export function useDashboardToasts(durationMs = 5000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timeoutIdsRef = useRef<number[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextIdRef.current++;
      setToasts((current) => [...current, { id, tone, message }]);

      const timeoutId = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timeoutIdsRef.current = timeoutIdsRef.current.filter((entry) => entry !== timeoutId);
      }, durationMs);

      timeoutIdsRef.current.push(timeoutId);
    },
    [durationMs],
  );

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
