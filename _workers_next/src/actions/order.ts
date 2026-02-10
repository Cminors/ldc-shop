'use server'

import { auth } from "@/lib/auth"
import { queryOrderStatus } from "@/lib/epay"
import { processOrderFulfillment } from "@/lib/order-processing"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { orders, cards } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withOrderColumnFallback, recalcProductAggregates } from "@/lib/db/queries"
import { cookies } from "next/headers"
import { updateTag } from "next/cache"

export async function checkOrderStatus(orderId: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    // Check ownership
    const order = await withOrderColumnFallback(async () => {
        return await db.query.orders.findFirst({
            where: eq(orders.orderId, orderId),
            columns: { userId: true, status: true, amount: true, currentPaymentId: true }
        })
    })

    if (!order) return { success: false, error: 'Order not found' }
    if (order.status === 'paid' || order.status === 'delivered') {
        return { success: true, status: order.status }
    }

    const cookieStore = await cookies()
    const pending = cookieStore.get('ldc_pending_order')?.value
    const hasPendingCookie = pending === orderId

    // Allow checking if user owns it OR if they have the pending cookie
    if (order.userId) {
        if (order.userId !== session.user.id && !hasPendingCookie) {
            return { success: false, error: 'Unauthorized' }
        }
    } else if (!hasPendingCookie) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Use the latest payment ID (retry ID) if available, otherwise fallback to orderId
        const tradeNoToCheck = order.currentPaymentId || orderId
        const result = await queryOrderStatus(tradeNoToCheck)

        if (result.success && result.status === 1) { // 1 = Paid
            // trade_no might be in result.data or result.trade_no?
            // queryOrderStatus returns { ..., data: fullResponse }

            const tradeNo = result.data?.trade_no || result.data?.transaction_id || `MANUAL_CHECK_${Date.now()}`
            const paidAmount = parseFloat(result.data?.money || order.amount)

            await processOrderFulfillment(orderId, paidAmount, tradeNo)

            revalidatePath(`/order/${orderId}`)
            return { success: true, status: 'paid' } // or 'delivered' implicitly via revalidate
        }

        return { success: false, status: 'pending' }

    } catch (e: any) {
        console.error("Check order status failed", e)
        return { success: false, error: e.message }
    }
}

export async function cancelPendingOrder(orderId: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'common.error' }

    // Check ownership and status
    const order = await withOrderColumnFallback(async () => {
        return await db.query.orders.findFirst({
            where: eq(orders.orderId, orderId),
            columns: { userId: true, status: true, productId: true }
        })
    })

    if (!order) return { success: false, error: 'order.notFound' }
    if (order.userId !== session.user.id) return { success: false, error: 'common.error' }
    if (order.status !== 'pending') return { success: false, error: 'order.cannotCancel' }

    try {
        // Release reserved cards
        await db.update(cards)
            .set({ reservedOrderId: null, reservedAt: null })
            .where(eq(cards.reservedOrderId, orderId))

        // Update order status
        await db.update(orders)
            .set({ status: 'cancelled' })
            .where(eq(orders.orderId, orderId))

        revalidatePath(`/order/${orderId}`)
        revalidatePath('/orders')
        if (order.productId) {
            try {
                await recalcProductAggregates(order.productId)
            } catch {
                // best effort
            }
        }
        try {
            updateTag('home:products')
        } catch {
            // best effort
        }
        
        return { success: true }
    } catch (e: any) {
        console.error("Cancel order failed", e)
        return { success: false, error: 'common.error' }
    }
}
