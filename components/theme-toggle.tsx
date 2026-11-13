"use client";

import { useEffect, useState } from "react";

// macOS 风格的明暗切换按钮（手动控制，不跟随系统）
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // 初始状态与当前 class 同步
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-[#86868b] shadow-sm transition-colors hover:border-black/20 hover:text-[#1d1d1f] dark:border-white/10 dark:text-[#98989d] dark:hover:border-white/20 dark:hover:text-white"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 12.5A8 8 0 0 1 11.5 4a8 8 0 1 0 8.5 8.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}