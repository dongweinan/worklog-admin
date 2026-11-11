import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

// 从请求头 Authorization: Bearer <token> 解析出 userId
export async function getUserId(req: NextRequest): Promise<number | null> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  return verifyToken(token)
}

// 校验是否登录，未登录返回 401
export async function requireUser(
  req: NextRequest,
): Promise<{ userId: number } | { error: NextResponse }> {
  const userId = await getUserId(req)
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 },
      ),
    }
  }
  return { userId }
}
