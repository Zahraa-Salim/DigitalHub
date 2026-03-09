// File: frontend/src/lib/lazyMedia.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
function applyLazyAttributesToElement(element: Element) {
  if (element instanceof HTMLImageElement) {
    if (!element.getAttribute("loading")) {
      element.loading = "lazy";
    }
    if (!element.getAttribute("decoding")) {
      element.decoding = "async";
    }
    return;
  }

  if (element instanceof HTMLIFrameElement && !element.getAttribute("loading")) {
    element.loading = "lazy";
  }
}

function walkAndApply(root: ParentNode) {
  root.querySelectorAll("img, iframe").forEach((element) => applyLazyAttributesToElement(element));
}

export function enableDefaultLazyMedia(): void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return;
  }

  const applyNow = () => {
    walkAndApply(document);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyNow, { once: true });
  } else {
    applyNow();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (!(addedNode instanceof Element)) continue;
        applyLazyAttributesToElement(addedNode);
        walkAndApply(addedNode);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
