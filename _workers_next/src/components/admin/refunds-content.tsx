'use client'

import { useMemo, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClientDate } from "@/components/client-date"
import { adminApproveRefund, adminRejectRefund } from "@/actions/refund-requests"
import { RefundButton } from "@/components/admin/refund-button"
import { toast } from "sonner"

function statusVariant(status: string | null) {
  switch (status) {
    case 'approved': return 'secondary' as const
    case 'rejected': return 'destructive' as const
    case 'processed': return 'default' as const
    default: return 'outline' as const
  }
}

export function AdminRefundsContent({ requests }: { requests: any[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const processingRef = useRef<number | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((r) => {
      const hay = [
        r.orderId,
        r.username || '',
        r.userId || '',
        r.productName || '',
        r.reason || '',
        r.status || ''
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [query, requests])

  const handle = async (id: number, action: 'approve' | 'reject') => {
    if (processingRef.current === id) return
    const note = prompt(t('admin.refunds.adminNotePrompt')) || ''
    try {
      processingRef.current = id
      setProcessingId(id)
      if (action === 'approve') {
        const result = await adminApproveRefund(id, note)
        if (result?.processed) {
          toast.success(t('admin.refunds.autoRefundSuccess'))
        } else {
          toast.success(t('admin.refunds.autoRefundPending'))
          if (result?.error) {
            toast.error(result.error)
          }
        }
      } else {
        await adminRejectRefund(id, note)
        toast.success(t('common.success'))
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ldc:refunds-updated"))
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessingId(null)
      processingRef.current = null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.refunds.title')}</h1>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.refunds.searchPlaceholder')} className="md:w-[340px]" />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.refunds.order')}</TableHead>
              <TableHead>{t('admin.refunds.user')}</TableHead>
              <TableHead>{t('admin.refunds.product')}</TableHead>
              <TableHead>{t('admin.refunds.reason')}</TableHead>
              <TableHead>{t('admin.refunds.status')}</TableHead>
              <TableHead>{t('admin.refunds.date')}</TableHead>
              <TableHead className="text-right">{t('admin.refunds.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.orderId}</TableCell>
                <TableCell>
                  {r.username ? (
                    <a href={`https://linux.do/u/${r.username}`} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline text-primary">
                      {r.username}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[220px] truncate">{r.productName || '-'}</TableCell>
                <TableCell className="max-w-[320px]">
                  <div className="text-sm whitespace-pre-wrap break-words">{r.reason || '-'}</div>
                  {r.adminNote && (
                    <div className="text-xs text-muted-foreground mt-1">{t('admin.refunds.adminNote')}: {r.adminNote}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)} className="uppercase text-xs">
                    {t(`admin.refunds.statusValues.${r.status || 'pending'}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  <ClientDate value={r.createdAt} format="dateTime" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {(r.status === 'pending' || !r.status) && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handle(r.id, 'approve')} disabled={processingId === r.id}>{t('admin.refunds.approve')}</Button>
                        <Button variant="destructive" size="sm" onClick={() => handle(r.id, 'reject')} disabled={processingId === r.id}>{t('admin.refunds.reject')}</Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <RefundButton order={{
                        orderId: r.orderId,
                        tradeNo: r.tradeNo,
                        amount: r.amount,
                        status: r.orderStatus,
                        cardKey: r.cardKey
                      }} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
