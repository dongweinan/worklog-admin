import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { records } from '@/lib/schema'
import { and, eq } from 'drizzle-orm'

// PUT /api/records/:date —— 新增或编辑某天记录(按 date 覆盖/upsert)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date 格式应为 YYYY-MM-DD' },
      { status: 400 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 })
  }

  const onDutyTime = (body?.onDutyTime as string | undefined) ?? ''
  const offDutyTime = (body?.offDutyTime as string | undefined) ?? ''
  const attendance = body?.attendance as number | undefined
  const workHours = body?.workHours as number | undefined
  const note = (body?.note as string | undefined) ?? ''

  if (![0, 0.5, 1].includes(attendance as number)) {
    return NextResponse.json(
      { error: 'attendance 必须是 0/0.5/1' },
      { status: 400 },
    )
  }

  try {
    await db
      .insert(records)
      .values({
        userId,
        date,
        onDutyTime,
        offDutyTime,
        attendance: String(attendance),
        workHours: String(workHours ?? 0),
        note,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [records.userId, records.date],
        set: {
          onDutyTime,
          offDutyTime,
          attendance: String(attendance),
          workHours: String(workHours ?? 0),
          note,
          updatedAt: new Date(),
        },
      })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '数据库写入失败' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/records/:date
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const { date } = await params
  await db
    .delete(records)
    .where(and(eq(records.userId, userId), eq(records.date, date)))

  return NextResponse.json({ ok: true })
}
