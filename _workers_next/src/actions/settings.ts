'use server'

import { setSetting, getSetting } from "@/lib/db/queries"
import { revalidatePath, updateTag } from "next/cache"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { checkAdmin } from "@/actions/admin"

export type AnnouncementConfig = {
    content: string
    startAt?: string | null
    endAt?: string | null
}

function parseAnnouncement(raw: string | null): AnnouncementConfig | null {
    if (!raw) return null
    const text = String(raw)
    try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
            return {
                content: parsed.content,
                startAt: parsed.startAt ?? null,
                endAt: parsed.endAt ?? null,
            }
        }
    } catch {
        // fall through
    }
    return { content: text, startAt: null, endAt: null }
}

export async function saveAnnouncement(config: AnnouncementConfig) {
    await checkAdmin()

    const content = String(config.content || '')
    const startAt = config.startAt ? String(config.startAt) : null
    const endAt = config.endAt ? String(config.endAt) : null

    const payload = JSON.stringify({ content, startAt, endAt })
    try {
        await setSetting('announcement', payload)
    } catch (error: any) {
        // If settings table doesn't exist, create it
        if (error.message?.includes('does not exist') ||
            error.code === '42P01' ||
            JSON.stringify(error).includes('42P01')) {
            await db.run(sql`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at INTEGER DEFAULT (unixepoch() * 1000)
                )
            `)
            // Retry the insert
            await setSetting('announcement', payload)
        } else {
            throw error
        }
    }
    revalidatePath('/')
    revalidatePath('/admin/announcement')
    updateTag('home:announcement')
    return { success: true }
}

export async function getAnnouncementConfig(): Promise<AnnouncementConfig | null> {
    try {
        const raw = await getSetting('announcement')
        return parseAnnouncement(raw)
    } catch {
        return null
    }
}

export async function getActiveAnnouncement(now: Date = new Date()): Promise<string | null> {
    const cfg = await getAnnouncementConfig()
    if (!cfg?.content?.trim()) return null
    const startOk = cfg.startAt ? now >= new Date(cfg.startAt) : true
    const endOk = cfg.endAt ? now <= new Date(cfg.endAt) : true
    return startOk && endOk ? cfg.content : null
}
