export type Theme = "light" | "dark" | "system";
export type Density = "small" | "medium" | "large";

export const THEMES: Theme[] = ["light", "dark", "system"];
export const DENSITIES: Density[] = ["small", "medium", "large"];

export const DENSITY_LABEL: Record<Density, string> = {
  small: "Compacto",
  medium: "Padrão",
  large: "Confortável",
};

export const THEME_LABEL: Record<Theme, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

/** Resolve se o tema efetivo é escuro, considerando a preferência do SO. */
export function isDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Aplica tema e densidade ao <html> e persiste no localStorage. */
export function applyPreferences(theme: Theme, density: Density) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark(theme));
  root.dataset.density = density;
  try {
    localStorage.setItem("theme", theme);
    localStorage.setItem("density", density);
  } catch {}
}
