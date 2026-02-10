'use client'

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TrendingUp, ShoppingCart, CreditCard, Package, Users } from "lucide-react"
import { saveShopName, saveShopDescription, saveShopLogo, saveShopFooter, saveThemeColor, saveLowStockThreshold, saveCheckinReward, saveCheckinEnabled, saveWishlistEnabled, saveNoIndex, saveRefundReclaimCards, saveRegistryHideNav } from "@/actions/admin"
import { checkForUpdates } from "@/actions/update-check"
import { joinRegistry } from "@/actions/registry"
import { toast } from "sonner"

interface Stats {
    today: { count: number; revenue: number }
    week: { count: number; revenue: number }
    month: { count: number; revenue: number }
    total: { count: number; revenue: number }
}

interface AdminSettingsContentProps {
    stats: Stats
    shopName: string | null
    shopDescription: string | null
    shopLogo: string | null
    shopFooter: string | null
    themeColor: string | null
    visitorCount: number
    lowStockThreshold: number
    checkinReward: number
    checkinEnabled: boolean
    wishlistEnabled: boolean
    noIndexEnabled: boolean
    refundReclaimCards: boolean
    registryHideNav: boolean
    registryOptIn: boolean
    registryEnabled: boolean
}

interface UpdateInfo {
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string | null
    releaseUrl: string | null
    error?: string
}

const THEME_COLORS = [
    { value: 'black', hue: 0, chroma: 0, preview: 'oklch(0.18 0 0)' },
    { value: 'purple', hue: 270 },
    { value: 'indigo', hue: 255 },
    { value: 'blue', hue: 240 },
    { value: 'cyan', hue: 200 },
    { value: 'teal', hue: 170 },
    { value: 'green', hue: 150 },
    { value: 'lime', hue: 120 },
    { value: 'amber', hue: 85 },
    { value: 'orange', hue: 45 },
    { value: 'red', hue: 25 },
    { value: 'rose', hue: 345 },
    { value: 'pink', hue: 330 },
]

export function AdminSettingsContent({ stats, shopName, shopDescription, shopLogo, shopFooter, themeColor, visitorCount, lowStockThreshold, checkinReward, checkinEnabled, wishlistEnabled, noIndexEnabled, refundReclaimCards, registryHideNav, registryOptIn, registryEnabled }: AdminSettingsContentProps) {
    const { t } = useI18n()

    // State
    const [shopNameValue, setShopNameValue] = useState(shopName || '')
    const [savingShopName, setSavingShopName] = useState(false)
    const [shopDescValue, setShopDescValue] = useState(shopDescription || '')
    const [savingShopDesc, setSavingShopDesc] = useState(false)
    const [shopLogoValue, setShopLogoValue] = useState(shopLogo || '')
    const [savingShopLogo, setSavingShopLogo] = useState(false)
    const [shopFooterValue, setShopFooterValue] = useState(shopFooter || '')
    const [savingShopFooter, setSavingShopFooter] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState(themeColor || 'purple')
    const [savingTheme, setSavingTheme] = useState(false)
    const [thresholdValue, setThresholdValue] = useState(String(lowStockThreshold || 5))
    const [savingThreshold, setSavingThreshold] = useState(false)
    const [rewardValue, setRewardValue] = useState(String(checkinReward || 10))
    const [savingReward, setSavingReward] = useState(false)
    const [enabledCheckin, setEnabledCheckin] = useState(checkinEnabled)
    const [savingEnabled, setSavingEnabled] = useState(false)
    const [enabledWishlist, setEnabledWishlist] = useState(wishlistEnabled)
    const [savingWishlist, setSavingWishlist] = useState(false)
    const [enabledNoIndex, setEnabledNoIndex] = useState(noIndexEnabled)
    const [savingNoIndex, setSavingNoIndex] = useState(false)
    const [refundReclaimEnabled, setRefundReclaimEnabled] = useState(refundReclaimCards)
    const [savingRefundReclaim, setSavingRefundReclaim] = useState(false)
    const [checkingUpdate, setCheckingUpdate] = useState(false)
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
    const [submittingRegistry, setSubmittingRegistry] = useState(false)
    const [registryJoined, setRegistryJoined] = useState(registryOptIn)
    const [hideRegistryNav, setHideRegistryNav] = useState(registryHideNav)
    const [savingRegistryNav, setSavingRegistryNav] = useState(false)

    const handleSaveShopName = async () => {
        const trimmed = shopNameValue.trim()
        if (!trimmed) {
            toast.error(t('admin.settings.shopNameEmpty'))
            return
        }
        setSavingShopName(true)
        try {
            await saveShopName(trimmed)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingShopName(false)
        }
    }

    const handleSaveShopDesc = async () => {
        setSavingShopDesc(true)
        try {
            await saveShopDescription(shopDescValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingShopDesc(false)
        }
    }

    const handleSaveShopLogo = async () => {
        setSavingShopLogo(true)
        try {
            await saveShopLogo(shopLogoValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingShopLogo(false)
        }
    }

    const handleSaveThreshold = async () => {
        setSavingThreshold(true)
        try {
            await saveLowStockThreshold(thresholdValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingThreshold(false)
        }
    }

    const handleSaveReward = async () => {
        setSavingReward(true)
        try {
            await saveCheckinReward(rewardValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingReward(false)
        }
    }

    const handleToggleCheckin = async (checked: boolean) => {
        setSavingEnabled(true)
        try {
            await saveCheckinEnabled(checked)
            setEnabledCheckin(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingEnabled(false)
        }
    }

    const handleToggleRefundReclaim = async (checked: boolean) => {
        setSavingRefundReclaim(true)
        try {
            await saveRefundReclaimCards(checked)
            setRefundReclaimEnabled(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingRefundReclaim(false)
        }
    }

    const handleToggleNoIndex = async (checked: boolean) => {
        setSavingNoIndex(true)
        try {
            await saveNoIndex(checked)
            setEnabledNoIndex(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingNoIndex(false)
        }
    }

    const handleToggleWishlist = async (checked: boolean) => {
        setSavingWishlist(true)
        try {
            await saveWishlistEnabled(checked)
            setEnabledWishlist(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingWishlist(false)
        }
    }

    const handleToggleRegistryNav = async (checked: boolean) => {
        setSavingRegistryNav(true)
        try {
            await saveRegistryHideNav(checked)
            setHideRegistryNav(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingRegistryNav(false)
        }
    }

    const handleSaveShopFooter = async () => {
        setSavingShopFooter(true)
        try {
            await saveShopFooter(shopFooterValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingShopFooter(false)
        }
    }

    const handleSaveTheme = async (color: string) => {
        setSavingTheme(true)
        setSelectedTheme(color)
        try {
            await saveThemeColor(color)
            toast.success(t('common.success'))
            // Refresh the page to apply theme
            window.location.reload()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingTheme(false)
        }
    }

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true)
        try {
            const result = await checkForUpdates()
            setUpdateInfo(result)
            if (result.error) {
                toast.error(t('update.checkFailed'))
                return
            }
            toast.success(result.hasUpdate ? t('update.available') : t('update.upToDate'))
        } catch {
            toast.error(t('update.checkFailed'))
        } finally {
            setCheckingUpdate(false)
        }
    }

    const handleRegistrySubmit = async () => {
        if (submittingRegistry) return
        setSubmittingRegistry(true)
        try {
            const result = await joinRegistry(window.location.origin)
            if (!result.ok) {
                throw new Error(result.error || "submit_failed")
            }
            toast.success(t('registry.submitSuccess'))
            setRegistryJoined(true)
        } catch {
            toast.error(t('registry.submitFailed'))
        } finally {
            setSubmittingRegistry(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('common.storeSettings')}</h1>

            {/* Dashboard Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.today')}</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.today.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.today.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.week')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.week.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.week.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.month')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.month.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.month.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.total')}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.total.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Link href="/admin/users" className="block">
                    <Card className="hover:bg-accent/50 transition-colors h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.stats.visitors')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{visitorCount}</div>
                            <p className="text-xs text-muted-foreground">{t('home.visitorCount', { count: visitorCount })}</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Shop Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2 md:max-w-xl">
                        <div className="flex gap-2">
                            <div className="floating-field flex-1 min-w-0">
                                <Input
                                    id="shop-name"
                                    value={shopNameValue}
                                    onChange={(e) => setShopNameValue(e.target.value)}
                                    placeholder=" "
                                />
                                <Label htmlFor="shop-name" className="floating-label">{t('admin.settings.shopName')}</Label>
                            </div>
                            <Button onClick={handleSaveShopName} disabled={savingShopName}>
                                {savingShopName ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('admin.settings.shopNameHint')}</p>
                    </div>
                    <div className="grid gap-2 md:max-w-xl">
                        <div className="flex gap-2">
                            <div className="floating-field flex-1 min-w-0">
                                <Input
                                    id="shop-desc"
                                    value={shopDescValue}
                                    onChange={(e) => setShopDescValue(e.target.value)}
                                    placeholder=" "
                                />
                                <Label htmlFor="shop-desc" className="floating-label">{t('admin.settings.shopDescription')}</Label>
                            </div>
                            <Button variant="outline" onClick={handleSaveShopDesc} disabled={savingShopDesc}>
                                {savingShopDesc ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-2 md:max-w-xl">
                        <div className="flex gap-2">
                            <div className="floating-field flex-1 min-w-0">
                                <Input
                                    id="shop-logo"
                                    value={shopLogoValue}
                                    onChange={(e) => setShopLogoValue(e.target.value)}
                                    placeholder=" "
                                />
                                <Label htmlFor="shop-logo" className="floating-label">{t('admin.settings.shopLogo')}</Label>
                            </div>
                            <Button variant="outline" onClick={handleSaveShopLogo} disabled={savingShopLogo}>
                                {savingShopLogo ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('admin.settings.shopLogoHint')}</p>
                        {shopLogoValue && (
                            <div className="flex items-center gap-4 p-2 border rounded-md bg-muted/50">
                                <img src={shopLogoValue} alt="Logo preview" className="h-8 w-8 object-contain" />
                                <span className="text-sm text-muted-foreground">{t('admin.settings.logoPreview')}</span>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2 md:max-w-xs">
                        <div className="flex gap-2">
                            <div className="floating-field flex-1 min-w-0">
                                <Input
                                    id="low-stock"
                                    type="number"
                                    value={thresholdValue}
                                    onChange={(e) => setThresholdValue(e.target.value)}
                                    placeholder=" "
                                />
                                <Label htmlFor="low-stock" className="floating-label">{t('admin.settings.lowStockThreshold')}</Label>
                            </div>
                            <Button variant="outline" onClick={handleSaveThreshold} disabled={savingThreshold}>
                                {savingThreshold ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checkin Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.checkin.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="checkin-enable" className="cursor-pointer">{t('admin.settings.checkin.title')}</Label>
                        <Button
                            id="checkin-enable"
                            variant={enabledCheckin ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleCheckin(!enabledCheckin)}
                            disabled={savingEnabled}
                            className={enabledCheckin ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {enabledCheckin ? t('admin.settings.checkin.enabled') : t('admin.settings.checkin.disabled')}
                        </Button>
                    </div>
                    {enabledCheckin && (
                        <div className="grid gap-2 md:max-w-xs">
                            <div className="flex gap-2">
                                <div className="floating-field flex-1 min-w-0">
                                    <Input
                                        id="checkin-reward"
                                        type="number"
                                        value={rewardValue}
                                        onChange={(e) => setRewardValue(e.target.value)}
                                        placeholder=" "
                                    />
                                    <Label htmlFor="checkin-reward" className="floating-label">{t('admin.settings.checkin.rewardTooltip')}</Label>
                                </div>
                                <Button variant="outline" onClick={handleSaveReward} disabled={savingReward}>
                                    {savingReward ? t('common.processing') : t('common.save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Refund Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.refund.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="refund-reclaim" className="cursor-pointer">{t('admin.settings.refund.reclaimLabel')}</Label>
                        <Button
                            id="refund-reclaim"
                            variant={refundReclaimEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleRefundReclaim(!refundReclaimEnabled)}
                            disabled={savingRefundReclaim}
                        >
                            {refundReclaimEnabled ? t('admin.settings.refund.reclaimEnabled') : t('admin.settings.refund.reclaimDisabled')}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('admin.settings.refund.reclaimHint')}</p>
                </CardContent>
            </Card>

            {/* Custom Footer */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.footer.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2 md:max-w-xl">
                        <div className="flex gap-2">
                            <Textarea
                                id="shop-footer"
                                value={shopFooterValue}
                                onChange={(e) => setShopFooterValue(e.target.value)}
                                placeholder={t('admin.settings.footer.placeholder')}
                                rows={3}
                                className="font-mono text-sm"
                            />
                            <Button variant="outline" onClick={handleSaveShopFooter} disabled={savingShopFooter}>
                                {savingShopFooter ? t('common.processing') : t('common.save')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('admin.settings.footer.hint')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Theme Color */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.themeColor.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t('admin.settings.themeColor.hint')}</p>
                    <div className="flex flex-wrap gap-3">
                        {THEME_COLORS.map(({ value, hue, chroma, preview }) => {
                            const saturation = typeof chroma === 'number' ? chroma : 1
                            const bgColor = preview || `oklch(0.55 ${0.2 * saturation} ${hue})`
                            const borderColor = selectedTheme === value
                                ? (preview ? 'oklch(0.3 0 0)' : `oklch(0.4 ${0.2 * saturation} ${hue})`)
                                : 'transparent'

                            return (
                                <button
                                    key={value}
                                    onClick={() => handleSaveTheme(value)}
                                    disabled={savingTheme}
                                    className={`
                                    w-12 h-12 rounded-full border-2 transition-all
                                    ${selectedTheme === value ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}
                                    ${savingTheme ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                    style={{
                                        backgroundColor: bgColor,
                                        borderColor
                                    }}
                                    title={t(`admin.settings.themeColor.${value}`)}
                                />
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t(`admin.settings.themeColor.${selectedTheme}`)}
                    </p>
                </CardContent>
            </Card>

            {registryEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('registry.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{t('registry.description')}</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={handleRegistrySubmit} disabled={submittingRegistry}>
                                {registryJoined ? t('registry.resubmit') : t('registry.joinNow')}
                            </Button>
                            <span className={registryJoined ? "text-green-600 text-sm" : "text-muted-foreground text-sm"}>
                                {registryJoined ? t('registry.statusJoined') : t('registry.statusNotJoined')}
                            </span>
                        </div>
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between gap-4">
                                <Label htmlFor="registry-hide-nav" className="cursor-pointer">
                                    {t('registry.hideNavLabel')}
                                </Label>
                                <Button
                                    id="registry-hide-nav"
                                    variant={registryJoined ? "outline" : hideRegistryNav ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleToggleRegistryNav(!hideRegistryNav)}
                                    disabled={savingRegistryNav || registryJoined}
                                    className={!registryJoined && hideRegistryNav ? "bg-slate-900 hover:bg-slate-800 text-white" : ""}
                                >
                                    {registryJoined ? t('registry.hideNavDisabled') : hideRegistryNav ? t('registry.hideNavEnabled') : t('registry.hideNavDisabled')}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {registryJoined ? t('registry.hideNavLockedHint') : t('registry.hideNavHint')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Wishlist Settings */}
            <Card>
                <CardContent className="space-y-2">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="wishlist-enable" className="cursor-pointer">{t('admin.settings.wishlist.title')}</Label>
                        <Button
                            id="wishlist-enable"
                            variant={enabledWishlist ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleWishlist(!enabledWishlist)}
                            disabled={savingWishlist}
                        >
                            {enabledWishlist ? t('admin.settings.wishlist.enabled') : t('admin.settings.wishlist.disabled')}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('admin.settings.wishlist.hint')}</p>
                </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.noIndex.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="noindex-enable" className="cursor-pointer">{t('admin.settings.noIndex.title')}</Label>
                        <Button
                            id="noindex-enable"
                            variant={enabledNoIndex ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleNoIndex(!enabledNoIndex)}
                            disabled={savingNoIndex}
                            className={enabledNoIndex ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                            {enabledNoIndex ? t('admin.settings.noIndex.enabled') : t('admin.settings.noIndex.disabled')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Update Check */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('update.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('update.description')}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleCheckUpdate} disabled={checkingUpdate}>
                            {checkingUpdate ? t('update.checking') : t('update.checkNow')}
                        </Button>
                        {updateInfo?.hasUpdate && updateInfo.releaseUrl && (
                            <Button asChild variant="outline">
                                <a href={updateInfo.releaseUrl} target="_blank" rel="noreferrer">
                                    {t('update.viewRelease')}
                                </a>
                            </Button>
                        )}
                    </div>
                    {updateInfo && (
                        <div className="text-sm">
                            <p className={updateInfo.error ? "text-destructive" : updateInfo.hasUpdate ? "text-orange-600" : "text-green-600"}>
                                {updateInfo.error ? t('update.checkFailed') : updateInfo.hasUpdate ? t('update.available') : t('update.upToDate')}
                            </p>
                            {updateInfo.latestVersion ? (
                                <p className="text-xs text-muted-foreground">
                                    {t('update.versionInfo', {
                                        current: updateInfo.currentVersion,
                                        latest: updateInfo.latestVersion
                                    })}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {t('update.currentVersion', { current: updateInfo.currentVersion })}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
