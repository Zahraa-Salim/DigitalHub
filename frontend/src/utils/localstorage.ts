// File: frontend/src/utils/localstorage.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
export const setLocalStorage = <T>(name: string, items: T[]): void => {
   localStorage.setItem(name, JSON.stringify(items));
};

export const getLocalStorage = <T>(name: string): T[] => {
   if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(name);
      if (data) {
         return JSON.parse(data) as T[];
      }
   }
   return [];
};