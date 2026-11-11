import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// GET /api/settings
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const row = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  })

  return NextResponse.json({
    standardHours: row ? Number(row.standardHours) : 8,
    lunchHours: row ? Number(row.lunchHours) : 1,
    goalHours: row ? Number(row.goalHours) : 10,
  })
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const body = await req.json()
  const standardHours = body?.standardHours as number | undefined
  const lunchHours = body?.lunchHours as number | undefined
  const goalHours = body?.goalHours as number | undefined

  await db
    .insert(settings)
    .values({
      userId,
      standardHours: standardHours == null ? '8' : String(standardHours),
      lunchHours: lunchHours == null ? '1' : String(lunchHours),
      goalHours: goalHours == null ? '10' : String(goalHours),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [settings.userId],
      set: {
        standardHours: standardHours == null ? '8' : String(standardHours),
        lunchHours: lunchHours == null ? '1' : String(lunchHours),
        goalHours: goalHours == null ? '10' : String(goalHours),
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true })
}
