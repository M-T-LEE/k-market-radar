import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia(query);
    const updateMatches = () => setMatches(media.matches);

    updateMatches();
    media.addEventListener?.("change", updateMatches);
    media.addListener?.(updateMatches);
    window.addEventListener("resize", updateMatches);
    window.addEventListener("orientationchange", updateMatches);

    return () => {
      media.removeEventListener?.("change", updateMatches);
      media.removeListener?.(updateMatches);
      window.removeEventListener("resize", updateMatches);
      window.removeEventListener("orientationchange", updateMatches);
    };
  }, [query]);

  return matches;
}
