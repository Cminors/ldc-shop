'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { orders, refundRequests } from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { checkAdmin } from "@/actions/admin"
import { products } from "@/lib/db/schema"
import { notifyAdminRefundRequest } from "@/lib/notifications"
import { markOrderRefunded, proxyRefund } from "@/actions/refund"
import { createUserNotification } from "@/lib/db/queries"

async function ensureRefundRequestsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      admin_username TEXT,
      admin_note TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      updated_at INTEGER DEFAULT (unixepoch() * 1000),
      processed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS refund_requests_order_id_idx ON refund_requests(order_id);
  `)
}

export async function requestRefund(orderId: string, reason: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) throw new Error("Unauthorized")

  await ensureRefundRequestsTable()

  const order = await db.query.orders.findFirst({ where: eq(orders.orderId, orderId) })
  if (!order) throw new Error("Order not found")
  if (order.userId !== user.id) throw new Error("Unauthorized")

  const status = order.status || 'pending'
  if (status !== 'paid' && status !== 'delivered') throw new Error("Order is not refundable")

  const existing = await db.query.refundRequests.findFirst({
    where: and(eq(refundRequests.orderId, orderId), eq(refundRequests.userId, user.id)),
    orderBy: [desc(refundRequests.createdAt)],
  })
  if (existing && existing.status !== 'rejected' && existing.status !== 'processed') {
    return { ok: true }
  }

  await db.insert(refundRequests).values({
    orderId,
    userId: user.id,
    username: user.username || null,
    reason: (reason || '').trim() || null,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const product = await db.query.products.findFirst({
    where: eq(products.id, order.productId),
    columns: { name: true }
  })

  await notifyAdminRefundRequest({
    orderId,
    productName: product?.name || 'Unknown',
    amount: order.amount,
    username: user.username,
    reason: reason || null
  })

  revalidatePath(`/order/${orderId}`)
  revalidatePath('/admin/refunds')
  return { ok: true }
}

export async function adminApproveRefund(requestId: number, adminNote?: string) {
  await checkAdmin()
  await ensureRefundRequestsTable()

  const session = await auth()
  const username = session?.user?.username || null

  const req = await db.query.refundRequests.findFirst({
    where: eq(refundRequests.id, requestId),
    columns: { orderId: true, status: true }
  })
  if (!req) {
    throw new Error("Refund request not found")
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, req.orderId),
    columns: { orderId: true, tradeNo: true, amount: true, userId: true, productName: true }
  })
  if (!order) {
    throw new Error("Order not found")
  }

  await db.update(refundRequests).set({
    status: 'approved',
    adminUsername: username,
    adminNote: adminNote || null,
    updatedAt: new Date(),
  }).where(eq(refundRequests.id, requestId))

  if (order.userId) {
    await createUserNotification({
      userId: order.userId,
      type: 'refund_approved',
      titleKey: 'profile.notifications.refundApprovedTitle',
      contentKey: 'profile.notifications.refundApprovedBody',
      data: {
        params: {
          orderId: order.orderId,
          productName: order.productName || 'Product'
        },
        href: `/order/${order.orderId}`
      }
    })
  }

  revalidatePath('/admin/refunds')

  // Auto refund for approved requests
  if (!order.tradeNo || Number(order.amount) <= 0) {
    await markOrderRefunded(order.orderId)
    return { ok: true, processed: true }
  }

  try {
    const result = await proxyRefund(order.orderId)
    if (result?.processed) {
      return { ok: true, processed: true }
    }
    return { ok: true, processed: false, error: result?.message || 'refund_failed' }
  } catch (e: any) {
    return { ok: true, processed: false, error: e?.message || 'refund_failed' }
  }
}

export async function adminRejectRefund(requestId: number, adminNote?: string) {
  await checkAdmin()
  await ensureRefundRequestsTable()

  const session = await auth()
  const username = session?.user?.username || null

  const req = await db.query.refundRequests.findFirst({
    where: eq(refundRequests.id, requestId),
    columns: { orderId: true }
  })
  if (!req) {
    throw new Error("Refund request not found")
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderId, req.orderId),
    columns: { orderId: true, userId: true, productName: true }
  })

  await db.update(refundRequests).set({
    status: 'rejected',
    adminUsername: username,
    adminNote: adminNote || null,
    updatedAt: new Date(),
  }).where(eq(refundRequests.id, requestId))

  if (order?.userId) {
    const note = (adminNote || "").trim()
    await createUserNotification({
      userId: order.userId,
      type: 'refund_rejected',
      titleKey: 'profile.notifications.refundRejectedTitle',
      contentKey: note ? 'profile.notifications.refundRejectedBodyWithNote' : 'profile.notifications.refundRejectedBody',
      data: {
        params: {
          orderId: order.orderId,
          productName: order.productName || 'Product',
          adminNote: note ? note.slice(0, 200) : undefined
        },
        href: `/order/${order.orderId}`
      }
    })
  }

  revalidatePath('/admin/refunds')
}

export async function getPendingRefundRequestCount() {
  await checkAdmin()
  await ensureRefundRequestsTable()
  const rows = await db.select({
    count: sql<number>`count(*)`
  }).from(refundRequests).where(eq(refundRequests.status, 'pending'))
  return { success: true, count: Number(rows[0]?.count || 0) }
}
