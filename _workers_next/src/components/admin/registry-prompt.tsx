"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { joinRegistry, dismissRegistryPrompt } from "@/actions/registry"
import { toast } from "sonner"

interface RegistryPromptProps {
    shouldPrompt: boolean
    registryEnabled: boolean
}

export function RegistryPrompt({ shouldPrompt, registryEnabled }: RegistryPromptProps) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (registryEnabled && shouldPrompt) {
            setOpen(true)
        }
    }, [registryEnabled, shouldPrompt])

    if (!registryEnabled) return null

    const handleSkip = async () => {
        if (loading) return
        setLoading(true)
        try {
            await dismissRegistryPrompt()
            setOpen(false)
        } catch {
            toast.error(t("registry.submitFailed"))
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async () => {
        if (loading) return
        setLoading(true)
        try {
            const result = await joinRegistry(window.location.origin)
            if (!result.ok) {
                throw new Error(result.error || "submit_failed")
            }
            toast.success(t("registry.submitSuccess"))
            setOpen(false)
        } catch {
            toast.error(t("registry.submitFailed"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) {
                    handleSkip()
                } else {
                    setOpen(true)
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("registry.promptTitle")}</DialogTitle>
                    <DialogDescription>{t("registry.promptDescription")}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={handleSkip} disabled={loading}>
                        {t("registry.notNow")}
                    </Button>
                    <Button onClick={handleJoin} disabled={loading}>
                        {t("registry.joinNow")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
