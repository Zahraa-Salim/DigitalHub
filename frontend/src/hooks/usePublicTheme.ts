import { useEffect } from "react";
import { getPublicThemeTokens } from "@/lib/publicApi";

export function usePublicTheme() {
  useEffect(() => {
    let active = true;

    getPublicThemeTokens()
      .then((tokens) => {
        if (!active) {
          return;
        }

        const root = document.documentElement;
        for (const token of tokens) {
          const cssKey = token.key.startsWith("--") ? token.key : `--${token.key}`;
          root.style.setProperty(cssKey, token.value);
        }
      })
      .catch(() => {
        // Fall back to compiled SCSS defaults when the theme API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);
}
