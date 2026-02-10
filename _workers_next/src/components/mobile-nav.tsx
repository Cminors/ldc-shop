'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"
import { Compass, Home, Package, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    isLoggedIn: boolean
    isAdmin: boolean
    showNav?: boolean
}

export function MobileNav({ isLoggedIn, isAdmin, showNav = true }: MobileNavProps) {
    const { t } = useI18n()
    const pathname = usePathname()

    const isZh = t('common.myOrders').includes('订单')
    
    const navItems = [
        {
            href: "/",
            label: isZh ? "首页" : "Home",
            icon: Home,
            active: pathname === "/"
        },
        ...(isAdmin ? [{
            href: "/admin/settings",
            label: t('common.admin'),
            icon: Settings,
            active: pathname.startsWith("/admin")
        }] : []),
        ...(showNav ? [{
            href: "/nav",
            label: t('common.navigator'),
            icon: Compass,
            active: pathname === "/nav" || pathname === "/navi"
        }] : []),
        ...(isLoggedIn ? [{
            href: "/profile",
            label: isZh ? "个人中心" : "Profile",
            icon: User,
            active: pathname === "/profile"
        }] : [])
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,_rgba(0,0,0,0.06),_transparent_60%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.06),_transparent_60%)]" />
            <div className="relative mx-auto flex h-14 w-[min(92vw,420px)] items-center justify-between gap-1 rounded-full border border-border/40 bg-background/80 px-2 shadow-lg backdrop-blur-xl">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-all duration-200",
                            item.active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5",
                            item.active ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="leading-none">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    )
}
