"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; openid: string };

// macOS 风格的下拉选择器，切换当前统计用户
export function UserSelect({ users, userId }: { users: Option[]; userId: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  const onchange = (id: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("user", String(id));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[#86868b] dark:text-[#98989d]"
        >
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M4 20c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <select
        value={String(userId)}
        onChange={(e) => onchange(Number(e.target.value))}
        aria-label="选择用户"
        className="h-9 w-full min-w-[160px] cursor-pointer appearance-none rounded-lg border border-black/10 bg-white/70 py-0 pl-9 pr-8 text-[13px] font-medium text-[#1d1d1f] shadow-sm outline-none backdrop-blur transition-colors hover:border-black/20 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/30 dark:border-white/10 dark:bg-white/5 dark:text-[#f5f5f7] dark:hover:border-white/20 dark:focus:border-[#0a84ff] dark:focus:ring-[#0a84ff]/30"
      >
        {users.map((u) => (
          <option
            key={u.id}
            value={u.id}
            className="bg-white text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
          >
            用户 #{u.id} · {u.openid.slice(0, 10)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="text-[#86868b] dark:text-[#98989d]"
        >
          <path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}