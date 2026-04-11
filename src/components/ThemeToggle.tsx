import { useTheme } from "./ThemeProvider";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-app-nav-text/10 text-app-nav-text border border-app-nav-text/20 hover:bg-app-nav-text/20 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon size={20} className="text-blue-200 fill-blue-200/20" />
      ) : (
        <Sun size={20} className="text-amber-400 fill-amber-400/20" />
      )}
    </button>
  );
}
