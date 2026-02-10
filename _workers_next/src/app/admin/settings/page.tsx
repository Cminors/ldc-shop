import { getDashboardStats, getSetting, getAllSettings, getVisitorCount } from "@/lib/db/queries"
import { isRegistryEnabled } from "@/lib/registry"
import { AdminSettingsContent } from "@/components/admin/settings-content"
import { unstable_noStore } from "next/cache"
import { cookies } from "next/headers"

export default async function AdminSettingsPage() {
    const cookieStore = await cookies()
    void cookieStore.get('ldc_pending_order')
    unstable_noStore()
    const nowMs = Date.now()
    const [stats, settingsMap, visitorCount] = await Promise.all([
        getDashboardStats(nowMs),
        getAllSettings(),
        getVisitorCount().catch(() => 0)
    ])

    const shopName = settingsMap['shop_name'] || null
    const shopDescription = settingsMap['shop_description'] || null
    const shopLogo = settingsMap['shop_logo'] || null
    const shopFooter = settingsMap['shop_footer'] || null
    const themeColor = settingsMap['theme_color'] || null

    const lowStockThreshold = Number.parseInt(settingsMap['low_stock_threshold'] || '5', 10) || 5
    const checkinReward = Number.parseInt(settingsMap['checkin_reward'] || '10', 10) || 10
    const checkinEnabled = settingsMap['checkin_enabled'] !== 'false'
    const wishlistEnabled = settingsMap['wishlist_enabled'] === 'true'
    const noIndexEnabled = settingsMap['noindex_enabled'] === 'true'
    const registryOptIn = settingsMap['registry_opt_in'] === 'true'
    const refundReclaimCards = settingsMap['refund_reclaim_cards'] !== 'false'
    const registryHideNav = settingsMap['registry_hide_nav'] === 'true'

    return (
        <AdminSettingsContent
            stats={stats}
            shopName={shopName}
            shopDescription={shopDescription}
            shopLogo={shopLogo}
            shopFooter={shopFooter}
            themeColor={themeColor}
            visitorCount={visitorCount}
            lowStockThreshold={lowStockThreshold}
            checkinReward={checkinReward}
            checkinEnabled={checkinEnabled}
            wishlistEnabled={wishlistEnabled}
            noIndexEnabled={noIndexEnabled}
            registryOptIn={registryOptIn}
            refundReclaimCards={refundReclaimCards}
            registryHideNav={registryHideNav}
            registryEnabled={isRegistryEnabled()}
        />
    )
}
