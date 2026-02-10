"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { StarRatingStatic } from "@/components/star-rating-static"
import { NavigationPill } from "@/components/navigation-pill"
import { useI18n } from "@/lib/i18n/context"
import { INFINITE_STOCK } from "@/lib/constants"

interface Product {
    id: string
    name: string
    description: string | null
    descriptionPlain?: string | null
    price: string
    compareAtPrice?: string | null
    image: string | null
    category: string | null
    stockCount: number
    soldCount: number
    isHot?: boolean | null
    rating?: number
    reviewCount?: number
}

interface HomeContentProps {
    products: Product[]
    announcement?: string | null
    visitorCount?: number
    categories?: string[]
    categoryConfig?: Array<{ name: string; icon: string | null; sortOrder: number }>
    pendingOrders?: Array<{ orderId: string; createdAt: Date; productName: string; amount: string }>
    wishlistEnabled?: boolean
    filters: { q?: string; category?: string | null; sort?: string }
    pagination: { page: number; pageSize: number; total: number }
}

export function HomeContent({ products, announcement, visitorCount, categories = [], categoryConfig, pendingOrders, wishlistEnabled = false, filters, pagination }: HomeContentProps) {
    const { t } = useI18n()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(filters.category || null)
    const [searchTerm, setSearchTerm] = useState(filters.q || "")
    const [sortKey, setSortKey] = useState(filters.sort || "default")
    const [page, setPage] = useState(pagination.page || 1)
    const deferredSearch = useDeferredValue(searchTerm)

    useEffect(() => {
        setPage(1)
    }, [selectedCategory, sortKey, deferredSearch])

    const filteredProducts = useMemo(() => {
        const keyword = deferredSearch.trim().toLowerCase()
        return products.filter((product) => {
            if (selectedCategory && product.category !== selectedCategory) return false
            if (!keyword) return true
            const name = (product.name || "").toLowerCase()
            const desc = (product.descriptionPlain || product.description || "").toLowerCase()
            return name.includes(keyword) || desc.includes(keyword)
        })
    }, [products, selectedCategory, deferredSearch])

    const sortedProducts = useMemo(() => {
        const list = [...filteredProducts]
        switch (sortKey) {
            case "priceAsc":
                return list.sort((a, b) => Number(a.price) - Number(b.price))
            case "priceDesc":
                return list.sort((a, b) => Number(b.price) - Number(a.price))
            case "stockDesc":
                return list.sort((a, b) => (b.stockCount || 0) - (a.stockCount || 0))
            case "soldDesc":
                return list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
            case "hot":
                return list.sort((a, b) => Number(!!b.isHot) - Number(!!a.isHot))
            default:
                return list
        }
    }, [filteredProducts, sortKey])

    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pagination.pageSize))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startIndex = (currentPage - 1) * pagination.pageSize
    const pageItems = sortedProducts.slice(startIndex, startIndex + pagination.pageSize)
    const hasMore = currentPage < totalPages

    return (
        <main className="container py-8 md:py-16 relative overflow-hidden">
            {/* Atmosphere background */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-48 left-1/2 h-80 w-[90vw] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/8 via-sky-200/8 to-emerald-200/8 blur-3xl" />
                <div className="absolute top-10 left-[12%] h-36 w-60 rounded-full bg-primary/7 blur-3xl" />
                <div className="absolute top-16 right-[10%] h-32 w-56 rounded-full bg-sky-200/8 blur-3xl dark:bg-sky-200/6" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.015),_transparent_70%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.02),_transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.012] [background-image:radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px] dark:[background-image:radial-gradient(#ffffff_1px,transparent_1px)]" />
            </div>

            {/* Announcement Banner */}
            {announcement && (
                <section className="mb-8">
                    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/50" />
                        <div className="flex items-start gap-3 pl-3">
                            <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{announcement}</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Pending Orders Notification */}
            {pendingOrders && pendingOrders.length > 0 && (
                <section className="mb-8">
                    <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-yellow-500/10 to-yellow-500/5 p-4">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-500 to-yellow-500/50" />
                        <div className="flex items-center justify-between gap-4 pl-3">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-medium text-foreground/90">
                                    {pendingOrders.length === 1
                                        ? t('home.pendingOrder.single', { orderId: pendingOrders[0].orderId })
                                        : t('home.pendingOrder.multiple', { count: pendingOrders.length })
                                    }
                                </p>
                            </div>
                            <Link href={pendingOrders.length === 1 ? `/order/${pendingOrders[0].orderId}` : '/orders'}>
                                <Button size="sm" variant="outline" className="border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 cursor-pointer">
                                    {pendingOrders.length === 1 ? t('common.payNow') : t('common.viewOrders')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Header Area with Visitor Count and Controls */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                    {typeof visitorCount === 'number' && (
                        <Badge variant="secondary" className="px-3 py-1 bg-background/70 shadow-sm border border-border/40">
                            {t('home.visitorCount', { count: visitorCount })}
                        </Badge>
                    )}
                    {wishlistEnabled && (
                        <Link href="/wishlist">
                            <Button size="icon-sm" variant="outline" className="h-9 w-9 p-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                                </svg>
                                <span className="sr-only">{t('wishlist.title')}</span>
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Top Toolbar: Search & Filter Pills */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card/50 p-1 rounded-xl">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-72 shrink-0">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <Input
                            placeholder={t('common.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full bg-background border-border/50 focus:bg-background transition-all"
                        />
                    </div>

                    {/* Apple-style Category Navigation Pill */}
                    <div className="flex-1 w-full overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        <NavigationPill
                            items={[
                                { key: '', label: t('common.all') },
                                ...categories.map(cat => ({
                                    key: cat,
                                    label: categoryConfig?.find(c => c.name === cat)?.icon
                                        ? `${categoryConfig.find(c => c.name === cat)?.icon} ${cat}`
                                        : cat,
                                }))
                            ]}
                            selectedKey={selectedCategory || ''}
                            onSelect={(key) => setSelectedCategory(key || null)}
                        />
                    </div>

                    {/* Sort Dropdown (Simplified as inline buttons for now, or dropdown later) */}
                    <div className="shrink-0 flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden md:inline-block mr-1">{t('home.sort.title')}:</span>
                        {[
                            { key: 'default', label: t('home.sort.default'), icon: null },
                            { key: 'stockDesc', label: t('home.sort.stock'), icon: '📦' },
                            { key: 'soldDesc', label: t('home.sort.sold'), icon: '🔥' },
                            { key: 'priceAsc', label: t('home.sort.priceAsc'), icon: '💰' },
                            { key: 'priceDesc', label: t('home.sort.priceDesc'), icon: '💰' },
                        ].map(opt => (
                            <Button
                                key={opt.key}
                                type="button"
                                variant={sortKey === opt.key ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 px-3 text-xs rounded-lg whitespace-nowrap",
                                    sortKey === opt.key ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                onClick={() => setSortKey(opt.key)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Product Grid (Full Width) */}
            <section>
                {sortedProducts.length === 0 ? (
                    <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.04),_transparent_60%)] dark:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_60%)]" />
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                            <svg className="w-8 h-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <p className="text-muted-foreground font-medium">{t('home.noProducts')}</p>
                        <p className="text-sm text-muted-foreground/60 mt-2">{t('home.checkBackLater')}</p>
                        {selectedCategory && (
                            <Button variant="link" className="mt-4" onClick={() => setSelectedCategory(null)}>
                                {t('common.all')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                        {pageItems.map((product, index) => (
                            <Card
                                key={product.id}
                                className="group relative overflow-hidden flex flex-col rounded-2xl border border-border/30 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                <Link
                                    href={`/buy/${product.id}`}
                                    aria-label={t('common.viewDetails')}
                                    className="absolute inset-0 z-10"
                                />
                                {/* Image Section */}
                                <div className="relative m-4 aspect-[16/10] overflow-hidden rounded-xl border border-border/20 bg-muted/10">
                                    <Image
                                        src={product.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${product.id}`}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        priority={index < 2}
                                        className="object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                                    />
                                    {product.category && product.category !== 'general' && (
                                        <Badge className="absolute top-2 right-2 text-[10px] h-5 px-2 capitalize bg-background/90 border border-border/30 text-foreground shadow-sm">
                                            {product.category}
                                        </Badge>
                                    )}
                                </div>
                                <div className="mx-4 h-px bg-border/15" />

                                {/* Content Section */}
                                <CardContent className="relative z-20 flex-1 px-5 pb-5 pt-4 pointer-events-none">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <h3 className="font-bold text-base tracking-tight group-hover:text-primary transition-colors duration-300 leading-snug line-clamp-1" title={product.name}>
                                            {product.name}
                                        </h3>
                                    </div>

                                    {product.isHot && (
                                        <div className="mb-2">
                                            <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-orange-500 text-white border-0 shadow-sm">
                                                🔥 {t('buy.hot')}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Rating */}
                                    {product.reviewCount !== undefined && product.reviewCount > 0 && (
                                        <div className="flex items-center gap-1.5 mb-2.5">
                                            <StarRatingStatic rating={Math.round(product.rating || 0)} size="xs" />
                                            <span className="text-[10px] text-muted-foreground font-medium">({product.reviewCount})</span>
                                        </div>
                                    )}

                                    <div className="text-muted-foreground text-xs line-clamp-2 h-8 leading-4 overflow-hidden opacity-90">
                                        {product.descriptionPlain || product.description || t('buy.noDescription')}
                                    </div>
                                </CardContent>

                                {/* Footer Section */}
                                <CardFooter className="relative z-20 px-5 py-4 flex flex-wrap items-center gap-3 mt-auto border-t border-border/15 bg-transparent pointer-events-none">
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-black text-primary tabular-nums whitespace-nowrap tracking-tight">{Number(product.price)}</span>
                                            <span className="text-xs text-muted-foreground font-medium uppercase">{t('common.credits')}</span>
                                            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                                                <span className="text-xs text-muted-foreground/70 line-through tabular-nums">
                                                    {Number(product.compareAtPrice)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                {/* Assuming Archive icon is imported, e.g., from 'lucide-react' */}
                                                {/* <Archive className="w-3 h-3 mr-1" /> */}
                                                <span>{t('admin.products.stock')}: {product.stockCount >= INFINITE_STOCK ? '∞' : product.stockCount}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {t('common.sold')}: {product.soldCount}
                                            </span>
                                        </div>
                                    </div>

                                    <Link href={`/buy/${product.id}`} className="ml-auto relative z-30 pointer-events-auto">
                                        <Button
                                            size="sm"
                                            className={cn(
                                                "h-9 px-5 text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95 cursor-pointer",
                                                product.stockCount > 0 ? "bg-primary/90 text-primary-foreground hover:bg-primary" : "bg-muted/80 text-muted-foreground hover:bg-muted"
                                            )}
                                            disabled={product.stockCount <= 0}
                                        >
                                            {product.stockCount > 0 ? t('common.buy') : t('common.outOfStock')}
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {sortedProducts.length > 0 && (
                <div className="flex items-center justify-between mt-10 text-sm text-muted-foreground">
                    <span>
                        {t('search.page', { page: currentPage, totalPages })}
                    </span>
                    {hasMore && (
                        <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)}>
                            {t('common.loadMore')}
                        </Button>
                    )}
                </div>
            )}
        </main>
    )
}
