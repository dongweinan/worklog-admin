import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { dueOverrides } from '@/lib/schema'
import { and, eq } from 'drizzle-orm'

// GET /api/due-override?year=2026&month=11
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

  const ym = `${year}-${month.padStart(2, '0')}`
  const row = await db.query.dueOverrides.findFirst({
    where: and(eq(dueOverrides.userId, userId), eq(dueOverrides.month, ym)),
  })

  return NextResponse.json({
    value: row ? row.value : '',
    source: row ? row.source : '',
  })
}

// PUT /api/due-override?year=2026&month=11
// value 传空串/null 表示清除覆盖，删除该行
export async function PUT(req: NextRequest) {
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
  const ym = `${year}-${month.padStart(2, '0')}`

  const body = await req.json()
  const value = body?.value as string | null | undefined
  const source = body?.source === 'manual' ? 'manual' : 'auto'

  // 空串或 null 表示清除覆盖 → 删除该行
  if (value === '' || value == null) {
    await db
      .delete(dueOverrides)
      .where(and(eq(dueOverrides.userId, userId), eq(dueOverrides.month, ym)))
    return NextResponse.json({ ok: true })
  }

  await db
    .insert(dueOverrides)
    .values({ userId, month: ym, value, source, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [dueOverrides.userId, dueOverrides.month],
      set: { value, source, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
