import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// 用户表：微信静默登录，openid 唯一
export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    openid: varchar('openid', { length: 64 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('users_openid_idx').on(t.openid)],
)

// 考勤记录表：一行 = 用户某一天，同一用户同一天唯一
export const records = pgTable(
  'records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    onDutyTime: varchar('on_duty_time', { length: 5 }).notNull().default(''), // HH:mm
    offDutyTime: varchar('off_duty_time', { length: 5 }).notNull().default(''), // HH:mm
    attendance: numeric('attendance', { precision: 2, scale: 1 })
      .notNull()
      .default('0'), // 0 / 0.5 / 1
    workHours: numeric('work_hours', { precision: 5, scale: 1 })
      .notNull()
      .default('0'),
    note: varchar('note', { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    uniqueIndex('records_user_date_unique').on(t.userId, t.date),
    index('records_user_id_idx').on(t.userId),
  ],
)

// 设置表：每用户一行
export const settings = pgTable('settings', {
  userId: bigint('user_id', { mode: 'number' })
    .primaryKey()
    .references(() => users.id),
  standardHours: numeric('standard_hours', { precision: 5, scale: 1 })
    .notNull()
    .default('8'),
  lunchHours: numeric('lunch_hours', { precision: 5, scale: 1 })
    .notNull()
    .default('1'),
  goalHours: numeric('goal_hours', { precision: 5, scale: 1 })
    .notNull()
    .default('10'),
  updatedAt: timestamp('updated_at'),
})

// 应出勤天数覆盖表：每用户每月一条
// source: 'manual'（用户手动设置）| 'auto'（前端节假日表自动兜底，用户未改时）
export const dueOverrides = pgTable(
  'due_override',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    month: varchar('month', { length: 7 }).notNull(), // YYYY-MM
    value: varchar('value', { length: 10 }).notNull(), // 例如 '21'
    source: varchar('source', { length: 10 }).notNull().default('manual'), // manual | auto
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    uniqueIndex('due_override_user_month_unique').on(t.userId, t.month),
    index('due_override_user_id_idx').on(t.userId),
  ],
)

export type User = typeof users.$inferSelect
export type Record = typeof records.$inferSelect
export type Settings = typeof settings.$inferSelect
export type DueOverride = typeof dueOverrides.$inferSelect
