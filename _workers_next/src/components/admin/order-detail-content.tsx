'use client'

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CopyButton } from "@/components/copy-button"
import { ClientDate } from "@/components/client-date"
import { RefundButton } from "@/components/admin/refund-button"
import { toast } from "sonner"
import { markOrderDelivered, markOrderPaid, cancelOrder, updateOrderEmail, deleteOrder } from "@/actions/admin-orders"

function statusVariant(status: string | null) {
  switch (status) {
    case 'delivered': return 'default' as const
    case 'paid': return 'secondary' as const
    case 'refunded': return 'destructive' as const
    case 'cancelled': return 'secondary' as const
    default: return 'outline' as const
  }
}

export function AdminOrderDetailContent({ order }: { order: any }) {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState(order.email || '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const actionLock = useRef(false)

  const status = order.status || 'pending'
  const canMarkPaid = status === 'pending'
  const canMarkDelivered = status === 'paid' && !!order.cardKey
  const canCancel = status === 'pending'
  const canDelete = true

  const handleStatus = async (action: 'paid' | 'delivered' | 'cancel') => {
    if (actionLock.current) return
    try {
      actionLock.current = true
      setActionLoading(true)
      if (action === 'paid') {
        if (!confirm(t('admin.orders.confirmMarkPaid'))) return
        await markOrderPaid(order.orderId)
        toast.success(t('common.success'))
        return
      }
      if (action === 'delivered') {
        if (!confirm(t('admin.orders.confirmMarkDelivered'))) return
        await markOrderDelivered(order.orderId)
        toast.success(t('common.success'))
        return
      }
      if (action === 'cancel') {
        if (!confirm(t('admin.orders.confirmCancel'))) return
        await cancelOrder(order.orderId)
        toast.success(t('common.success'))
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(false)
      actionLock.current = false
    }
  }

  const handleSaveEmail = async () => {
    setSavingEmail(true)
    try {
      await updateOrderEmail(order.orderId, email)
      toast.success(t('common.success'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.orders.detailTitle')}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{order.orderId}</span>
            <Badge variant={statusVariant(order.status)} className="uppercase text-xs">{t(`order.status.${status}`)}</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/orders">{t('common.back')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('admin.orders.detail')}</CardTitle>
          <div className="flex items-center gap-2">
            {canMarkPaid && (
              <Button variant="outline" onClick={() => handleStatus('paid')} disabled={actionLoading}>{t('admin.orders.markPaid')}</Button>
            )}
            {canMarkDelivered && (
              <Button variant="outline" onClick={() => handleStatus('delivered')} disabled={actionLoading}>{t('admin.orders.markDelivered')}</Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => handleStatus('cancel')} disabled={actionLoading}>{t('admin.orders.cancel')}</Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (actionLock.current) return
                  if (!confirm(t('admin.orders.confirmDelete'))) return
                  actionLock.current = true
                  setActionLoading(true)
                  try {
                    await deleteOrder(order.orderId)
                    toast.success(t('common.success'))
                    router.push('/admin/orders')
                  } catch (e: any) {
                    toast.error(e.message)
                  } finally {
                    setActionLoading(false)
                    actionLock.current = false
                  }
                }}
                disabled={actionLoading}
              >
                {t('admin.orders.delete')}
              </Button>
            )}
            <RefundButton order={order} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.product')}</div>
              <div className="font-medium">{order.productName}</div>
              <div className="text-xs text-muted-foreground font-mono">{order.productId}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.amount')}</div>
              <div className="font-medium">{Number(order.amount)} {t('common.credits')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.user')}</div>
              {order.username ? (
                <a
                  href={`https://linux.do/u/${order.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sm hover:underline text-primary"
                >
                  {order.username}
                </a>
              ) : (
                <div className="font-medium text-sm text-muted-foreground">Guest</div>
              )}
              {order.userId && <div className="text-xs text-muted-foreground font-mono">{order.userId}</div>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-email">{t('admin.orders.email')}</Label>
              <div className="flex gap-2">
                <Input
                  id="order-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('admin.orders.emailPlaceholder')}
                />
                <Button variant="outline" onClick={handleSaveEmail} disabled={savingEmail}>
                  {savingEmail ? t('common.processing') : t('common.save')}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.tradeNo')}</div>
              {order.tradeNo ? <CopyButton text={order.tradeNo} /> : <div className="text-muted-foreground">-</div>}
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.cardKey')}</div>
              {order.cardKey ? <CopyButton text={order.cardKey} /> : <div className="text-muted-foreground">-</div>}
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.createdAt')}</div>
              <div className="text-sm"><ClientDate value={order.createdAt} format="dateTime" /></div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.paidAt')}</div>
              <div className="text-sm"><ClientDate value={order.paidAt} format="dateTime" /></div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('admin.orders.deliveredAt')}</div>
              <div className="text-sm"><ClientDate value={order.deliveredAt} format="dateTime" /></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
