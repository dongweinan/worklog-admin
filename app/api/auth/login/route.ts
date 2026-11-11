import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForOpenid, findOrCreateUser, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = body?.code as string | undefined
    if (!code) {
      return NextResponse.json({ error: '缺少 code 参数' }, { status: 400 })
    }

    const openid = await exchangeCodeForOpenid(code)
    const { user, isNew } = await findOrCreateUser(openid)
    const token = await signToken(user.id)

    return NextResponse.json({
      token,
      openid,
      isNew,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '登录失败' },
      { status: 400 },
    )
  }
}
