import Link from "next/link"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User } from "lucide-react"
import { SignInButton } from "@/components/signin-button"
import { SignOutButton } from "@/components/signout-button"
import { HeaderLogo, HeaderNav, HeaderSearch, HeaderUserMenuItems, HeaderUnreadBadge, LanguageSwitcher } from "@/components/header-client-parts"
import { ModeToggle } from "@/components/mode-toggle"
import { getSetting, recordLoginUser, setSetting, getUserUnreadNotificationCount, getLoginUserDesktopNotificationsEnabled } from "@/lib/db/queries"
import { isRegistryEnabled } from "@/lib/registry"
import { CheckInButton } from "@/components/checkin-button"

export async function SiteHeader() {
    const session = await auth()
    const user = session?.user
    if (user?.id) {
        await recordLoginUser(user.id, user.username || user.name || null, user.email || null)
    }

    // Check if admin (case-insensitive)
    const rawAdminUsers = process.env.ADMIN_USERS?.split(',') || []
    const adminUsers = rawAdminUsers.map(u => u.toLowerCase())
    const isAdmin = user?.username && adminUsers.includes(user.username.toLowerCase()) || false
    const firstAdminName = rawAdminUsers[0]?.trim() // Get first admin name for branding
    let shopNameOverride: string | null = null
    let shopLogoOverride: string | null = null
    try {
        const [name, logo] = await Promise.all([
            getSetting('shop_name'),
            getSetting('shop_logo')
        ])
        shopNameOverride = name
        shopLogoOverride = logo
    } catch {
        shopNameOverride = null
        shopLogoOverride = null
    }
    if (isAdmin && user?.avatar_url && (!shopLogoOverride || !shopLogoOverride.trim())) {
        try {
            await setSetting('shop_logo', user.avatar_url)
            await setSetting('shop_logo_updated_at', String(Date.now()))
            shopLogoOverride = user.avatar_url
        } catch {
            // best effort
        }
    }

    let checkinEnabled = true
    try {
        const v = await getSetting('checkin_enabled')
        checkinEnabled = v !== 'false'
    } catch {
        checkinEnabled = true
    }

    const registryEnabled = isRegistryEnabled()
    let registryOptIn = false
    let registryHideNav = false
    if (registryEnabled) {
        try {
            const [optIn, hideNav] = await Promise.all([
                getSetting('registry_opt_in'),
                getSetting('registry_hide_nav')
            ])
            registryOptIn = optIn === 'true'
            registryHideNav = hideNav === 'true'
        } catch {
            registryOptIn = false
            registryHideNav = false
        }
    }
    const showNavigator = registryEnabled && (registryOptIn || !registryHideNav)

    let unreadCount = 0
    let desktopNotificationsEnabled = false
    if (user?.id) {
        try {
            unreadCount = await getUserUnreadNotificationCount(user.id)
        } catch {
            unreadCount = 0
        }
        try {
            desktopNotificationsEnabled = await getLoginUserDesktopNotificationsEnabled(user.id)
        } catch {
            desktopNotificationsEnabled = false
        }
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-gradient-to-b from-background/90 via-background/70 to-background/55 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/25 after:to-transparent">
            <div className="container flex h-16 items-center gap-2 md:gap-3">
                <div className="flex items-center gap-4 md:gap-8 min-w-0">
                    <HeaderLogo adminName={firstAdminName} shopNameOverride={shopNameOverride} shopLogoOverride={shopLogoOverride} />
                    <HeaderNav isAdmin={isAdmin} isLoggedIn={!!user} showNav={showNavigator} />
                </div>
                <div className="hidden md:flex flex-1 justify-center px-4">
                    {/* HeaderSearch removed as per user request */}
                </div>
                <div className="ml-auto flex items-center justify-end gap-2 md:gap-3">
                    <nav className="flex items-center space-x-1 rounded-full border border-border/20 bg-muted/20 px-1.5 py-1 md:px-2">
                        <LanguageSwitcher />
                        <ModeToggle />
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 overflow-visible rounded-full bg-background/70 hover:bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/25 hover:ring-offset-2 hover:ring-offset-background">
                                        <HeaderUnreadBadge initialCount={unreadCount} desktopEnabled={desktopNotificationsEnabled} className="absolute -top-1 -right-1 z-10 pointer-events-none shadow-sm" />
                                        <Avatar className="relative z-0 h-8 w-8">
                                            <AvatarImage src={user.avatar_url || ''} alt={user.name || ''} />
                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">ID: {user.id}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1">
                                        <CheckInButton enabled={checkinEnabled} />
                                    </div>
                                    <DropdownMenuSeparator />
                                    <HeaderUserMenuItems isAdmin={isAdmin} showNav={showNavigator} />
                                    <DropdownMenuSeparator />
                                    <SignOutButton />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <SignInButton />
                        )}
                    </nav>
                </div>
            </div>
        </header>
    )
}
