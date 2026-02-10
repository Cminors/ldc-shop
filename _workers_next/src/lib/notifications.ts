import { getSetting } from "./db/queries"

export async function getNotificationSettings() {
    const token = await getSetting('telegram_bot_token')
    const chatId = await getSetting('telegram_chat_id')
    const language = await getSetting('telegram_language') || 'zh' // 默认中文
    return {
        token,
        chatId,
        language
    }
}

export async function sendTelegramMessage(text: string) {
    try {
        const { token, chatId } = await getNotificationSettings()

        if (!token || !chatId) {
            console.log('[Notification] Skipped: Missing token or chat_id')
            return { success: false, error: 'Missing configuration' }
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[Notification] Telegram API Error:', error)
            return { success: false, error }
        }

        return { success: true }
    } catch (e: any) {
        console.error('[Notification] Send Error:', e)
        return { success: false, error: e.message }
    }
}

// 消息模板
const messages = {
    zh: {
        paymentTitle: '💰 收到新付款！',
        order: '订单号',
        product: '商品',
        amount: '金额',
        user: '用户',
        tradeNo: '交易号',
        guest: '访客',
        noEmail: '无邮箱',
        refundTitle: '↩️ 收到退款申请',
        reason: '原因',
        noReason: '未提供原因',
        manageRefunds: '管理退款'
    },
    en: {
        paymentTitle: '💰 New Payment Received!',
        order: 'Order',
        product: 'Product',
        amount: 'Amount',
        user: 'User',
        tradeNo: 'Trade No',
        guest: 'Guest',
        noEmail: 'No email',
        refundTitle: '↩️ Refund Requested',
        reason: 'Reason',
        noReason: 'No reason provided',
        manageRefunds: 'Manage Refunds'
    }
}

export async function notifyAdminPaymentSuccess(order: {
    orderId: string,
    productName: string,
    amount: string,
    email?: string | null,
    username?: string | null,
    tradeNo?: string | null
}) {
    const { language } = await getNotificationSettings()
    const t = messages[language as keyof typeof messages] || messages.zh

    const text = `
<b>${t.paymentTitle}</b>

<b>${t.order}:</b> <code>${order.orderId}</code>
<b>${t.product}:</b> ${order.productName}
<b>${t.amount}:</b> ${order.amount}
<b>${t.user}:</b> ${order.username || t.guest} (${order.email || t.noEmail})
<b>${t.tradeNo}:</b> <code>${order.tradeNo || 'N/A'}</code>
`.trim()

    return sendTelegramMessage(text)
}

export async function notifyAdminRefundRequest(order: {
    orderId: string,
    productName: string,
    amount: string,
    username?: string | null,
    reason?: string | null
}) {
    const { language } = await getNotificationSettings()
    const t = messages[language as keyof typeof messages] || messages.zh

    const text = `
<b>${t.refundTitle}</b>

<b>${t.order}:</b> <code>${order.orderId}</code>
<b>${t.product}:</b> ${order.productName}
<b>${t.amount}:</b> ${order.amount}
<b>${t.user}:</b> ${order.username || t.guest}
<b>${t.reason}:</b> ${order.reason || t.noReason}

<a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/refunds">${t.manageRefunds}</a>
`.trim()

    return sendTelegramMessage(text)
}

