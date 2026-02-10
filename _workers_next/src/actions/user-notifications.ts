"use server"

import { auth } from "@/lib/auth"
import { clearUserNotifications, getSetting, getUserNotifications, getUserUnreadNotificationCount, markAllUserNotificationsRead, markUserNotificationRead, setSetting } from "@/lib/db/queries"
import { broadcastMessages, broadcastReads } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { and, desc, eq, gte, sql } from "drizzle-orm"

const BROADCAST_LIMIT = 10

const broadcastClearKey = (userId: string) => `broadcast_cleared_at:${userId}`

async function ensureBroadcastTables() {
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS broadcast_messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            sender TEXT,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `)
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS broadcast_reads(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES login_users(user_id) ON DELETE CASCADE,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `)
}

async function getBroadcastClearedAt(userId: string) {
    try {
        const raw = await getSetting(broadcastClearKey(userId))
        const val = Number(raw || 0)
        if (!Number.isFinite(val)) return 0
        // If value looks like seconds, convert to ms
        return val > 0 && val < 1_000_000_000_000 ? val * 1000 : val
    } catch {
        return 0
    }
}

async function setBroadcastClearedAt(userId: string, timestampMs: number) {
    try {
        await setSetting(broadcastClearKey(userId), String(timestampMs))
    } catch {
        // ignore
    }
}

export async function markAllNotificationsRead() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    await markAllUserNotificationsRead(userId)
    try {
        await ensureBroadcastTables()
        const now = Date.now()
        await db.run(sql`
            INSERT OR IGNORE INTO broadcast_reads (message_id, user_id, created_at)
            SELECT m.id, ${userId}, ${now}
            FROM broadcast_messages m
            WHERE NOT EXISTS (
                SELECT 1 FROM broadcast_reads r
                WHERE r.message_id = m.id AND r.user_id = ${userId}
            )
        `)
    } catch {
        // ignore
    }
    return { success: true }
}

export async function getMyNotifications() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    const rows = await getUserNotifications(userId, 20)
    const directItems = rows.map((n) => ({
        id: n.id,
        type: n.type,
        titleKey: n.titleKey,
        contentKey: n.contentKey,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt ? new Date(n.createdAt as any).getTime() : null
    }))

    let broadcastItems: any[] = []
    try {
        await ensureBroadcastTables()
        const clearedAt = await getBroadcastClearedAt(userId)
        const clearDate = clearedAt > 0 ? new Date(clearedAt) : null
        const broadcasts = clearedAt > 0
            ? await db
                .select({
                    id: broadcastMessages.id,
                    title: broadcastMessages.title,
                    body: broadcastMessages.body,
                    sender: broadcastMessages.sender,
                    createdAt: broadcastMessages.createdAt,
                })
                .from(broadcastMessages)
                .where(gte(broadcastMessages.createdAt, clearDate!))
                .orderBy(desc(broadcastMessages.createdAt))
                .limit(BROADCAST_LIMIT)
            : await db
                .select({
                    id: broadcastMessages.id,
                    title: broadcastMessages.title,
                    body: broadcastMessages.body,
                    sender: broadcastMessages.sender,
                    createdAt: broadcastMessages.createdAt,
                })
                .from(broadcastMessages)
                .orderBy(desc(broadcastMessages.createdAt))
                .limit(BROADCAST_LIMIT)

        if (broadcasts.length > 0) {
            const ids = broadcasts.map((b) => b.id)
            const readRows = await db
                .select({ id: broadcastReads.messageId })
                .from(broadcastReads)
                .where(and(eq(broadcastReads.userId, userId), sql`${broadcastReads.messageId} IN (${sql.join(ids)})`))
            const readSet = new Set(readRows.map((r) => Number(r.id)))
            broadcastItems = broadcasts.map((b) => {
                const bid = Number(b.id)
                return ({
                    id: bid,
                    type: "broadcast",
                    titleKey: "profile.notifications.adminMessageTitle",
                    contentKey: "profile.notifications.adminMessageBody",
                    data: JSON.stringify({ title: b.title, body: b.body }),
                    isRead: readSet.has(bid),
                    createdAt: b.createdAt ? new Date(b.createdAt as any).getTime() : null
                })
            })
        }
    } catch {
        broadcastItems = []
    }

    const items = [...broadcastItems, ...directItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return { success: true, items }
}

export async function getMyUnreadCount() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    const directCount = await getUserUnreadNotificationCount(userId)
    let broadcastUnread = 0
    try {
        await ensureBroadcastTables()
        const clearedAt = await getBroadcastClearedAt(userId)
        const clearDate = clearedAt > 0 ? new Date(clearedAt) : null
        const broadcastRows = clearedAt > 0
            ? await db
                .select({ id: broadcastMessages.id })
                .from(broadcastMessages)
                .where(gte(broadcastMessages.createdAt, clearDate!))
                .orderBy(desc(broadcastMessages.createdAt))
                .limit(BROADCAST_LIMIT)
            : await db
                .select({ id: broadcastMessages.id })
                .from(broadcastMessages)
                .orderBy(desc(broadcastMessages.createdAt))
                .limit(BROADCAST_LIMIT)
        const ids = broadcastRows.map((b) => b.id)
        if (ids.length === 0) {
            broadcastUnread = 0
        } else {
            const readRow = await db.select({ count: sql<number>`count(DISTINCT ${broadcastReads.messageId})` })
                .from(broadcastReads)
                .where(and(eq(broadcastReads.userId, userId), sql`${broadcastReads.messageId} IN (${sql.join(ids)})`))
            const read = Number(readRow[0]?.count || 0)
            broadcastUnread = Math.max(0, ids.length - read)
        }
    } catch {
        broadcastUnread = 0
    }
    return { success: true, count: directCount + broadcastUnread }
}

export async function markNotificationRead(id: number) {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    await markUserNotificationRead(userId, id)
    try {
        await ensureBroadcastTables()
        const messageId = Number(id)
        if (Number.isFinite(messageId)) {
            const exists = await db
                .select({ id: broadcastMessages.id })
                .from(broadcastMessages)
                .where(eq(broadcastMessages.id, messageId))
                .limit(1)
            if (exists.length > 0) {
                const now = Date.now()
                await db.run(sql`
                    INSERT OR IGNORE INTO broadcast_reads (message_id, user_id, created_at)
                    VALUES (${messageId}, ${userId}, ${now})
                `)
            }
        }
    } catch {
        // ignore
    }
    return { success: true }
}

export async function clearMyNotifications() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    await clearUserNotifications(userId)
    await setBroadcastClearedAt(userId, Date.now())
    try {
        await ensureBroadcastTables()
        const now = Date.now()
        await db.run(sql`
            INSERT OR IGNORE INTO broadcast_reads (message_id, user_id, created_at)
            SELECT m.id, ${userId}, ${now}
            FROM broadcast_messages m
        `)
    } catch {
        // ignore
    }
    return { success: true }
}
