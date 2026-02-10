'use client'

import { useMemo, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { saveCategory, deleteCategory } from "@/actions/admin"
import { toast } from "sonner"

type CategoryRow = { id: number; name: string; icon: string | null; sortOrder: number }

export function AdminCategoriesContent({ categories }: { categories: CategoryRow[] }) {
  const { t } = useI18n()
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const deleteLock = useRef<number | null>(null)

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name))
  }, [categories])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('icon', icon)
      formData.set('sortOrder', sortOrder)
      await saveCategory(formData)
      toast.success(t('common.success'))
      setName("")
      setIcon("")
      setSortOrder("0")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (row: CategoryRow, next: Partial<CategoryRow>) => {
    try {
      const formData = new FormData()
      formData.set('id', String(row.id))
      formData.set('name', next.name ?? row.name)
      formData.set('icon', next.icon ?? row.icon ?? '')
      formData.set('sortOrder', String(next.sortOrder ?? row.sortOrder ?? 0))
      await saveCategory(formData)
      toast.success(t('common.success'))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">{t('admin.categories.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.categories.create')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="floating-field">
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
            <Label htmlFor="cat-name" className="floating-label">{t('admin.categories.name')}</Label>
          </div>
          <div className="floating-field">
            <Input id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder=" " />
            <Label htmlFor="cat-icon" className="floating-label">{t('admin.categories.icon')}</Label>
          </div>
          <div className="floating-field">
            <Input id="cat-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder=" " />
            <Label htmlFor="cat-sort" className="floating-label">{t('admin.categories.sortOrder')}</Label>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? t('common.processing') : t('common.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.categories.icon')}</TableHead>
              <TableHead>{t('admin.categories.name')}</TableHead>
              <TableHead>{t('admin.categories.sortOrder')}</TableHead>
              <TableHead className="text-right">{t('admin.categories.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="w-[80px]">
                  <Input
                    defaultValue={c.icon || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if ((c.icon || '') !== v) handleUpdate(c, { icon: v || null })
                    }}
                    placeholder="🙂"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v && c.name !== v) handleUpdate(c, { name: v })
                    }}
                  />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Input
                    type="number"
                    defaultValue={String(c.sortOrder ?? 0)}
                    onBlur={(e) => {
                      const v = Number.parseInt(e.target.value, 10) || 0
                      if ((c.sortOrder ?? 0) !== v) handleUpdate(c, { sortOrder: v })
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (deleteLock.current === c.id) return
                      if (!confirm(t('common.confirm') + '?')) return
                      deleteLock.current = c.id
                      setDeletingId(c.id)
                      try {
                        await deleteCategory(c.id)
                        toast.success(t('common.success'))
                      } catch (e: any) {
                        toast.error(e.message)
                      } finally {
                        setDeletingId(null)
                        deleteLock.current = null
                      }
                    }}
                    disabled={deletingId === c.id}
                  >
                    {t('common.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
