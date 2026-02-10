import { searchActiveProducts, getCategories, getLiveCardStats } from "@/lib/db/queries"
import { SearchContent } from "@/components/search-content"
import { unstable_noStore } from "next/cache"
import { auth } from "@/lib/auth"
import { INFINITE_STOCK } from "@/lib/constants"

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseIntParam(value: unknown, fallback: number) {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(num) && num > 0 ? num : fallback
}

export default async function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  unstable_noStore()
  const searchParams = await props.searchParams
  const q = (firstParam(searchParams.q) || '').trim()
  const category = (firstParam(searchParams.category) || 'all').trim()
  const sort = (firstParam(searchParams.sort) || 'default').trim()
  const page = parseIntParam(firstParam(searchParams.page), 1)
  const pageSize = Math.min(parseIntParam(firstParam(searchParams.pageSize), 24), 60)

  const session = await auth()
  const isLoggedIn = !!session?.user
  const trustLevel = Number.isFinite(Number(session?.user?.trustLevel)) ? Number(session?.user?.trustLevel) : 0

  const [result, categories] = await Promise.all([
    searchActiveProducts({ q, category, sort, page, pageSize, isLoggedIn, trustLevel }),
    getCategories(),
  ])

  const liveStats = await getLiveCardStats(result.items.map((p: any) => p.id)).catch(() => new Map())

  return (
    <SearchContent
      q={q}
      category={category}
      sort={sort}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
      products={result.items.map((p: any) => {
        const stat = liveStats.get(p.id) || { unused: 0, available: 0, locked: 0 }
        const available = p.isShared
          ? (stat.unused > 0 ? INFINITE_STOCK : 0)
          : stat.available
        const locked = stat.locked
        const stockCount = available >= INFINITE_STOCK ? INFINITE_STOCK : (available + locked)
        return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        image: p.image,
        category: p.category,
        isHot: p.isHot ?? false,
        stockCount,
        soldCount: p.sold || 0
      }})}
      categories={categories.map((c: any) => ({ name: c.name, icon: c.icon, sortOrder: c.sortOrder }))}
    />
  )
}
