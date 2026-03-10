// File: frontend/src/lib/lazyMedia.ts
// Purpose: Provides helpers for lazy loading images and other media in the frontend.
// It helps page components defer heavy assets until they are needed.

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

