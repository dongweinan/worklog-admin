import { db } from "@/lib/db";
import { records, settings as settingsTable, dueOverrides, users } from "@/lib/schema";
import { and, eq, gte, lt, desc } from "drizzle-orm";

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
  searchParams: Promise<{ year?: string; month?: string }>;
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

  // 固定取第一个用户作为当前后台统计数据源
  const firstUser = await db.select().from(users).limit(1);
  const userId = firstUser[0]?.id;
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
    dueDays != null ? Math.max(0, goalHours * dueDays - totalHours) : null;

  const stats = [
    { label: "应出勤天数", value: dueDays != null ? dueDays.toString() : "—", unit: dueDays != null ? "天" : "未设置" },
    { label: "实际出勤", value: actualDays.toString(), unit: "天" },
    { label: "累计工时", value: totalHours.toFixed(1), unit: "小时" },
    { label: "加班总时长", value: overtime.toFixed(1), unit: "小时" },
    { label: "平均工时", value: avgHours.toFixed(1), unit: hoursUnit(avgHours) },
    { label: "达标需补", value: needToGoal != null ? needToGoal.toFixed(1) : "—", unit: needToGoal != null ? "小时" : "未设置目标" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 sm:px-8">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-zinc-400">
              Work Log
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              工时统计
            </h1>
          </div>
          <MonthSwitcher
            year={year}
            month={month}
            prev={prevM}
            next={next}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        {/* 6 张统计卡片 */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-sm border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400"
            >
              <p className="text-[13px] text-zinc-500">{s.label}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-[28px] font-medium leading-none tracking-tight text-zinc-900 tabular-nums">
                  {s.value}
                </span>
                <span className="text-[12px] text-zinc-400">{s.unit}</span>
              </div>
            </div>
          ))}
        </section>

        {/* 明细列表 */}
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
              考勤记录
            </h2>
            <span className="text-[12px] text-zinc-400">
              {list.length} 条 · {year} 年 {pad2(month)} 月
            </span>
          </div>

          {list.length === 0 ? (
            <div className="rounded-sm border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
              该月暂无考勤记录
            </div>
          ) : (
            <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[12px] uppercase tracking-wider text-zinc-400">
                    <Th>日期</Th>
                    <Th>上班</Th>
                    <Th>下班</Th>
                    <Th>工时</Th>
                    <Th>出勤</Th>
                    <Th className="w-[1%] px-4 py-2.5 text-right">备注</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r, i) => (
                    <tr
                      key={r.id}
                      className={
                        "border-b border-zinc-100 last:border-0 " +
                        (i % 2 === 1 ? "bg-zinc-50/60" : "bg-white")
                      }
                    >
                      <Td mono>{r.date}</Td>
                      <Td>{r.onDutyTime || "—"}</Td>
                      <Td>{r.offDutyTime || "—"}</Td>
                      <Td mono>{num(r.workHours).toFixed(1)}h</Td>
                      <Td>{attendanceLabel(num(r.attendance))}</Td>
                      <Td className="px-4 py-2.5 text-right text-zinc-400">
                        {r.note || ""}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-zinc-200 pt-4 text-[12px] text-zinc-400">
          标准工时 {standardHours}h/天 · 达标 {goalHours}h/月
        </footer>
      </main>
    </div>
  );
}

function hoursUnit(h: number) {
  return h >= 1 ? "小时" : "小时";
}

function attendanceLabel(v: number) {
  if (v === 1) return "全天";
  if (v === 0.5) return "半天";
  if (v === 0) return "加班";
  return v.toString();
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={"px-4 py-2.5 font-medium " + className}>{children}</th>
  );
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
    <td className={"px-4 py-2.5 text-zinc-700 " + (mono ? "font-mono tabular-nums " : "") + className}>
      {children}
    </td>
  );
}

function EmptyState({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="rounded-sm border border-zinc-200 bg-white px-10 py-12 text-center">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <p className="mt-1 text-[13px] text-zinc-400">{note}</p>
      </div>
    </div>
  );
}

function MonthSwitcher({
  year,
  month,
  prev,
  next,
}: {
  year: number;
  month: number;
  prev: { year: number; month: number };
  next: { year: number; month: number };
}) {
  const fmt = (m: { year: number; month: number }) => `?year=${m.year}&month=${m.month}`;
  return (
    <div className="flex items-center gap-2">
      <a
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900"
        href={fmt(prev)}
        aria-label="上个月"
      >
        ‹
      </a>
      <span className="min-w-[110px] text-center font-mono text-sm text-zinc-700 tabular-nums">
        {year} / {pad2(month)}
      </span>
      <a
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900"
        href={fmt(next)}
        aria-label="下个月"
      >
        ›
      </a>
    </div>
  );
}