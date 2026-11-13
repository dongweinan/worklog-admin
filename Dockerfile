# ─────────────────────────────────────────────────────────────
# 阶段 1:安装依赖(利用 cache 层,依赖没变就不重装)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────
# 阶段 2:构建(编译,产出 standalone 最小运行包)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# 阶段 3:运行(最终镜像,尽量小)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 非 root 运行(最小权限)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# 只拷贝运行必需产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 自动建表用:迁移 SQL + 启动脚本
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/docker-entrypoint.mjs ./docker-entrypoint.mjs
# standalone 精简 node_modules 不含 entrypoint 脚本用到的 drizzle-orm,手动补一份
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

USER nextjs

EXPOSE 3000

# 先跑迁移建表,再启动 Next
CMD ["node", "docker-entrypoint.mjs"]