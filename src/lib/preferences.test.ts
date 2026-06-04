import { describe, it, expect, beforeEach, vi } from "vitest";
import { isDark, applyPreferences, DENSITY_LABEL, THEME_LABEL, DENSITIES, THEMES } from "./preferences";

describe("isDark", () => {
  it("dark → true", () => expect(isDark("dark")).toBe(true));
  it("light → false", () => expect(isDark("light")).toBe(false));
  it("system segue o matchMedia", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as any);
    expect(isDark("system")).toBe(true);
  });
});

describe("applyPreferences", () => {
  beforeEach(() => { document.documentElement.className = ""; localStorage.clear(); });

  it("aplica tema escuro e densidade ao <html> e persiste", () => {
    applyPreferences("dark", "large");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.density).toBe("large");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("density")).toBe("large");
  });

  it("tema claro remove a classe dark", () => {
    document.documentElement.classList.add("dark");
    applyPreferences("light", "small");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.density).toBe("small");
  });
});

describe("constantes", () => {
  it("rótulos definidos", () => {
    expect(DENSITY_LABEL.medium).toBeTruthy();
    expect(THEME_LABEL.dark).toBeTruthy();
  });
  it("listas completas", () => {
    expect(DENSITIES).toEqual(["small", "medium", "large"]);
    expect(THEMES).toEqual(["light", "dark", "system"]);
  });
});
