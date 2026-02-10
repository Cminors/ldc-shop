"use client"

import { useMemo, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { clearAdminMessages, deleteAdminMessage, sendAdminMessage } from "@/actions/admin-messages"
import { clearUserMessages, deleteUserMessage, markUserMessageRead } from "@/actions/user-messages"
import { useRouter } from "next/navigation"

type TargetType = "all" | "username" | "userId"

export function AdminMessagesContent({ history, inbox }: { history: any[]; inbox: any[] }) {
    const { t } = useI18n()
    const router = useRouter()
    const [targetType, setTargetType] = useState<TargetType>("all")
    const [targetValue, setTargetValue] = useState("")
    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [sending, setSending] = useState(false)
    const [deleting, setDeleting] = useState<number | null>(null)
    const [clearingHistory, setClearingHistory] = useState(false)
    const [historyItems, setHistoryItems] = useState(history)
    const [inboxItems, setInboxItems] = useState(inbox)
    const [inboxDeleting, setInboxDeleting] = useState<number | null>(null)
    const [inboxReading, setInboxReading] = useState<number | null>(null)
    const [clearingInbox, setClearingInbox] = useState(false)
    const [expandedInboxIds, setExpandedInboxIds] = useState<number[]>([])

    const targetPlaceholder = useMemo(() => {
        if (targetType === "username") return t('admin.messages.usernamePlaceholder')
        if (targetType === "userId") return t('admin.messages.userIdPlaceholder')
        return ""
    }, [targetType, t])

    const targetLabel = useMemo(() => {
        if (targetType === "username") return t('admin.messages.usernameLabel')
        if (targetType === "userId") return t('admin.messages.userIdLabel')
        return t('admin.messages.allUsers')
    }, [targetType, t])

    const formatTarget = (row: any) => {
        if (row.targetType === "all") return t('admin.messages.allUsers')
        if (row.targetType === "username") return `@${row.targetValue}`
        if (row.targetType === "userId") return `ID: ${row.targetValue}`
        return row.targetValue || '-'
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.messages.title')}</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('admin.messages.compose')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('admin.messages.targetType')}</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={targetType === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTargetType("all")}
                                >
                                    {t('admin.messages.allUsers')}
                                </Button>
                                <Button
                                    type="button"
                                    variant={targetType === "username" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTargetType("username")}
                                >
                                    {t('admin.messages.byUsername')}
                                </Button>
                                <Button
                                    type="button"
                                    variant={targetType === "userId" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTargetType("userId")}
                                >
                                    {t('admin.messages.byUserId')}
                                </Button>
                            </div>
                        </div>
                        {targetType !== "all" && (
                            <div className="floating-field">
                                <Input
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(e.target.value)}
                                    placeholder=" "
                                />
                                <Label className="floating-label">{targetLabel}</Label>
                                {targetPlaceholder && (
                                    <p className="text-xs text-muted-foreground">{targetPlaceholder}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="floating-field">
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder=" " />
                            <Label className="floating-label">{t('admin.messages.titleLabel')}</Label>
                        </div>
                        <div className="floating-field">
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder=" "
                                rows={5}
                            />
                            <Label className="floating-label">{t('admin.messages.bodyLabel')}</Label>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            disabled={sending}
                            onClick={async () => {
                                if (sending) return
                                setSending(true)
                                try {
                                    const res = await sendAdminMessage({
                                        targetType,
                                        targetValue,
                                        title,
                                        body
                                    })
                                    if (res?.success) {
                                        toast.success(t('admin.messages.sent', { count: res.count ?? 0 }))
                                        setTitle("")
                                        setBody("")
                                        if (targetType !== "all") setTargetValue("")
                                        router.refresh()
                                    } else {
                                        toast.error(res?.error ? t(res.error) : t('common.error'))
                                    }
                                } catch (e: any) {
                                    toast.error(e.message || t('common.error'))
                                } finally {
                                    setSending(false)
                                }
                            }}
                        >
                            {sending ? t('common.processing') : t('admin.messages.send')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>{t('admin.messages.history')}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={clearingHistory || historyItems.length === 0}
                            onClick={async () => {
                                if (clearingHistory || historyItems.length === 0) return
                                if (!confirm(t('admin.messages.clearConfirm'))) return
                                setClearingHistory(true)
                                try {
                                    await clearAdminMessages()
                                    setHistoryItems([])
                                    toast.success(t('admin.messages.cleared'))
                                } catch (e: any) {
                                    toast.error(e.message || t('common.error'))
                                } finally {
                                    setClearingHistory(false)
                                }
                            }}
                        >
                            {t('admin.messages.clearHistory')}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {historyItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t('admin.messages.empty')}</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('admin.messages.target')}</TableHead>
                                        <TableHead>{t('admin.messages.titleLabel')}</TableHead>
                                        <TableHead>{t('admin.messages.bodyLabel')}</TableHead>
                                        <TableHead>{t('admin.messages.sender')}</TableHead>
                                        <TableHead>{t('admin.messages.date')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyItems.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="text-xs text-muted-foreground">{formatTarget(row)}</TableCell>
                                            <TableCell className="font-medium">{row.title}</TableCell>
                                            <TableCell className="max-w-[320px]">
                                                <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{row.body}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{row.sender || '-'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={deleting === row.id}
                                                    onClick={async () => {
                                                        if (deleting === row.id) return
                                                        setDeleting(row.id)
                                                        try {
                                                            await deleteAdminMessage(row.id)
                                                            setHistoryItems((prev) => prev.filter((item: any) => item.id !== row.id))
                                                            toast.success(t('common.success'))
                                                        } catch (e: any) {
                                                            toast.error(e.message || t('common.error'))
                                                        } finally {
                                                            setDeleting(null)
                                                        }
                                                    }}
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>{t('admin.messages.inboxTitle')}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={clearingInbox || inboxItems.length === 0}
                            onClick={async () => {
                                if (clearingInbox || inboxItems.length === 0) return
                                if (!confirm(t('admin.messages.clearConfirm'))) return
                                setClearingInbox(true)
                                try {
                                    await clearUserMessages()
                                    setInboxItems([])
                                    if (typeof window !== "undefined") {
                                        window.dispatchEvent(new CustomEvent("ldc:user-messages-updated"))
                                    }
                                    toast.success(t('admin.messages.cleared'))
                                } catch (e: any) {
                                    toast.error(e.message || t('common.error'))
                                } finally {
                                    setClearingInbox(false)
                                }
                            }}
                        >
                            {t('admin.messages.clearInbox')}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {inboxItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t('admin.messages.inboxEmpty')}</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('admin.messages.inboxUser')}</TableHead>
                                        <TableHead>{t('admin.messages.titleLabel')}</TableHead>
                                        <TableHead>{t('admin.messages.bodyLabel')}</TableHead>
                                        <TableHead>{t('admin.messages.date')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inboxItems.map((row: any) => {
                                        const expanded = expandedInboxIds.includes(row.id)
                                        return (
                                            <TableRow key={row.id} className={!row.isRead ? "bg-primary/5" : undefined}>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {row.username ? `@${row.username}` : row.userId}
                                                </TableCell>
                                                <TableCell className="font-medium">{row.title}</TableCell>
                                                <TableCell className="max-w-[320px]">
                                                    <div className={`text-sm text-muted-foreground whitespace-pre-wrap ${expanded ? "" : "line-clamp-2"}`}>
                                                        {row.body}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setExpandedInboxIds((prev) =>
                                                                    prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id]
                                                                )
                                                            }}
                                                        >
                                                            {expanded ? t('common.collapse') : t('common.expand')}
                                                        </Button>
                                                        {!row.isRead && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={inboxReading === row.id}
                                                                onClick={async () => {
                                                                    if (inboxReading === row.id) return
                                                                    setInboxReading(row.id)
                                                                    try {
                                                                        await markUserMessageRead(row.id)
                                                                        setInboxItems((prev: any[]) =>
                                                                            prev.map((item) => item.id === row.id ? { ...item, isRead: true } : item)
                                                                        )
                                                                        if (typeof window !== "undefined") {
                                                                            window.dispatchEvent(new CustomEvent("ldc:user-messages-updated"))
                                                                        }
                                                                    } catch (e: any) {
                                                                        toast.error(e.message || t('common.error'))
                                                                    } finally {
                                                                        setInboxReading(null)
                                                                    }
                                                                }}
                                                            >
                                                                {t('admin.messages.markRead')}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={inboxDeleting === row.id}
                                                            onClick={async () => {
                                                                if (inboxDeleting === row.id) return
                                                                setInboxDeleting(row.id)
                                                                try {
                                                                    await deleteUserMessage(row.id)
                                                                    setInboxItems((prev: any[]) => prev.filter((item) => item.id !== row.id))
                                                                    if (typeof window !== "undefined") {
                                                                        window.dispatchEvent(new CustomEvent("ldc:user-messages-updated"))
                                                                    }
                                                                } catch (e: any) {
                                                                    toast.error(e.message || t('common.error'))
                                                                } finally {
                                                                    setInboxDeleting(null)
                                                                }
                                                            }}
                                                        >
                                                            {t('common.delete')}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
