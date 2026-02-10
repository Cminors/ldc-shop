'use client'

import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { addCards, deleteCard, deleteCards } from "@/actions/admin"
import { Checkbox } from "@/components/ui/checkbox"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CopyButton } from "@/components/copy-button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CardData {
    id: number
    cardKey: string
}

interface CardsContentProps {
    productId: string
    productName: string
    unusedCards: CardData[]
}

export function CardsContent({ productId, productName, unusedCards }: CardsContentProps) {
    const { t } = useI18n()
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [batchDeleting, setBatchDeleting] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const submitLock = useRef(false)
    const batchDeleteLock = useRef(false)
    const deleteLock = useRef<number | null>(null)
    const formRef = useRef<HTMLFormElement | null>(null)
    const pendingFormRef = useRef<FormData | null>(null)

    const toggleSelectAll = () => {
        if (selectedIds.length === unusedCards.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(unusedCards.map(c => c.id))
        }
    }

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(pid => pid !== id)
                : [...prev, id]
        )
    }

    const handleBatchDelete = async () => {
        if (!selectedIds.length || batchDeleteLock.current) return

        if (confirm(t('admin.cards.confirmBatchDelete', { count: selectedIds.length }))) {
            batchDeleteLock.current = true
            setBatchDeleting(true)
            try {
                await deleteCards(selectedIds)
                toast.success(t('common.success'))
                setSelectedIds([])
                router.refresh()
            } catch (e: any) {
                toast.error(e.message)
            } finally {
                setBatchDeleting(false)
                batchDeleteLock.current = false
            }
        }
    }

    const handleSubmit = async (formData: FormData) => {
        if (submitLock.current) return
        submitLock.current = true
        setSubmitting(true)
        try {
            const result = await addCards(formData)
            if (result && result.success === false) {
                toast.error(t(result.error || 'common.error'))
                return
            }
            toast.success(t('common.success'))
            router.refresh()
            formRef.current?.reset()
            setPendingCount(0)
        } catch (e: any) {
            toast.error(e?.message || t('common.error'))
        } finally {
            setSubmitting(false)
            submitLock.current = false
        }
    }

    const handleConfirmSubmit = async () => {
        const formData = pendingFormRef.current
        if (!formData) {
            setConfirmOpen(false)
            return
        }
        setConfirmOpen(false)
        pendingFormRef.current = null
        await handleSubmit(formData)
    }

    const handleOpenConfirm = (formData: FormData) => {
        const raw = String(formData.get('cards') || '')
        const count = raw
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean).length
        setPendingCount(count)
        pendingFormRef.current = formData
        setConfirmOpen(true)
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin.cards.title')}: {productName}</h1>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">{unusedCards.length}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.cards.available')}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.cards.addCards')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            ref={formRef}
                            onSubmit={(event) => {
                                event.preventDefault()
                                if (submitting) return
                                const formData = new FormData(event.currentTarget)
                                handleOpenConfirm(formData)
                            }}
                            className="space-y-4"
                        >
                            <input type="hidden" name="product_id" value={productId} />
                            <Textarea name="cards" placeholder={t('admin.cards.placeholder')} rows={10} className="font-mono text-sm" required disabled={submitting} />
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('admin.cards.expiryLabel')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">{t('admin.cards.expiryHours')}</label>
                                        <Input name="expires_hours" type="number" min="0" step="1" disabled={submitting} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">{t('admin.cards.expiryMinutes')}</label>
                                        <Input name="expires_minutes" type="number" min="0" max="59" step="1" disabled={submitting} />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('admin.cards.expiryHint')}</p>
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? t('common.processing') : t('common.add')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.cards.available')}</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
                        {unusedCards.length > 0 && (
                            <div className="flex items-center justify-between pb-2 mb-2 border-b sticky top-0 bg-background z-10">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={selectedIds.length === unusedCards.length && unusedCards.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        id="select-all"
                                    />
                                    <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
                                        {t('admin.cards.selectAll')}
                                        {selectedIds.length > 0 && <span className="ml-2 text-muted-foreground text-xs">({t('admin.cards.selectedCount', { count: selectedIds.length })})</span>}
                                    </label>
                                </div>
                                {selectedIds.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleBatchDelete}
                                        disabled={batchDeleting}
                                    >
                                        {t('admin.cards.batchDelete')}
                                    </Button>
                                )}
                            </div>
                        )}
                        {unusedCards.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">{t('admin.cards.noCards')}</div>
                        ) : (
                            unusedCards.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm font-mono gap-2 animate-in fade-in transition-colors hover:bg-muted/60">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedIds.includes(c.id)}
                                            onCheckedChange={() => toggleSelect(c.id)}
                                        />
                                        <CopyButton text={c.cardKey} truncate maxLength={30} />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                            if (deleteLock.current === c.id) return
                                            if (confirm(t('common.confirm') + '?')) {
                                                deleteLock.current = c.id
                                                setDeletingId(c.id)
                                                try {
                                                    await deleteCard(c.id)
                                                    toast.success(t('common.success'))
                                                    router.refresh()
                                                } catch (e: any) {
                                                    toast.error(e.message)
                                                } finally {
                                                    setDeletingId(null)
                                                    deleteLock.current = null
                                                }
                                            }
                                        }}
                                        disabled={deletingId === c.id}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.cards.confirmAddTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.cards.confirmAddDescription', { count: pendingCount })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleConfirmSubmit} disabled={submitting}>
                            {t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
