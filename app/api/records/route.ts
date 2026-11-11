import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { records } from '@/lib/schema'
import { and, eq, gte, lt } from 'drizzle-orm'

// GET /api/records?year=2026&month=11
// 返回以日期为 key 的对象 map，与前端 getAllRecords() 对齐
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const year = req.nextUrl.searchParams.get('year')
  const month = req.nextUrl.searchParams.get('month')
  if (!year || !month) {
    return NextResponse.json(
      { error: '缺少 year 或 month 参数' },
      { status: 400 },
    )
  }

  const from = `${year}-${month.padStart(2, '0')}-01`
  // 计算下月第一天
  const next = new Date(Number(year), Number(month), 1)
  const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

  const list = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.userId, userId),
        gte(records.date, from),
        lt(records.date, to),
      ),
    )

  // 转成以日期为 key 的 map
  const recordMap: Record<string, unknown> = {}
  for (const r of list) {
    recordMap[r.date] = {
      onDutyTime: r.onDutyTime,
      offDutyTime: r.offDutyTime,
      attendance: Number(r.attendance),
      workHours: Number(r.workHours),
      note: r.note,
    }
  }

  return NextResponse.json({ records: recordMap })
}
