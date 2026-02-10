"use server"

import { db } from "@/lib/db"
import { adminMessages, loginUsers, userNotifications, broadcastMessages, broadcastReads } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { checkAdmin } from "@/actions/admin"
import { revalidatePath } from "next/cache"

type TargetType = "all" | "username" | "userId"

async function ensureAdminMessagesTable() {
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS admin_messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_type TEXT NOT NULL,
            target_value TEXT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            sender TEXT,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `)
}

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

async function ensureUserNotificationsTable() {
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS user_notifications(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL REFERENCES login_users(user_id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title_key TEXT NOT NULL,
            content_key TEXT NOT NULL,
            data TEXT,
            is_read INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `)
}

export async function sendAdminMessage(params: {
    targetType: TargetType
    targetValue?: string
    title: string
    body: string
}) {
    await checkAdmin()

    const title = (params.title || '').trim()
    const body = (params.body || '').trim()
    if (!title || !body) {
        return { success: false, error: "admin.messages.missing" }
    }

    const targetType = params.targetType
    const targetValue = (params.targetValue || '').trim()
    if (!["all", "username", "userId"].includes(targetType)) {
        return { success: false, error: "admin.messages.invalidTarget" }
    }
    if (targetType !== "all" && !targetValue) {
        return { success: false, error: "admin.messages.invalidTarget" }
    }

    await ensureAdminMessagesTable()
    await ensureUserNotificationsTable()

    const session = await import("@/lib/auth").then((m) => m.auth())
    const sender = session?.user?.username || session?.user?.name || null

    const payload = JSON.stringify({ title, body })
    const now = new Date()
    const chunkSize = 40 // keep SQL variables well under D1 SQLite variable limit
    let sentCount = 0

    const insertChunk = async (ids: string[]) => {
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize)
            await db.insert(userNotifications).values(
                chunk.map((id) => ({
                    userId: id,
                    type: "admin_message",
                    titleKey: "profile.notifications.adminMessageTitle",
                    contentKey: "profile.notifications.adminMessageBody",
                    data: payload,
                    isRead: false,
                    createdAt: now
                }))
            )
            sentCount += chunk.length
        }
    }

    if (targetType === "all") {
        await ensureBroadcastTables()
        await db.insert(broadcastMessages).values({
            title,
            body,
            sender,
            createdAt: now
        })
        const totalRow = await db.select({ count: sql<number>`count(*)` }).from(loginUsers)
        const totalUsers = Number(totalRow[0]?.count || 0)
        await db.insert(adminMessages).values({
            targetType,
            targetValue: null,
            title,
            body,
            sender,
            createdAt: now
        })
        revalidatePath("/admin/messages")
        return { success: true, count: totalUsers }
    } else if (targetType === "username") {
        const username = targetValue.toLowerCase()
        const rows = await db
            .select({ id: loginUsers.userId })
            .from(loginUsers)
            .where(sql`LOWER(${loginUsers.username}) = ${username}`)
            .limit(1)
        const ids = rows.map((r) => r.id).filter(Boolean)
        if (ids.length === 0) {
            return { success: false, error: "admin.messages.userNotFound" }
        }
        await insertChunk(ids)
    } else {
        const rows = await db
            .select({ id: loginUsers.userId })
            .from(loginUsers)
            .where(eq(loginUsers.userId, targetValue))
            .limit(1)
        const ids = rows.map((r) => r.id).filter(Boolean)
        if (ids.length === 0) {
            return { success: false, error: "admin.messages.userNotFound" }
        }
        await insertChunk(ids)
    }

    await db.insert(adminMessages).values({
        targetType,
        targetValue,
        title,
        body,
        sender,
        createdAt: new Date()
    })

    revalidatePath("/admin/messages")
    return { success: true, count: sentCount }
}

export async function deleteAdminMessage(id: number) {
    await checkAdmin()
    await ensureAdminMessagesTable()
    await db.delete(adminMessages).where(eq(adminMessages.id, id))
    revalidatePath("/admin/messages")
    return { success: true }
}

export async function clearAdminMessages() {
    await checkAdmin()
    await ensureAdminMessagesTable()
    await db.delete(adminMessages)
    try {
        await ensureBroadcastTables()
        await db.delete(broadcastReads)
        await db.delete(broadcastMessages)
    } catch {
        // ignore
    }
    revalidatePath("/admin/messages")
    return { success: true }
}
