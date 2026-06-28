"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "pa-favorites";
const CHANGE_EVENT = "pa-favorites-change";

let cachedJson = "";
let cachedSet: Set<string> = new Set();

function readFavorites(): Set<string> {
  try {
    const json = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
    if (json !== cachedJson) {
      cachedJson = json;
      cachedSet = new Set(JSON.parse(json) as string[]);
    }
  } catch {
    /* localStorage unavailable */
  }
  return cachedSet;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

const emptySet = new Set<string>();

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readFavorites, () => emptySet);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  const toggleFavorite = useCallback((id: string) => {
    const current = readFavorites();
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      const json = JSON.stringify([...next]);
      window.localStorage.setItem(STORAGE_KEY, json);
      cachedJson = json;
      cachedSet = next;
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
