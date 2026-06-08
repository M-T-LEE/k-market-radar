import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const FAVORITES_STORAGE_KEY = "market-cycle-radar:favorites";

type FavoritesContextValue = {
  favoriteIds: string[];
  favoriteCount: number;
  isFavorite: (stockId: string) => boolean;
  toggleFavorite: (stockId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("market-cycle-radar:favorites-updated"));
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavorites());

  useEffect(() => {
    const sync = () => setFavoriteIds(readFavorites());
    window.addEventListener("storage", sync);
    window.addEventListener("market-cycle-radar:favorites-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("market-cycle-radar:favorites-updated", sync);
    };
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback((stockId: string) => favoriteSet.has(stockId), [favoriteSet]);

  const toggleFavorite = useCallback((stockId: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(stockId)
        ? current.filter((id) => id !== stockId)
        : [stockId, ...current];
      writeFavorites(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      favoriteIds,
      favoriteCount: favoriteIds.length,
      isFavorite,
      toggleFavorite
    }),
    [favoriteIds, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }
  return context;
}
