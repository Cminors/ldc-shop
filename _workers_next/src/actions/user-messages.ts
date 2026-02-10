"use server"

import { db } from "@/lib/db"
import { userMessages, loginUsers } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { checkAdmin } from "@/actions/admin"
import { revalidatePath } from "next/cache"

async function ensureUserMessagesTable() {
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS user_messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL REFERENCES login_users(user_id) ON DELETE CASCADE,
            username TEXT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch() * 1000)
        )
    `)
}

export async function sendUserMessage(title: string, body: string) {
    const session = await auth()
    const userId = session?.user?.id
    const username = session?.user?.username || session?.user?.name || null
    if (!userId) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const rows = await db.select({ isBlocked: loginUsers.isBlocked })
            .from(loginUsers)
            .where(eq(loginUsers.userId, userId))
            .limit(1)
        if (rows[0]?.isBlocked) {
            return { success: false, error: "profile.messages.blocked" }
        }
    } catch {
        // ignore if table/column not available yet
    }

    const cleanTitle = (title || '').trim()
    const cleanBody = (body || '').trim()
    if (!cleanTitle || !cleanBody) {
        return { success: false, error: "profile.messages.missing" }
    }

    await ensureUserMessagesTable()
    await db.insert(userMessages).values({
        userId,
        username,
        title: cleanTitle.slice(0, 120),
        body: cleanBody.slice(0, 2000),
        isRead: false,
        createdAt: new Date()
    })

    revalidatePath("/admin/messages")
    return { success: true }
}

export async function getUnreadUserMessageCount() {
    await checkAdmin()
    await ensureUserMessagesTable()
    const rows = await db.select({ count: sql<number>`count(*)` })
        .from(userMessages)
        .where(eq(userMessages.isRead, false))
    return { success: true, count: Number(rows[0]?.count || 0) }
}

export async function markUserMessageRead(id: number) {
    await checkAdmin()
    await ensureUserMessagesTable()
    await db.update(userMessages).set({ isRead: true }).where(eq(userMessages.id, id))
    revalidatePath("/admin/messages")
    return { success: true }
}

export async function deleteUserMessage(id: number) {
    await checkAdmin()
    await ensureUserMessagesTable()
    await db.delete(userMessages).where(eq(userMessages.id, id))
    revalidatePath("/admin/messages")
    return { success: true }
}

export async function clearUserMessages() {
    await checkAdmin()
    await ensureUserMessagesTable()
    await db.delete(userMessages)
    revalidatePath("/admin/messages")
    return { success: true }
}
