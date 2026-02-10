'use client'

import { useMemo, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ClientDate } from "@/components/client-date"
import { deleteReview } from "@/actions/admin"
import { toast } from "sonner"

interface ReviewRow {
  id: number
  productId: string
  productName: string
  orderId: string
  userId: string
  username: string
  rating: number
  comment: string | null
  createdAt: Date | null
}

export function AdminReviewsContent({ reviews }: { reviews: ReviewRow[] }) {
  const { t } = useI18n()
  const [items, setItems] = useState(reviews)
  const [query, setQuery] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const deletingRef = useRef<number | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => {
      const hay = [
        r.productName,
        r.productId,
        r.orderId,
        r.userId,
        r.username,
        r.comment || "",
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  const handleDelete = async (id: number) => {
    if (deletingRef.current === id) return
    if (!confirm(t('common.confirm') + '?')) return
    try {
      deletingRef.current = id
      setDeletingId(id)
      await deleteReview(id)
      setItems((prev) => prev.filter((r) => r.id !== id))
      toast.success(t('common.success'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeletingId(null)
      deletingRef.current = null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.reviews.title')}</h1>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.reviews.searchPlaceholder')}
          className="md:w-[340px]"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.reviews.product')}</TableHead>
              <TableHead>{t('admin.reviews.user')}</TableHead>
              <TableHead>{t('admin.reviews.rating')}</TableHead>
              <TableHead>{t('admin.reviews.comment')}</TableHead>
              <TableHead>{t('admin.reviews.date')}</TableHead>
              <TableHead className="text-right">{t('admin.reviews.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[260px]">
                  <div className="font-medium">{r.productName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.productId}</div>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <a
                    href={`https://linux.do/u/${r.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sm hover:underline text-primary"
                  >
                    {r.username}
                  </a>
                  <div className="text-xs text-muted-foreground font-mono">{r.userId}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.rating}/5</Badge>
                </TableCell>
                <TableCell className="max-w-[420px]">
                  <div className="text-sm whitespace-pre-wrap break-words">{r.comment || '-'}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">{r.orderId}</div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  <ClientDate value={r.createdAt} format="dateTime" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}>
                    {t('common.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
