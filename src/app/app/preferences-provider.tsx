"use client";

import { useEffect } from "react";
import { applyPreferences, type Theme, type Density } from "@/lib/preferences";

/**
 * Aplica as preferências salvas no perfil (fonte de verdade) ao carregar a área logada.
 * O script no <head> já evita o flash usando localStorage; aqui garantimos que o
 * valor do banco prevaleça (ex.: ao logar em outro dispositivo).
 */
export default function PreferencesProvider({
  theme,
  density,
  children,
}: {
  theme: Theme;
  density: Density;
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyPreferences(theme, density);
  }, [theme, density]);

  return <div className="theme-anim">{children}</div>;
}
