import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { orders, reviews } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"
import { OrdersContent } from "@/components/orders-content"
import { cancelExpiredOrders, normalizeTimestampMs } from "@/lib/db/queries"
import { unstable_noStore } from "next/cache"

export default async function OrdersPage() {
    unstable_noStore()
    const session = await auth()
    if (!session?.user) redirect('/login')

    try {
        await cancelExpiredOrders({ userId: session.user.id || undefined })
    } catch {
        // Best effort cleanup
    }

    const userOrders = await db.query.orders.findMany({
        where: eq(orders.userId, session.user.id || ''),
        orderBy: [desc(normalizeTimestampMs(orders.createdAt))]
    })

    // Get reviewed order IDs for delivered orders
    const deliveredOrderIds = userOrders
        .filter((o: any) => o.status === 'delivered')
        .map((o: any) => o.orderId)
    
    let reviewedOrderIds: string[] = []
    if (deliveredOrderIds.length > 0) {
        try {
            const reviewedOrders = await db.select({ orderId: reviews.orderId })
                .from(reviews)
                .where(inArray(reviews.orderId, deliveredOrderIds))
            reviewedOrderIds = reviewedOrders.map((r: { orderId: string }) => r.orderId)
        } catch {
            // Ignore errors (table might not exist)
        }
    }

    return (
        <OrdersContent
            orders={userOrders.map((o: any) => ({
                orderId: o.orderId,
                productId: o.productId,
                productName: o.productName,
                amount: o.amount,
                status: o.status,
                createdAt: o.createdAt,
                canReview: o.status === 'delivered' && !reviewedOrderIds.includes(o.orderId)
            }))}
        />
    )
}
