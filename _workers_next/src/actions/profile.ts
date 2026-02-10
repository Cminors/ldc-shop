'use server'

import { auth } from "@/lib/auth"
import { updateLoginUserEmail, updateLoginUserDesktopNotificationsEnabled } from "@/lib/db/queries"

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function updateProfileEmail(emailInput: string) {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: 'common.error' }
    }

    const email = (emailInput || '').trim()
    if (email && !isValidEmail(email)) {
        return { success: false, error: 'profile.emailInvalid' }
    }

    await updateLoginUserEmail(userId, email || null)
    return { success: true }
}

export async function updateDesktopNotifications(enabled: boolean) {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return { success: false, error: 'common.error' }
    }
    try {
        await updateLoginUserDesktopNotificationsEnabled(userId, Boolean(enabled))
        return { success: true }
    } catch {
        return { success: false, error: 'common.error' }
    }
}
