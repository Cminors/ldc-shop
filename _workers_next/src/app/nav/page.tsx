import Link from "next/link"
import { fetchRegistryShops } from "@/lib/registry"
import { getServerI18n } from "@/lib/i18n/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShopLogo } from "@/components/nav/shop-logo"

export default async function NavigatorPage({ searchParams }: { searchParams?: Promise<{ q?: string | string[] }> }) {
    const { t } = await getServerI18n()
    const resolvedParams = await searchParams
    const rawQ = resolvedParams?.q
    const qValue = Array.isArray(rawQ) ? rawQ[0] : rawQ || ""
    const q = qValue.trim().toLowerCase()
    const { items, error } = await fetchRegistryShops()
    const filtered = q
        ? items.filter((item) => {
            const hay = `${item.name} ${item.description || ""} ${item.url}`.toLowerCase()
            return hay.includes(q)
        })
        : items

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
            <div className="absolute -top-24 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="container relative py-12 md:py-16">
                <div className="flex flex-col gap-6 md:gap-8">
                    <div className="flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {t('registry.navTitle')}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                            {t('registry.navTitle')}
                        </h1>
                        <p className="text-muted-foreground max-w-2xl">
                            {t('registry.navSubtitle')}
                        </p>
                    </div>

                    <form className="flex flex-col gap-3 md:flex-row md:items-center">
                        <input
                            name="q"
                            defaultValue={qValue}
                            placeholder={t('registry.navSearch')}
                            className="h-11 w-full rounded-lg border border-border/60 bg-background/80 px-4 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                        />
                        <Button type="submit" className="h-11 px-6">
                            {t('registry.search')}
                        </Button>
                    </form>

                    {error && (
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                            {t('common.error')}
                        </div>
                    )}

                    {!filtered.length ? (
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-8 text-center text-sm text-muted-foreground">
                            {t('registry.navEmpty')}
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((shop) => (
                                <Card key={shop.url} className="group h-full border-border/60 bg-background/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                                    <CardHeader className="flex flex-row items-start gap-4">
                                        <ShopLogo name={shop.name} url={shop.url} logo={shop.logo} />
                                        <div className="flex flex-col gap-1">
                                            <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground break-all">{shop.url}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-4">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {shop.description || t('buy.noDescription')}
                                        </p>
                                        <Button asChild variant="outline" className="w-fit">
                                            <Link href={shop.url} target="_blank" rel="noreferrer">
                                                {t('registry.visit')}
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
