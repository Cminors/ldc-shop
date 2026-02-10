import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { orders, loginUsers } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { getLoginUserEmail, getLoginUserDesktopNotificationsEnabled, getSetting, getUserNotifications } from "@/lib/db/queries"
import { ProfileContent } from "@/components/profile-content"
import { unstable_noStore } from "next/cache"

export default async function ProfilePage() {
    unstable_noStore()
    const session = await auth()
    
    if (!session?.user?.id) {
        redirect("/")
    }

    const userId = session.user.id

    // Get user points
    let userPoints = 0
    let profileEmail: string | null = null
    let checkinEnabled = true
    let desktopNotificationsEnabled = false
    try {
        const userResult = await db.select({ points: loginUsers.points })
            .from(loginUsers)
            .where(eq(loginUsers.userId, userId))
            .limit(1)
        userPoints = userResult[0]?.points || 0
    } catch {
        userPoints = 0
    }

    try {
        profileEmail = await getLoginUserEmail(userId)
    } catch {
        profileEmail = null
    }
    try {
        desktopNotificationsEnabled = await getLoginUserDesktopNotificationsEnabled(userId)
    } catch {
        desktopNotificationsEnabled = false
    }
    try {
        const v = await getSetting('checkin_enabled')
        checkinEnabled = v !== 'false'
    } catch {
        checkinEnabled = true
    }

    // Get order statistics
    let orderStats = { total: 0, pending: 0, delivered: 0 }
    try {
        const statsResult = await db.select({
            total: sql<number>`count(*)`,
            pending: sql<number>`sum(case when ${orders.status} = 'pending' then 1 else 0 end)`,
            delivered: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`
        })
            .from(orders)
            .where(eq(orders.userId, userId))
        
        if (statsResult[0]) {
            orderStats = {
                total: Number(statsResult[0].total) || 0,
                pending: Number(statsResult[0].pending) || 0,
                delivered: Number(statsResult[0].delivered) || 0
            }
        }
    } catch {
        // Ignore errors
    }

    // Get recent notifications
    let notifications: Array<{
        id: number
        type: string
        titleKey: string
        contentKey: string
        data: string | null
        isRead: boolean | null
        createdAt: number | null
    }> = []
    try {
        const rows = await getUserNotifications(userId, 20)
        notifications = rows.map((n) => ({
            id: n.id,
            type: n.type,
            titleKey: n.titleKey,
            contentKey: n.contentKey,
            data: n.data,
            isRead: n.isRead,
            createdAt: n.createdAt ? new Date(n.createdAt as any).getTime() : null
        }))
    } catch {
        notifications = []
    }

    return (
        <ProfileContent
            user={{
                id: session.user.id,
                name: session.user.name || session.user.username || "User",
                username: session.user.username || null,
                avatar: session.user.avatar_url || null,
                email: profileEmail || session.user.email || null,
                trustLevel: session.user.trustLevel ?? 0
            }}
            points={userPoints}
            checkinEnabled={checkinEnabled}
            orderStats={orderStats}
            notifications={notifications}
            desktopNotificationsEnabled={desktopNotificationsEnabled}
        />
    )
}
