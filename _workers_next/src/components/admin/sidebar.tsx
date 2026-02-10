'use client'

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Package, CreditCard, Megaphone, Star, Download, Tags, RotateCcw, Users, Settings, QrCode, Bell, Menu, MessageSquare } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { getPendingRefundRequestCount } from "@/actions/refund-requests"
import { getUnreadUserMessageCount } from "@/actions/user-messages"

interface NavLinkProps {
    href: string
    icon: ReactNode
    label: ReactNode
    badge?: ReactNode
    closeOnNavigate?: boolean
}

function NavLink({ href, icon, label, badge, closeOnNavigate }: NavLinkProps) {
    const content = (
        <span className="flex w-full items-center justify-between">
            <span className="flex items-center">
                {icon}
                {label}
            </span>
            {badge}
        </span>
    )
    const link = closeOnNavigate ? (
        <SheetClose asChild>
            <Link href={href} className="flex w-full items-center justify-between">{content}</Link>
        </SheetClose>
    ) : (
        <Link href={href} className="flex w-full items-center justify-between">{content}</Link>
    )
    return (
        <Button variant="ghost" asChild className="justify-start">
            {link}
        </Button>
    )
}

interface SidebarContentProps {
    closeOnNavigate?: boolean
    showTitle?: boolean
    username?: string
    t: (key: string) => string
}

function SidebarContent({ closeOnNavigate = false, showTitle = true, username, t }: SidebarContentProps) {
    const pathname = usePathname()
    const [pendingRefunds, setPendingRefunds] = useState(0)
    const [unreadMessages, setUnreadMessages] = useState(0)

    useEffect(() => {
        let active = true
        const refresh = async () => {
            try {
                const res = await getPendingRefundRequestCount()
                if (active && res?.success) {
                    setPendingRefunds(res.count || 0)
                }
                const msgRes = await getUnreadUserMessageCount()
                if (active && msgRes?.success) {
                    setUnreadMessages(msgRes.count || 0)
                }
            } catch {
                // ignore
            }
        }
        refresh()
        return () => {
            active = false
        }
    }, [pathname])

    useEffect(() => {
        const handler = () => {
            void (async () => {
                try {
                    const res = await getPendingRefundRequestCount()
                    if (res?.success) {
                        setPendingRefunds(res.count || 0)
                    }
                    const msgRes = await getUnreadUserMessageCount()
                    if (msgRes?.success) {
                        setUnreadMessages(msgRes.count || 0)
                    }
                } catch {
                    // ignore
                }
            })()
        }
        if (typeof window !== "undefined") {
            window.addEventListener("ldc:refunds-updated", handler)
            window.addEventListener("ldc:user-messages-updated", handler)
        }
        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("ldc:refunds-updated", handler)
                window.removeEventListener("ldc:user-messages-updated", handler)
            }
        }
    }, [])

    const refundBadge = pendingRefunds > 0 ? (
        <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {pendingRefunds > 99 ? "99+" : pendingRefunds}
        </span>
    ) : null

    const messageBadge = unreadMessages > 0 ? (
        <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadMessages > 99 ? "99+" : unreadMessages}
        </span>
    ) : null

    return (
        <>
            {showTitle && (
                <div className="flex items-center gap-2 font-bold text-xl px-2 mb-6">
                    <span>{t('common.adminTitle')}</span>
                </div>
            )}
            <nav className="flex flex-col gap-2">
                <NavLink href="/admin/settings" icon={<Settings className="mr-2 h-4 w-4" />} label={t('common.storeSettings')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/products" icon={<Package className="mr-2 h-4 w-4" />} label={t('common.productManagement')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/orders" icon={<CreditCard className="mr-2 h-4 w-4" />} label={t('common.ordersRefunds')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/refunds" icon={<RotateCcw className="mr-2 h-4 w-4" />} label={t('common.refundRequests')} badge={refundBadge} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/messages" icon={<MessageSquare className="mr-2 h-4 w-4" />} label={t('common.adminMessages')} badge={messageBadge} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/categories" icon={<Tags className="mr-2 h-4 w-4" />} label={t('common.categoriesManage')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/users" icon={<Users className="mr-2 h-4 w-4" />} label={t('common.customers')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/reviews" icon={<Star className="mr-2 h-4 w-4" />} label={t('common.reviews')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/announcement" icon={<Megaphone className="mr-2 h-4 w-4" />} label={t('announcement.title')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/data" icon={<Download className="mr-2 h-4 w-4" />} label={t('common.dataExport')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/collect" icon={<QrCode className="mr-2 h-4 w-4" />} label={t('payment.adminMenu')} closeOnNavigate={closeOnNavigate} />
                <NavLink href="/admin/notifications" icon={<Bell className="mr-2 h-4 w-4" />} label={t('admin.settings.notifications.title')} closeOnNavigate={closeOnNavigate} />
            </nav>
            {/* Removed footer logout block to avoid duplicate exit entry */}
        </>
    )
}

export function AdminSidebar({ username }: { username: string }) {
    const { t } = useI18n()

    return (
        <>
            {/* Mobile header */}
            <div className="md:hidden sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur">
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="font-bold">{t('common.adminTitle')}</span>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Menu className="h-4 w-4 mr-2" />
                                {t('common.menu')}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-4/5 max-w-sm">
                            <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-6">
                                <SidebarContent closeOnNavigate showTitle={false} username={username} t={t} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-muted/40 border-r md:min-h-screen p-6 gap-4">
                <SidebarContent username={username} t={t} />
            </aside>
        </>
    )
}
