import { db } from "@/lib/db";
import { records, settings as settingsTable, dueOverrides, users } from "@/lib/schema";
import { and, eq, gte, lt, desc, asc } from "drizzle-orm";
import { UserSelect } from "@/components/user-select";
import { ThemeToggle } from "@/components/theme-toggle";

const pad2 = (n: number) => String(n).padStart(2, "0");
const num = (v: unknown) => (v == null ? 0 : Number(v));

// 取某月的下一个月（或上一个月）的年月
function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  let year = sp.year ? Number(sp.year) : now.getFullYear();
  let month = sp.month ? Number(sp.month) : now.getMonth() + 1;
  if (!year || Number.isNaN(year)) year = now.getFullYear();
  if (!month || Number.isNaN(month)) month = now.getMonth() + 1;

  const from = `${year}-${pad2(month)}-01`;
  const next = shiftMonth(year, month, 1);
  const to = `${next.year}-${pad2(next.month)}-01`;
  const prevM = shiftMonth(year, month, -1);

  // 所有用户，用于顶部用户切换
  const allUsers = await db.select().from(users).orderBy(asc(users.id));

  // 根据 query 选择当前用户，默认第一个
  const requested = sp.user ? Number(sp.user) : NaN;
  const userId =
    (Number.isNaN(requested) ? null : allUsers.find((u) => u.id === requested))?.id ??
    allUsers[0]?.id;

  if (!userId) {
    return <EmptyState label="暂无用户数据" note="请先通过小程序完成一次登录" />;
  }

  const [list, setting, due] = await Promise.all([
    db
      .select()
      .from(records)
      .where(and(eq(records.userId, userId), gte(records.date, from), lt(records.date, to)))
      .orderBy(desc(records.date)),
    db.query.settings.findFirst({ where: eq(settingsTable.userId, userId) }),
    db.query.dueOverrides.findFirst({
      where: and(eq(dueOverrides.userId, userId), eq(dueOverrides.month, `${year}-${pad2(month)}`)),
    }),
  ]);

  const standardHours = setting ? num(setting.standardHours) : 8;
  const goalHours = setting ? num(setting.goalHours) : 10;
  const dueDays = due?.value != null ? num(due.value) : null;

  // 聚合统计
  const actualDays = new Set(list.map((r) => r.date)).size;
  const totalHours = list.reduce((s, r) => s + num(r.workHours), 0);
  const overtime = list.reduce((s, r) => {
    const diff = num(r.workHours) - standardHours;
    return s + (diff > 0 ? diff : 0);
  }, 0);
  const avgHours = actualDays > 0 ? totalHours / actualDays : 0;
  const needToGoal =
    dueDays != null ? Math.max(0, dueDays * (goalHours - standardHours) - overtime) : null;

  const stats = [
    { label: "应出勤天数", value: dueDays != null ? dueDays.toString() : "—", unit: dueDays != null ? "天" : "未设置", dot: "bg-[var(--blue)]", valueCls: "" },
    { label: "实际出勤", value: actualDays.toString(), unit: "天", dot: "bg-[var(--green)]", valueCls: "text-[var(--green)] dark:text-[var(--green)]" },
    { label: "累计工时", value: totalHours.toFixed(1), unit: "小时", dot: "bg-[var(--purple)]", valueCls: "" },
    { label: "加班总时长", value: overtime.toFixed(1), unit: "小时", dot: "bg-[var(--orange)]", valueCls: "text-[var(--orange)] dark:text-[var(--orange)]" },
    { label: "平均工时", value: avgHours.toFixed(1), unit: "小时", dot: "bg-[var(--cyan)]", valueCls: "" },
    { label: "达标需补", value: needToGoal != null ? needToGoal.toFixed(1) : "—", unit: needToGoal != null ? "小时" : "未设置目标", dot: "bg-[var(--red)]", valueCls: "text-[var(--red)] dark:text-[var(--red)]" },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--txt)] transition-colors">
      {/* macOS 背景光晕 */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(130%_100%_at_15%_0%,rgba(90,120,255,0.18),transparent_60%)] dark:bg-[radial-gradient(130%_100%_at_15%_0%,rgba(40,44,60,0.4),transparent_60%)]" />

      {/* macOS 工具栏：半透明毛玻璃 + 细分隔线，无侧边栏 */}
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white/60 backdrop-blur-xl dark:bg-black/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0a84ff] to-[#0060df] p-2 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9 9h3.2a2.3 2.3 0 010 4.6H9M12 13.6V15m0-6v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dim)]">
                Work Log
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ThemeToggle />
            <UserSelect users={allUsers} userId={userId} />
            <MonthSwitcher year={year} month={month} prev={prevM} next={next} userId={userId} />
          </div>
        </div>
      </header>

      <main className="relative z-[1] mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6 sm:px-8">
        {/* 6 张统计卡片 */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="my-0 flex min-h-[120px] flex-col justify-center rounded-2xl border border-[var(--hair)] bg-[var(--fill)] p-5 shadow-sm backdrop-blur transition-colors hover:bg-[var(--fill-h)]"
            >
              <div className="flex items-center gap-1.5">
                <span className={"h-2 w-2 rounded-full " + s.dot} />
                <p className="text-[12.5px] font-medium text-[var(--dim)]">{s.label}</p>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={"font-mono text-[28px] font-semibold leading-none tracking-tight tabular-nums " + s.valueCls}>
                  {s.value}
                </span>
                <span className="text-[12px] text-[var(--dim)]">{s.unit}</span>
              </div>
            </div>
          ))}
        </section>

        {/* 参考稿：明细容器内连标题行与表格为一体 */}
        <section className="mt-6 flex min-h-0 flex-1 flex-col">
          {list.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--fill)] px-6 py-16 text-center text-sm text-[var(--dim)]">
              该月暂无考勤记录
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--hair)] bg-[var(--fill)] shadow-sm backdrop-blur">
              {/* t-hd：标题行 */}
              <div className="flex shrink-0 items-center justify-between px-[18px] pb-[12px] pt-[14px]">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--txt)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--blue)]" />
                  考勤明细
                </h2>
                <span className="text-[12px] text-[var(--dim)]">
                  {list.length} 条 · {year} 年 {pad2(month)} 月
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-[var(--fill)] text-left text-[12px] font-medium text-[var(--dim)]">
                      <Th>日期</Th>
                      <Th>上班</Th>
                      <Th>下班</Th>
                      <Th>工时</Th>
                      <Th>出勤</Th>
                      <Th className="text-right">备注</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr
                        key={r.id}
                        className="transition-colors hover:bg-[var(--fill-h)]"
                      >
                        <Td mono>{r.date}</Td>
                        <Td>{r.onDutyTime || "—"}</Td>
                        <Td>{r.offDutyTime || "—"}</Td>
                        <Td mono>{num(r.workHours).toFixed(1)}h</Td>
                        <Td>{attendanceTag(num(r.attendance))}</Td>
                        <Td className="text-right text-[var(--dim)]">
                          {r.note || ""}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-6 shrink-0 border-t border-[var(--line)] pt-4 text-[12px] text-[var(--dim)]">
          标准工时 {standardHours}h/天 · 达标 {goalHours}h/天
        </footer>
      </main>
    </div>
  );
}

function attendanceTag(v: number) {
  if (v === 1)
    return <span className="rounded-[6px] bg-[var(--blue-t)] px-[10px] py-[2px] text-[11.5px] font-medium text-[var(--blue)]">全天</span>;
  if (v === 0.5)
    return <span className="rounded-[6px] bg-[var(--orange-t)] px-[10px] py-[2px] text-[11.5px] font-medium text-[var(--orange)]">半天</span>;
  if (v === 0)
    return <span className="rounded-[6px] bg-[var(--red-t)] px-[10px] py-[2px] text-[11.5px] font-medium text-[var(--red)]">加班</span>;
  return v.toString();
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"border-t border-[var(--hair)] px-[18px] py-2 font-medium " + className}>{children}</th>;
}

function Td({
  children,
  className = "",
  mono = false,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={
        "border-t border-[var(--hair)] px-[18px] py-[11px] text-[var(--arr)] " +
        (mono ? "font-mono tabular-nums " : "") +
        className
      }
    >
      {children}
    </td>
  );
}

function EmptyState({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--fill)] px-10 py-12 text-center shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-[13px] text-[var(--dim)]">{note}</p>
      </div>
    </div>
  );
}

function MonthSwitcher({
  year,
  month,
  prev,
  next,
  userId,
}: {
  year: number;
  month: number;
  prev: { year: number; month: number };
  next: { year: number; month: number };
  userId: number;
}) {
  const fmt = (m: { year: number; month: number }) =>
    `?year=${m.year}&month=${m.month}&user=${userId}`;
  const arrowCls =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--dim)] transition-colors hover:bg-[var(--fill-h)] hover:text-[var(--txt)]";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--fill)] p-1 shadow-sm">
      <a className={arrowCls} href={fmt(prev)} aria-label="上个月">
        ‹
      </a>
      <span className="min-w-[100px] text-center font-mono text-sm tabular-nums">
        {year} / {pad2(month)}
      </span>
      <a className={arrowCls} href={fmt(next)} aria-label="下个月">
        ›
      </a>
    </div>
  );
}