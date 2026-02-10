import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AdminOrderDetailContent } from "@/components/admin/order-detail-content"
import { unstable_noStore } from "next/cache"

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  unstable_noStore()
  const { id } = await params
  const order = await db.query.orders.findFirst({ where: eq(orders.orderId, id) })
  if (!order) return notFound()

  return (
    <AdminOrderDetailContent
      order={{
        orderId: order.orderId,
        username: order.username,
        userId: order.userId,
        email: order.email,
        productId: order.productId,
        productName: order.productName,
        amount: order.amount,
        status: order.status,
        tradeNo: order.tradeNo,
        cardKey: order.cardKey,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        deliveredAt: order.deliveredAt,
      }}
    />
  )
}
