'use client'

import { useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react"
import { deleteProduct, toggleProductStatus, reorderProduct } from "@/actions/admin"
import { toast } from "sonner"

interface Product {
    id: string
    name: string
    price: string
    compareAtPrice: string | null
    category: string | null
    stockCount: number
    isActive: boolean
    isHot: boolean
    sortOrder: number
}

interface AdminProductsContentProps {
    products: Product[]
    lowStockThreshold: number
}

export function AdminProductsContent({ products, lowStockThreshold }: AdminProductsContentProps) {
    const { t } = useI18n()
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const busyRef = useRef(false)

    const threshold = lowStockThreshold || 5

    const handleDelete = async (id: string) => {
        if (busyRef.current) return
        if (!confirm(t('admin.products.confirmDelete'))) return
        busyRef.current = true
        setBusy(true)
        try {
            await deleteProduct(id)
            toast.success(t('common.success'))
            router.refresh()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setBusy(false)
            busyRef.current = false
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        if (busyRef.current) return
        busyRef.current = true
        setBusy(true)
        try {
            await toggleProductStatus(id, !currentStatus)
            toast.success(t('common.success'))
            router.refresh()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setBusy(false)
            busyRef.current = false
        }
    }

    const handleReorder = async (id: string, direction: 'up' | 'down') => {
        if (busyRef.current) return
        const idx = products.findIndex(p => p.id === id)
        if (idx === -1) return

        // Swap with neighbor
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= products.length) return

        const current = products[idx]
        const target = products[targetIdx]

        busyRef.current = true
        setBusy(true)
        try {
            // Use index as sortOrder to ensure unique values
            await reorderProduct(current.id, targetIdx)
            await reorderProduct(target.id, idx)
            toast.success(t('common.success'))
            router.refresh()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setBusy(false)
            busyRef.current = false
        }
    }

    return (
        <div className="space-y-6">
            {/* Products Table */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('common.productManagement')}</h1>
                <Button asChild>
                    <Link href="/admin/product/new">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('admin.products.addNew')}
                    </Link>
                </Button>
            </div>

            <Card className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">{t('admin.products.order')}</TableHead>
                            <TableHead>{t('admin.products.name')}</TableHead>
                            <TableHead>{t('admin.products.price')}</TableHead>
                            <TableHead>{t('admin.products.category')}</TableHead>
                            <TableHead>{t('admin.products.hot')}</TableHead>
                            <TableHead>{t('admin.products.stock')}</TableHead>
                            <TableHead>{t('admin.products.status')}</TableHead>
                            <TableHead className="text-right">{t('admin.products.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product, idx) => (
                            <TableRow key={product.id} className={!product.isActive ? 'opacity-50' : ''}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleReorder(product.id, 'up')}
                                        disabled={busy || idx === 0}
                                    >
                                        <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleReorder(product.id, 'down')}
                                        disabled={busy || idx === products.length - 1}
                                    >
                                        <ArrowDown className="h-3 w-3" />
                                    </Button>
                                </div>
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{Number(product.price)}</span>
                                        {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                                            <span className="text-xs text-muted-foreground line-through">
                                                {Number(product.compareAtPrice)}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="capitalize">{product.category || 'general'}</TableCell>
                                <TableCell>
                                    {product.isHot ? (
                                        <Badge variant="secondary">{t('common.yes')}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{product.stockCount}</span>
                                        {product.stockCount <= threshold && (
                                            <Badge variant="destructive" className="text-[10px]">{t('admin.products.lowStock')}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                        {product.isActive ? t('admin.products.active') : t('admin.products.inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggle(product.id, product.isActive)}
                                        title={product.isActive ? t('admin.products.hide') : t('admin.products.show')}
                                        disabled={busy}
                                    >
                                        {product.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/cards/${product.id}`}>
                                            {t('admin.products.manageCards')}
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/product/edit/${product.id}`} prefetch={false}>
                                            {t('common.edit')}
                                        </Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)} disabled={busy}>
                                        {t('common.delete')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
