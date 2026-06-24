import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("yp-theme", theme);
}

const initial = (localStorage.getItem("yp-theme") as Theme) || "light";
apply(initial);

export const useTheme = create<ThemeState>((set) => ({
  theme: initial,
  toggle: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      apply(next);
      return { theme: next };
    }),
  set: (t) => {
    apply(t);
    set({ theme: t });
  },
}));
