import Link from "next/link"
import { auth } from "@/lib/auth"
import { getServerI18n } from "@/lib/i18n/server"
import { getSetting, getWishlistItems } from "@/lib/db/queries"
import { WishlistSection } from "@/components/wishlist-section"
import { Button } from "@/components/ui/button"
import { unstable_noStore } from "next/cache"

export default async function WishlistPage() {
    unstable_noStore()
    const { t } = await getServerI18n()
    const session = await auth()
    let enabled = false
    try {
        enabled = (await getSetting('wishlist_enabled')) === 'true'
    } catch {
        enabled = false
    }

    const items = enabled
        ? await getWishlistItems(session?.user?.id || null, 30).catch(() => [])
        : []

    const adminUsers = process.env.ADMIN_USERS?.toLowerCase().split(',') || []
    const isAdmin = !!(session?.user?.username && adminUsers.includes(session.user.username.toLowerCase()))

    return (
        <main className="container py-8 md:py-12 space-y-6">
            <div className="flex items-center justify-end">
                <Link href="/">
                    <Button variant="outline" size="sm">{t('common.back')}</Button>
                </Link>
            </div>

            {enabled ? (
                <WishlistSection
                    initialItems={items}
                    isLoggedIn={!!session?.user?.id}
                    isAdmin={isAdmin}
                />
            ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t('wishlist.disabled')}
                </div>
            )}
        </main>
    )
}
