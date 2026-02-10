"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Trash2, ThumbsUp, Sparkles } from "lucide-react"
import { submitWishlistItem, toggleWishlistVote, deleteWishlistItem } from "@/actions/wishlist"
import { cn } from "@/lib/utils"

export interface WishlistItem {
    id: number
    title: string
    description?: string | null
    username?: string | null
    createdAt?: number | null
    votes: number
    voted: boolean
}

export function WishlistSection({
    initialItems,
    isLoggedIn,
    isAdmin = false,
}: {
    initialItems: WishlistItem[]
    isLoggedIn: boolean
    isAdmin?: boolean
}) {
    const { t } = useI18n()
    const [items, setItems] = useState<WishlistItem[]>(initialItems || [])
    const [title, setTitle] = useState("")
    const [desc, setDesc] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [votingId, setVotingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const submitLock = useRef(false)
    const voteLock = useRef<number | null>(null)

    const handleSubmit = async () => {
        if (submitLock.current) return
        if (!isLoggedIn) {
            toast.error(t("wishlist.loginRequired"))
            return
        }
        const cleanTitle = title.trim()
        const cleanDesc = desc.trim()
        if (!cleanTitle) {
            toast.error(t("wishlist.titleRequired"))
            return
        }
        submitLock.current = true
        setSubmitting(true)
        try {
            const res = await submitWishlistItem(cleanTitle, cleanDesc)
            if (res?.success && res.item) {
                setItems((prev) => [res.item, ...prev])
                setTitle("")
                setDesc("")
                toast.success(t("wishlist.submitSuccess"))
            } else {
                toast.error(res?.error ? t(res.error) : t("common.error"))
            }
        } catch {
            toast.error(t("common.error"))
        } finally {
            setSubmitting(false)
            submitLock.current = false
        }
    }

    const handleVote = async (itemId: number) => {
        if (voteLock.current === itemId) return
        if (!isLoggedIn) {
            toast.error(t("wishlist.loginRequired"))
            return
        }
        voteLock.current = itemId
        setVotingId(itemId)
        try {
            const res = await toggleWishlistVote(itemId)
            if (res?.success) {
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === itemId
                            ? { ...item, voted: !!res.voted, votes: Number(res.count ?? item.votes) }
                            : item
                    )
                )
            } else {
                toast.error(res?.error ? t(res.error) : t("common.error"))
            }
        } catch {
            toast.error(t("common.error"))
        } finally {
            setVotingId(null)
            voteLock.current = null
        }
    }

    const handleDelete = async (itemId: number) => {
        if (!confirm(t("common.confirmDelete"))) return
        setDeletingId(itemId)
        try {
            const res = await deleteWishlistItem(itemId)
            if (res?.success) {
                setItems((prev) => prev.filter((item) => item.id !== itemId))
                toast.success(t("common.deleteSuccess"))
            } else {
                toast.error(t("common.error"))
            }
        } catch {
            toast.error(t("common.error"))
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <section id="wishlist" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{t("wishlist.title")}</h2>
                </div>
                {!isLoggedIn && (
                    <Link href="/login">
                        <Button size="sm" variant="outline">{t("wishlist.loginToSubmit")}</Button>
                    </Link>
                )}
            </div>
            <p className="text-sm text-muted-foreground">{t("wishlist.subtitle")}</p>

            <Card className="border-border/60 bg-card/60">
                <CardHeader>
                    <CardTitle className="text-base">{t("wishlist.submitTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("wishlist.titlePlaceholder")}
                        disabled={submitting}
                    />
                    <Textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={t("wishlist.descPlaceholder")}
                        rows={3}
                        disabled={submitting}
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? t("common.processing") : t("wishlist.submit")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t("wishlist.empty")}
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                        <Card key={item.id} className="border-border/60 bg-background/60">
                            <CardContent className="pt-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">{item.title}</div>
                                        {item.description && (
                                            <p
                                                className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap cursor-help"
                                                title={item.description}
                                            >
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant={item.voted ? "default" : "secondary"}>
                                            {item.votes}
                                        </Badge>
                                        {isAdmin && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        {item.username ? `@${item.username}` : t("wishlist.anonymous")}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={item.voted ? "default" : "outline"}
                                        className={cn("gap-1", item.voted && "bg-primary text-primary-foreground")}
                                        onClick={() => handleVote(item.id)}
                                        disabled={votingId === item.id}
                                    >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                        {item.voted ? t("wishlist.voted") : t("wishlist.vote")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    )
}
