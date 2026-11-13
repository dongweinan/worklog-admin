// Docker 启动脚本:先执行数据库迁移(建表),再启动 Next server
import { spawn } from 'node:child_process'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

async function main() {
  console.log('[entrypoint] 开始执行数据库迁移...')

  // 用与 lib/db.ts 相同的 node-postgres 驱动连接数据库
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle({ client: pool })

  // 读取 /app/drizzle 下的迁移并依序执行建表
  await migrate(db, { migrationsFolder: './drizzle' })
  await pool.end()
  console.log('[entrypoint] 迁移完成,启动 Next 服务...')

  // 启动 standalone 的服务端(server.js 由 next build 在 .next/standalone 生成)
  const child = spawn('node', ['server.js'], { stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code ?? 1))
}

main().catch((err) => {
  console.error('[entrypoint] 启动失败:', err)
  process.exit(1)
})
