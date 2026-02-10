'use client'

import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Coins, Package, Clock, CheckCircle, ChevronRight, User, LogOut, Bell } from "lucide-react"
import { signOut } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateDesktopNotifications, updateProfileEmail } from "@/actions/profile"
import { useEffect, useRef, useState } from "react"
import { CheckInButton } from "@/components/checkin-button"
import { clearMyNotifications, getMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/actions/user-notifications"
import { sendUserMessage } from "@/actions/user-messages"
import { cn } from "@/lib/utils"

interface ProfileContentProps {
    user: {
        id: string
        name: string
        username: string | null
        avatar: string | null
        email: string | null
        trustLevel?: number
    }
    points: number
    checkinEnabled: boolean
    orderStats: {
        total: number
        pending: number
        delivered: number
    }
    notifications: Array<{
        id: number
        type: string
        titleKey: string
        contentKey: string
        data: string | null
        isRead: boolean | null
        createdAt: number | null
    }>
    desktopNotificationsEnabled: boolean
}

export function ProfileContent({ user, points, checkinEnabled, orderStats, notifications: initialNotifications, desktopNotificationsEnabled }: ProfileContentProps) {
    const { t } = useI18n()
    const [email, setEmail] = useState(user.email || '')
    const [savingEmail, setSavingEmail] = useState(false)
    const [pointsValue, setPointsValue] = useState(points)
    const [notifications, setNotifications] = useState(initialNotifications)
    const [markingAll, setMarkingAll] = useState(false)
    const [markingId, setMarkingId] = useState<number | null>(null)
    const [clearing, setClearing] = useState(false)
    const [expandedIds, setExpandedIds] = useState<number[]>([])
    const [msgTitle, setMsgTitle] = useState("")
    const [msgBody, setMsgBody] = useState("")
    const [msgSending, setMsgSending] = useState(false)
    const [desktopEnabled, setDesktopEnabled] = useState(desktopNotificationsEnabled)
    const [desktopSaving, setDesktopSaving] = useState(false)
    const notifiedIdsRef = useRef<Set<number>>(new Set())

    const unreadCount = notifications.filter((n) => !n.isRead).length

    const parseNotificationData = (data: string | null) => {
        if (!data) return {}
        try {
            return JSON.parse(data) as { params?: Record<string, string | number>; href?: string }
        } catch {
            return {}
        }
    }

    const emitNotificationUpdate = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("ldc:notifications-updated"))
        }
    }

    const handleMarkRead = async (id: number) => {
        if (markingId === id) return
        setMarkingId(id)
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
        try {
            const res = await markNotificationRead(id)
            if (!res?.success) {
                // revert if failed
                setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)))
            }
            emitNotificationUpdate()
        } catch {
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)))
        } finally {
            setMarkingId(null)
        }
    }

    useEffect(() => {
        const refresh = async () => {
            try {
                const res = await getMyNotifications()
                if (res?.success && res.items) {
                    setNotifications(res.items)
                }
            } catch {
                // ignore refresh failures
            }
        }
        refresh()
    }, [])

    useEffect(() => {
        if (!desktopEnabled) return
        if (typeof window === "undefined" || !("Notification" in window)) return
        if (Notification.permission !== "granted") return

        const unread = notifications.filter((n) => !n.isRead)
        const fresh = unread.filter((n) => !notifiedIdsRef.current.has(n.id))
        if (!fresh.length) return

        fresh.slice(0, 3).forEach((n) => {
            const data = parseNotificationData(n.data)
            const params = data.params || {}
            const title = t(n.titleKey, params)
            const body = t(n.contentKey, params)
            new Notification(title, { body })
            notifiedIdsRef.current.add(n.id)
        })
    }, [desktopEnabled, notifications, t])

    const ensureNotificationPermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            toast.error(t('profile.desktopNotifications.unsupported'))
            return false
        }
        if (Notification.permission === "granted") return true
        if (Notification.permission === "denied") {
            toast.error(t('profile.desktopNotifications.permissionDenied'))
            return false
        }
        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
            toast.error(t('profile.desktopNotifications.permissionDenied'))
            return false
        }
        return true
    }

    const handleToggleDesktopNotifications = async () => {
        if (desktopSaving) return
        const next = !desktopEnabled
        if (next) {
            const ok = await ensureNotificationPermission()
            if (!ok) return
        }
        setDesktopSaving(true)
        try {
            const res = await updateDesktopNotifications(next)
            if (res?.success) {
                setDesktopEnabled(next)
                toast.success(next ? t('profile.desktopNotifications.enabledToast') : t('profile.desktopNotifications.disabledToast'))
                if (next) {
                    notifiedIdsRef.current = new Set(notifications.map((n) => n.id))
                }
                if (next && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                    new Notification(t('profile.desktopNotifications.testTitle'), {
                        body: t('profile.desktopNotifications.testBody')
                    })
                }
            } else {
                toast.error(res?.error ? t(res.error) : t('common.error'))
            }
        } catch {
            toast.error(t('common.error'))
        } finally {
            setDesktopSaving(false)
        }
    }

    return (
        <main className="container py-8 max-w-2xl">
            {/* User Info */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.avatar || ''} alt={user.name} />
                            <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold">{user.name}</h1>
                            {user.username && (
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>ID: {user.id}</span>
                                <Badge variant="outline" className="text-xs">{t('profile.trustLevel')}: {Number.isFinite(Number(user.trustLevel)) ? user.trustLevel : 0}</Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Email */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('profile.emailTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="floating-field">
                        <Input
                            id="profile-email"
                            type="email"
                            placeholder=" "
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={savingEmail}
                        />
                        <Label htmlFor="profile-email" className="floating-label">{t('profile.emailLabel')}</Label>
                        <p className="text-xs text-muted-foreground">{t('profile.emailHint')}</p>
                        <Button
                            variant="outline"
                            className="mt-2"
                            disabled={savingEmail}
                            onClick={async () => {
                                setSavingEmail(true)
                                try {
                                    const result = await updateProfileEmail(email)
                                    if (result?.success) {
                                        toast.success(t('profile.emailSaved'))
                                    } else {
                                        toast.error(result?.error ? t(result.error) : t('common.error'))
                                    }
                                } catch {
                                    toast.error(t('common.error'))
                                } finally {
                                    setSavingEmail(false)
                                }
                            }}
                        >
                            {t('profile.emailSave')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Desktop Notifications */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('profile.desktopNotifications.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">{t('profile.desktopNotifications.desc')}</p>
                        <Button
                            type="button"
                            variant={desktopEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={handleToggleDesktopNotifications}
                            disabled={desktopSaving}
                        >
                            {desktopEnabled ? t('profile.desktopNotifications.enabled') : t('profile.desktopNotifications.disabled')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Points Card */}
            <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                                <Coins className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.credits')}</p>
                                <p className="text-2xl font-bold text-amber-600">{pointsValue}</p>
                            </div>
                        </div>
                        <CheckInButton
                            enabled={checkinEnabled}
                            showPoints={false}
                            showCheckedInLabel
                            className="shrink-0"
                            onPointsChange={setPointsValue}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Order Stats */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span>{t('common.myOrders')}</span>
                        <Link href="/orders">
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                {t('common.viewOrders')} <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-muted/50">
                            <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-2xl font-bold">{orderStats.total}</p>
                            <p className="text-xs text-muted-foreground">{t('admin.stats.total')}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                            <p className="text-2xl font-bold">{orderStats.pending}</p>
                            <p className="text-xs text-muted-foreground">{t('order.status.pending')}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                            <p className="text-2xl font-bold">{orderStats.delivered}</p>
                            <p className="text-xs text-muted-foreground">{t('order.status.delivered')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inbox */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            {t('profile.inboxTitle')}
                            {unreadCount > 0 && (
                                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </span>
                        {notifications.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={markingAll || unreadCount === 0}
                                    onClick={async () => {
                                        if (markingAll || unreadCount === 0) return
                                        setMarkingAll(true)
                                        try {
                                            const res = await markAllNotificationsRead()
                                            if (res?.success) {
                                                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
                                                emitNotificationUpdate()
                                                toast.success(t('profile.inboxMarked'))
                                            } else {
                                                toast.error(t('common.error'))
                                            }
                                        } catch {
                                            toast.error(t('common.error'))
                                        } finally {
                                            setMarkingAll(false)
                                        }
                                    }}
                                >
                                    {t('profile.markAllRead')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={clearing}
                                    onClick={async () => {
                                        if (clearing) return
                                        setClearing(true)
                                        try {
                                            const res = await clearMyNotifications()
                                            if (res?.success) {
                                                setNotifications([])
                                                emitNotificationUpdate()
                                                toast.success(t('profile.inboxCleared'))
                                            } else {
                                                toast.error(t('common.error'))
                                            }
                                        } catch {
                                            toast.error(t('common.error'))
                                        } finally {
                                            setClearing(false)
                                        }
                                    }}
                                >
                                    {t('profile.clearInbox')}
                                </Button>
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('profile.inboxEmpty')}</p>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((n) => {
                                const meta = parseNotificationData(n.data)
                                const params = meta.params || {}
                                const title = typeof (meta as any).title === "string" && (meta as any).title.trim()
                                    ? (meta as any).title
                                    : t(n.titleKey, params)
                                const content = typeof (meta as any).body === "string" && (meta as any).body.trim()
                                    ? (meta as any).body
                                    : t(n.contentKey, params)
                                const time = n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'
                                const isExpanded = expandedIds.includes(n.id)
                                const contentClass = cn(
                                    "text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap",
                                    !isExpanded ? "line-clamp-2" : ""
                                )
                                const body = (
                                    <div className={`rounded-lg border p-3 ${n.isRead ? "bg-muted/30" : "bg-primary/5 border-primary/30"}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{title}</span>
                                                    {!n.isRead && (
                                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/50">
                                                            {t('profile.unread')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className={contentClass}>{content}</p>
                                                <p className="text-xs text-muted-foreground mt-2">{time}</p>
                                            </div>
                                            {meta.href && (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                                            )}
                                        </div>
                                    </div>
                                )

                                return meta.href ? (
                                    <Link
                                        key={n.id}
                                        href={meta.href}
                                        className="block"
                                        onClick={() => {
                                            if (!n.isRead) void handleMarkRead(n.id)
                                        }}
                                    >
                                        {body}
                                    </Link>
                                ) : (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            if (!n.isRead) void handleMarkRead(n.id)
                                            setExpandedIds((prev) =>
                                                prev.includes(n.id) ? prev.filter((x) => x !== n.id) : [...prev, n.id]
                                            )
                                        }}
                                    >
                                        {body}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contact Admin */}
            <Card className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('profile.messages.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-2">
                        <Label htmlFor="msg-title">{t('profile.messages.titleLabel')}</Label>
                        <Input
                            id="msg-title"
                            value={msgTitle}
                            onChange={(e) => setMsgTitle(e.target.value)}
                            placeholder={t('profile.messages.titlePlaceholder')}
                            disabled={msgSending}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="msg-body">{t('profile.messages.bodyLabel')}</Label>
                        <Textarea
                            id="msg-body"
                            className="min-h-[120px]"
                            placeholder={t('profile.messages.bodyPlaceholder')}
                            value={msgBody}
                            onChange={(e) => setMsgBody(e.target.value)}
                            disabled={msgSending}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            disabled={msgSending}
                            onClick={async () => {
                                if (msgSending) return
                                setMsgSending(true)
                                try {
                                    const res = await sendUserMessage(msgTitle, msgBody)
                                    if (res?.success) {
                                        toast.success(t('profile.messages.sent'))
                                        setMsgTitle("")
                                        setMsgBody("")
                                    } else {
                                        toast.error(res?.error ? t(res.error) : t('common.error'))
                                    }
                                } catch {
                                    toast.error(t('common.error'))
                                } finally {
                                    setMsgSending(false)
                                }
                            }}
                        >
                            {msgSending ? t('common.processing') : t('profile.messages.send')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logout Button */}
            <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/" })}
            >
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.logout')}
            </Button>
        </main>
    )
}
