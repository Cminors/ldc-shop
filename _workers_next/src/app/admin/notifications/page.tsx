import { checkAdmin } from "@/actions/admin"
import { NotificationsContent } from "@/components/admin/notifications-content"
import { getNotificationSettings } from "@/lib/notifications"
import { getEmailSettings } from "@/lib/email"

export default async function NotificationsPage() {
    await checkAdmin()
    const [settings, emailSettings] = await Promise.all([
        getNotificationSettings(),
        getEmailSettings()
    ])

    return (
        <NotificationsContent settings={{
            telegramBotToken: settings.token || '',
            telegramChatId: settings.chatId || '',
            telegramLanguage: settings.language || 'zh',
            resendApiKey: emailSettings.apiKey || '',
            resendFromEmail: emailSettings.fromEmail || '',
            resendFromName: emailSettings.fromName || '',
            resendEnabled: emailSettings.enabled,
            emailLanguage: emailSettings.language || 'zh'
        }} />
    )
}
