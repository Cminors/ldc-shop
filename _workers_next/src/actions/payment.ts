'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { generateOrderId, generateSign } from "@/lib/crypto"
import { cookies } from "next/headers"
import { PAYMENT_PRODUCT_ID, PAYMENT_PRODUCT_NAME } from "@/lib/payment"
import { withOrderColumnFallback } from "@/lib/db/queries"
import { getAdminUsernames } from "@/lib/admin-auth"

function normalizeAmount(input: number | string) {
    const parsed = Number.parseFloat(String(input))
    if (!Number.isFinite(parsed)) return null
    const rounded = Math.round(parsed * 100) / 100
    if (rounded <= 0) return null
    return rounded
}

export async function createPaymentOrder(amountInput: number | string, payeeInput?: string | null) {
    const session = await auth()
    const user = session?.user

    const normalized = normalizeAmount(amountInput)
    if (!normalized) {
        return { success: false, error: 'payment.invalidAmount' }
    }

    const adminUsers = getAdminUsernames()
    const fallbackPayee = adminUsers[0] || null
    const payeeCandidate = (payeeInput || '').trim()
    const matchedAdmin = payeeCandidate
        ? adminUsers.find((name) => name.toLowerCase() === payeeCandidate.toLowerCase())
        : undefined
    const payeeRaw = matchedAdmin || fallbackPayee || ''
    const payee = payeeRaw ? payeeRaw.slice(0, 80) : null

    const orderId = generateOrderId()
    const amount = normalized.toFixed(2)

    await withOrderColumnFallback(async () => {
        await db.insert(orders).values({
            orderId,
            productId: PAYMENT_PRODUCT_ID,
            productName: PAYMENT_PRODUCT_NAME,
            amount,
            email: user?.email || null,
            userId: user?.id || null,
            username: user?.username || null,
            payee,
            status: 'pending',
            currentPaymentId: orderId,
            createdAt: new Date()
        })
    })

    const cookieStore = await cookies()
    cookieStore.set('ldc_pending_order', orderId, { secure: true, path: '/', sameSite: 'lax' })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const payParams: Record<string, any> = {
        pid: process.env.MERCHANT_ID!,
        type: 'epay',
        out_trade_no: orderId,
        notify_url: `${baseUrl}/api/notify`,
        return_url: `${baseUrl}/callback/${orderId}`,
        name: PAYMENT_PRODUCT_NAME,
        money: amount,
        sign_type: 'MD5'
    }

    payParams.sign = generateSign(payParams, process.env.MERCHANT_KEY!)

    return {
        success: true,
        url: process.env.PAY_URL || 'https://credit.linux.do/epay/pay/submit.php',
        params: payParams
    }
}
