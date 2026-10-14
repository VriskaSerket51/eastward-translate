// originally written by @imoaazahmed
import { useEffect, useState } from "react";
type Theme = "light" | "dark";
export function useTheme(defaultTheme: Theme = "light") {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme, ready]);
  return {
    theme,
    isDark: theme === "dark",
    isLight: theme === "light",
    setLightTheme: () => setTheme("light"),
    setDarkTheme: () => setTheme("dark"),
    toggleTheme: () =>
      setTheme((value) => (value === "dark" ? "light" : "dark")),
  };
}
