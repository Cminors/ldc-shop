import { getActiveProductCategories, getCategories, getActiveProducts, getVisitorCount, getUserPendingOrders, getSetting, getLiveCardStats } from "@/lib/db/queries";
import { getActiveAnnouncement } from "@/actions/settings";
import { auth } from "@/lib/auth";
import { HomeContent } from "@/components/home-content";
import { INFINITE_STOCK } from "@/lib/constants";

const PAGE_SIZE = 24;

function stripMarkdown(input: string): string {
  return input
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[`*_>#+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolved = searchParams ? await searchParams : {}
  const q = (typeof resolved.q === 'string' ? resolved.q : '').trim();
  const categoryParam = (typeof resolved.category === 'string' ? resolved.category : '').trim();
  const category = categoryParam && categoryParam !== 'all' ? categoryParam : '';
  const sort = (typeof resolved.sort === 'string' ? resolved.sort : 'default').trim();
  const page = Math.max(1, Number.parseInt(typeof resolved.page === 'string' ? resolved.page : '1', 10) || 1);

  const session = await auth()
  const isLoggedIn = !!session?.user
  const trustLevel = Number.isFinite(Number(session?.user?.trustLevel)) ? Number(session?.user?.trustLevel) : 0

  // Run all independent queries in parallel for better performance
  const [products, announcement, visitorCount, categoryConfig, productCategories, wishlistEnabled] = await Promise.all([
    getActiveProducts({ isLoggedIn, trustLevel }).catch(() => []),
    getActiveAnnouncement().catch(() => null),
    getVisitorCount().catch(() => 0),
    getCategories().catch(() => []),
    getActiveProductCategories({ isLoggedIn, trustLevel }).catch(() => []),
    (async () => {
      try {
        return (await getSetting('wishlist_enabled')) === 'true'
      } catch {
        return false
      }
    })()
  ]);


  const total = products.length;

  const liveStats = await getLiveCardStats(products.map((p: any) => p.id)).catch(() => new Map());

  /* REMOVED: Separate ratings fetch - using pre-computed values in product table
  const productIds = products.map((p: any) => p.id).filter(Boolean);
  const sortedIds = [...productIds].sort();
  let ratingsMap = new Map<string, { average: number; count: number }>();
  try {
    ratingsMap = await unstable_cache(
      async () => getProductRatings(sortedIds),
      ["product-ratings", ...sortedIds],
      { revalidate: CACHE_TTL_SECONDS, tags: [TAG_RATINGS] }
    )();
  } catch {
    // Reviews table might not exist yet
  }
  */

  const productsWithRatings = products.map((p: any) => {
    const stat = liveStats.get(p.id) || { unused: 0, available: 0, locked: 0 };
    const available = p.isShared
      ? (stat.unused > 0 ? INFINITE_STOCK : 0)
      : stat.available;
    const locked = stat.locked;
    const stockTotal = available >= INFINITE_STOCK ? INFINITE_STOCK : (available + locked);
    // const rating = ratingsMap.get(p.id) || { average: 0, count: 0 };
    return {
      ...p,
      stockCount: stockTotal,
      soldCount: p.sold || 0,
      descriptionPlain: stripMarkdown(p.description || ''),
      rating: Number(p.rating || 0),
      reviewCount: Number(p.reviewCount || 0)
    };
  });

  // Check for pending orders (depends on session)
  let pendingOrders: any[] = [];
  if (session?.user?.id) {
    try {
      pendingOrders = await getUserPendingOrders(session.user.id);
    } catch {
      // Ignore errors fetching pending orders
    }
  }

  const categoryNames = categoryConfig
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((c) => c.name);
  const extraCategories = productCategories.filter((c) => !categoryNames.includes(c)).sort();
  const categories = [...categoryNames, ...extraCategories];

  return <HomeContent
    products={productsWithRatings}
    announcement={announcement}
    visitorCount={visitorCount}
    categories={categories}
    categoryConfig={categoryConfig}
    pendingOrders={pendingOrders}
    wishlistEnabled={wishlistEnabled}
    filters={{ q, category: category || null, sort }}
    pagination={{ page, pageSize: PAGE_SIZE, total }}
  />;
}
