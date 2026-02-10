'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

type Category = { name: string; icon: string | null; sortOrder: number }
type Product = {
  id: string
  name: string
  description: string | null
  price: string
  compareAtPrice: string | null
  image: string | null
  category: string | null
  isHot: boolean
  stockCount: number
  soldCount: number
}

function buildUrl(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    const str = String(v).trim()
    if (!str) return
    sp.set(k, str)
  })
  const qs = sp.toString()
  return qs ? `/search?${qs}` : '/search'
}

export function SearchContent(props: {
  q: string
  category: string
  sort: string
  page: number
  pageSize: number
  total: number
  products: Product[]
  categories: Category[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [q, setQ] = useState(props.q)

  useEffect(() => setQ(props.q), [props.q])

  const categories = useMemo(() => {
    const base = [{ name: 'all', icon: null, sortOrder: -1 } as Category]
    return [...base, ...props.categories]
  }, [props.categories])

  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize))
  const canPrev = props.page > 1
  const canNext = props.page < totalPages

  const sortOptions = [
    { key: 'default', label: t('home.sort.default') },
    { key: 'hot', label: t('search.sort.hot') },
    { key: 'stockDesc', label: t('home.sort.stock') },
    { key: 'soldDesc', label: t('home.sort.sold') },
    { key: 'priceAsc', label: t('home.sort.priceAsc') },
    { key: 'priceDesc', label: t('home.sort.priceDesc') },
  ]

  return (
    <main className="container py-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('search.title')}</h1>
        <form
          className="flex gap-2 md:w-[520px]"
          onSubmit={(e) => {
            e.preventDefault()
            router.push(buildUrl({ q: q.trim(), category: props.category, sort: props.sort, page: 1, pageSize: props.pageSize }))
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} />
          <Button type="submit" variant="outline">{t('search.search')}</Button>
        </form>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c.name}
              type="button"
              size="sm"
              variant={props.category === c.name ? 'default' : 'outline'}
              onClick={() => router.push(buildUrl({ q: props.q, category: c.name, sort: props.sort, page: 1, pageSize: props.pageSize }))}
            >
              {c.name === 'all' ? t('common.all') : `${c.icon ? `${c.icon} ` : ''}${c.name}`}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {sortOptions.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="sm"
              variant={props.sort === s.key ? 'default' : 'outline'}
              onClick={() => router.push(buildUrl({ q: props.q, category: props.category, sort: s.key, page: 1, pageSize: props.pageSize }))}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {t('search.resultCount', { total: props.total })}
      </div>

      {props.products.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
          <h3 className="font-semibold text-lg">{t('search.noResults')}</h3>
          <p className="text-muted-foreground mt-2">{t('search.tryOther')}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {props.products.map((product) => (
            <Card key={product.id} className="group overflow-hidden hover:border-primary/30 transition-all duration-300 tech-card flex flex-col">
              <div className="relative overflow-hidden">
                {product.isHot && (
                  <Badge className="absolute top-3 left-3 bg-primary/15 text-primary border border-primary/30">
                    {t('buy.hot')}
                  </Badge>
                )}
                {product.category && product.category !== 'general' && (
                  <Badge className="absolute top-3 right-3 capitalize bg-background/80 backdrop-blur-sm border-border/50 text-foreground shadow-sm">
                    {product.category}
                  </Badge>
                )}
              </div>

              <CardContent className="flex-1 p-5">
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300 leading-tight">
                  {product.name}
                </h3>
                <div className="text-muted-foreground text-sm line-clamp-2 leading-relaxed prose prose-sm dark:prose-invert max-w-none mt-2 [&_p]:m-0 [&_p]:inline">
                  <ReactMarkdown allowedElements={["p", "strong", "em", "del", "text", "span"]} unwrapDisallowed={true}>
                    {product.description || t('buy.noDescription')}
                  </ReactMarkdown>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 flex items-end justify-between gap-3">
                <div className="shrink-0 flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('common.credits')}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold font-mono tracking-tight">{Number(product.price)}</span>
                    {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                      <span className="text-xs text-muted-foreground line-through">{Number(product.compareAtPrice)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-0">
                  <div className="flex flex-wrap justify-end gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-border/50 whitespace-nowrap min-w-max overflow-visible">
                      {t('common.sold')} {product.soldCount}
                    </Badge>
                    <Badge
                      variant={product.stockCount > 0 ? "secondary" : "destructive"}
                      className={cn("text-[10px] h-5 px-2 whitespace-nowrap min-w-max overflow-visible")}
                    >
                      {product.stockCount > 0 ? `${t('common.stock')} ${product.stockCount}` : t('common.outOfStock')}
                    </Badge>
                  </div>
                  <Link href={`/buy/${product.id}`} className="w-full">
                    <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap shadow-md hover:shadow-lg transition-all">
                      {t('common.viewDetails')}
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-muted-foreground">{t('search.page', { page: props.page, totalPages })}</div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canPrev}
            onClick={() => router.push(buildUrl({ q: props.q, category: props.category, sort: props.sort, page: props.page - 1, pageSize: props.pageSize }))}
          >
            {t('search.prev')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canNext}
            onClick={() => router.push(buildUrl({ q: props.q, category: props.category, sort: props.sort, page: props.page + 1, pageSize: props.pageSize }))}
          >
            {t('search.next')}
          </Button>
        </div>
      </div>
    </main>
  )
}
