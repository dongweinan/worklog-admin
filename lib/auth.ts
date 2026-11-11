import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
import { users } from './schema'
import { eq } from 'drizzle-orm'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

// 用微信临时 code 换取 openid（code2session）
// 如未配置 AppSecret，则降级为"开发模式"，用 AppID 生成稳定开发 openid
export async function exchangeCodeForOpenid(code: string): Promise<string> {
  const appid = process.env.WECHAT_APPID
  const appSecret = process.env.WECHAT_APPSECRET

  if (!appSecret) {
    return `dev_${appid}`
  }

  const url =
    'https://api.weixin.qq.com/sns/jscode2session' +
    `?appid=${appid}&secret=${appSecret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  const data = await res.json()

  if (!data.openid) {
    throw new Error(`微信登录失败: ${JSON.stringify(data)}`)
  }
  return data.openid as string
}

// 根据 openid 找到或创建用户，返回用户记录
export async function findOrCreateUser(openid: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.openid, openid),
  })
  if (existing) {
    return { user: existing, isNew: false }
  }
  const [created] = await db.insert(users).values({ openid }).returning()
  return { user: created, isNew: true }
}

// 为指定用户签发 token
export async function signToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

// 从 token 解析出 userId；无效则返回 null
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.userId as number) ?? null
  } catch {
    return null
  }
}
