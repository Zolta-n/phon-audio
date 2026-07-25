"use client";

import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

const STORAGE_KEY = "pa-favorites";
const CHANGE_EVENT = "pa-favorites-change";

let cachedJson = "";
let cachedSet: Set<string> = new Set();
let currentUserId: string | null = null;
// The user whose anonymous localStorage favorites have already been merged into
// their account. Merging only once prevents a just-removed favorite from being
// re-uploaded (resurrected) by a later hydration.
let mergedUserId: string | null = null;

function readLocalFavorites(): Set<string> {
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

function writeLocalFavorites(next: Set<string>) {
  try {
    const json = JSON.stringify([...next]);
    window.localStorage.setItem(STORAGE_KEY, json);
    cachedJson = json;
  } catch {
    /* ignore */
  }
  cachedSet = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function clearLocalFavorites() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cachedJson = "";
  cachedSet = new Set();
  window.dispatchEvent(new Event(CHANGE_EVENT));
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

// Loads the signed-in user's favorites from Supabase, merges in any
// anonymous localStorage favorites (from before they logged in), and
// clears the local copy now that the account is the source of truth.
async function hydrateFromAccount(userId: string) {
  const supabase = createClient();
  // Set early so a toggle made before hydration finishes still persists remotely.
  currentUserId = userId;

  const { data, error } = await supabase
    .from("favorites")
    .select("component_id")
    .eq("user_id", userId);

  if (error) return;

  const remoteIds = new Set((data ?? []).map((row) => row.component_id as string));

  // Carry anonymous (pre-login) favorites into the account ONCE. Doing this on
  // every hydration would re-upload a favorite the user has since removed.
  if (mergedUserId !== userId) {
    const toMerge = [...readLocalFavorites()].filter((id) => !remoteIds.has(id));
    if (toMerge.length > 0) {
      await supabase
        .from("favorites")
        .upsert(toMerge.map((component_id) => ({ user_id: userId, component_id })));
      toMerge.forEach((id) => remoteIds.add(id));
    }
    mergedUserId = userId;
  }

  // The account is the source of truth once signed in.
  writeLocalFavorites(remoteIds);
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readLocalFavorites, () => emptySet);
  const hydrated = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !hydrated.current) {
        hydrated.current = true;
        hydrateFromAccount(data.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        hydrated.current = true;
        hydrateFromAccount(session.user.id);
      } else if (event === "SIGNED_OUT") {
        currentUserId = null;
        mergedUserId = null;
        hydrated.current = false;
        clearLocalFavorites();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  const toggleFavorite = useCallback((id: string) => {
    const removing = readLocalFavorites().has(id);
    const next = new Set(readLocalFavorites());
    if (removing) next.delete(id);
    else next.add(id);
    writeLocalFavorites(next); // optimistic

    const userId = currentUserId;
    if (!userId) return;

    const supabase = createClient();
    const write = removing
      ? supabase.from("favorites").delete().eq("user_id", userId).eq("component_id", id)
      : supabase.from("favorites").upsert({ user_id: userId, component_id: id });

    Promise.resolve(write).then(({ error }) => {
      if (!error) return;
      // Remote write failed — revert the optimistic change so the UI matches
      // what's actually persisted (otherwise a hydration would resurrect it).
      const reverted = new Set(readLocalFavorites());
      if (removing) reverted.add(id);
      else reverted.delete(id);
      writeLocalFavorites(reverted);
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
