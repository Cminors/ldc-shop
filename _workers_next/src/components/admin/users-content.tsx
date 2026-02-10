'use client'

import { useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { saveUserPoints, toggleBlock } from "@/actions/admin-users"
import { Loader2, Search, ArrowLeft, ArrowRight, Edit, Ban, CheckCircle } from "lucide-react"

interface User {
    userId: string
    username: string | null
    points: number
    lastLoginAt: Date | null
    createdAt: Date | null
    orderCount: number
    isBlocked: boolean
}

interface UsersContentProps {
    data: {
        items: User[]
        total: number
        page: number
        pageSize: number
    }
}

export function UsersContent({ data }: UsersContentProps) {
    const { t } = useI18n()
    const router = useRouter()
    const searchParams = useSearchParams()

    // Search state
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
    const [isSearching, setIsSearching] = useState(false)

    // Edit state
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [newPoints, setNewPoints] = useState('')
    const [saving, setSaving] = useState(false)
    const [blockingId, setBlockingId] = useState<string | null>(null)
    const blockLock = useRef<string | null>(null)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setIsSearching(true)
        const params = new URLSearchParams(searchParams)
        if (searchTerm) {
            params.set('q', searchTerm)
        } else {
            params.delete('q')
        }
        params.set('page', '1') // Reset to page 1
        router.push(`/admin/users?${params.toString()}`)
        setIsSearching(false)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', String(newPage))
        router.push(`/admin/users?${params.toString()}`)
    }

    const openEditDialog = (user: User) => {
        setEditingUser(user)
        setNewPoints(String(user.points))
    }

    const handleSavePoints = async () => {
        if (!editingUser) return
        const points = parseInt(newPoints)
        if (isNaN(points)) return

        setSaving(true)
        try {
            await saveUserPoints(editingUser.userId, points)
            toast.success(t('common.success'))
            setEditingUser(null)
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || t('common.error'))
        } finally {
            setSaving(false)
        }
    }

    const handleToggleBlock = async (user: User) => {
        if (blockLock.current === user.userId) return
        const action = user.isBlocked ? 'unblock' : 'block'
        if (!confirm(t(`admin.users.confirm${action.charAt(0).toUpperCase() + action.slice(1)}`))) return

        try {
            blockLock.current = user.userId
            setBlockingId(user.userId)
            await toggleBlock(user.userId, !user.isBlocked)
            toast.success(t('common.success'))
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || t('common.error'))
        } finally {
            setBlockingId(null)
            blockLock.current = null
        }
    }

    const totalPages = Math.ceil(data.total / data.pageSize)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.users.title')}</h1>
            </div>

            <div className="flex items-center gap-4">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin.users.search')}
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.users.search')}
                    </Button>
                </form>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin.users.userId')}</TableHead>
                            <TableHead>{t('admin.users.username')}</TableHead>
                            <TableHead>{t('admin.users.points')}</TableHead>
                            <TableHead>{t('admin.users.orders')}</TableHead>
                            <TableHead>{t('admin.users.lastLogin')}</TableHead>
                            <TableHead>{t('admin.users.createdAt')}</TableHead>
                            <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    {t('search.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.items.map((user) => (
                                <TableRow key={user.userId}>
                                    <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                                    <TableCell>{user.username || '-'}</TableCell>
                                    <TableCell className="font-bold">{user.points}</TableCell>
                                    <TableCell>{user.orderCount}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('admin.users.editPoints')}
                                        </Button>
                                        <Button
                                            variant={user.isBlocked ? "default" : "destructive"}
                                            size="sm"
                                            onClick={() => handleToggleBlock(user)}
                                            title={user.isBlocked ? t('admin.users.unblock') : t('admin.users.block')}
                                            disabled={blockingId === user.userId}
                                        >
                                            {user.isBlocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(data.page - 1)}
                        disabled={data.page <= 1}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('search.prev')}
                    </Button>
                    <div className="flex items-center text-sm text-muted-foreground">
                        {t('search.page', { page: data.page, totalPages: totalPages })}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(data.page + 1)}
                        disabled={data.page >= totalPages}
                    >
                        {t('search.next')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.users.editPoints')}</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>{t('admin.users.username')}</Label>
                                <div className="text-sm font-medium">{editingUser.username || editingUser.userId}</div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('admin.users.currentPoints')}</Label>
                                <div className="text-sm font-medium">{editingUser.points}</div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-points">{t('admin.users.newPoints')}</Label>
                                <Input
                                    id="new-points"
                                    type="number"
                                    value={newPoints}
                                    onChange={(e) => setNewPoints(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSavePoints} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('admin.users.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
