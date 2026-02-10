import { db } from "@/lib/db"
import { orders, refundRequests } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { AdminRefundsContent } from "@/components/admin/refunds-content"
import { unstable_noStore } from "next/cache"

function isMissingTable(error: any) {
  const errorString = JSON.stringify(error)
  return (
    error?.message?.includes('does not exist') ||
    error?.cause?.message?.includes('does not exist') ||
    errorString.includes('42P01') ||
    (errorString.includes('relation') && errorString.includes('does not exist'))
  )
}

export default async function AdminRefundsPage() {
  unstable_noStore()
  let rows: any[] = []
  try {
    rows = await db
      .select({
        id: refundRequests.id,
        orderId: refundRequests.orderId,
        userId: refundRequests.userId,
        username: refundRequests.username,
        reason: refundRequests.reason,
        status: refundRequests.status,
        adminUsername: refundRequests.adminUsername,
        adminNote: refundRequests.adminNote,
        createdAt: refundRequests.createdAt,
        updatedAt: refundRequests.updatedAt,
        processedAt: refundRequests.processedAt,
        orderStatus: orders.status,
        tradeNo: orders.tradeNo,
        amount: orders.amount,
        productName: orders.productName,
        cardKey: orders.cardKey,
      })
      .from(refundRequests)
      .leftJoin(orders, eq(refundRequests.orderId, orders.orderId))
      .orderBy(desc(refundRequests.createdAt))
      .limit(200)
  } catch (e: any) {
    if (!isMissingTable(e)) throw e
    rows = []
  }

  return <AdminRefundsContent requests={rows} />
}
