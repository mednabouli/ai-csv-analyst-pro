"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

function getStored(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) ?? "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", dark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
  localStorage.setItem("theme", theme);
}

const OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light",  icon: <Sun     className="w-3.5 h-3.5" />, label: "Light"  },
  { value: "dark",   icon: <Moon    className="w-3.5 h-3.5" />, label: "Dark"   },
  { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    const stored = getStored();
    setTheme(stored);
    applyTheme(stored);

    // Keep in sync with OS changes when on "system"
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onOsChange() {
      if (getStored() === "system") applyTheme("system");
    }
    mq.addEventListener("change", onOsChange);
    return () => mq.removeEventListener("change", onOsChange);
  }, []);

  function cycle() {
    const order: Theme[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
    applyTheme(next);
  }

  if (!mounted) return <div className="w-8 h-8" />;

  const current = OPTIONS.find((o) => o.value === theme)!;

  return (
    <button
      onClick={cycle}
      title={`Theme: ${current.label} — click to cycle`}
      className="flex items-center justify-center w-8 h-8 rounded-lg border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label={`Switch theme (current: ${current.label})`}
    >
      {current.icon}
    </button>
  );
}
