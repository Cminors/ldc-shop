'use client'

import { useI18n } from "@/lib/i18n/context"
import type { ReactNode } from "react"

interface FooterContentProps {
    customFooter: string | null
    version: string
}

export function FooterContent({ customFooter, version }: FooterContentProps) {
    const { t } = useI18n()
    const footerText = customFooter?.trim() || t('footer.disclaimer')

    const linkify = (text: string) => {
        const nodes: ReactNode[] = []
        const urlRegex = /https?:\/\/[^\s]+/g
        let lastIndex = 0
        let match: RegExpExecArray | null
        let linkIndex = 0

        while ((match = urlRegex.exec(text)) !== null) {
            const [raw] = match
            const start = match.index
            if (start > lastIndex) {
                nodes.push(text.slice(lastIndex, start))
            }

            let url = raw
            let trailing = ''
            while (url.length && /[),.!?]/.test(url[url.length - 1])) {
                trailing = url[url.length - 1] + trailing
                url = url.slice(0, -1)
            }

            if (url) {
                nodes.push(
                    <a
                        key={`footer-link-${linkIndex++}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground/80 hover:text-primary transition-colors duration-300"
                    >
                        {url}
                    </a>
                )
            }
            if (trailing) nodes.push(trailing)
            lastIndex = start + raw.length
        }

        if (lastIndex < text.length) {
            nodes.push(text.slice(lastIndex))
        }

        return nodes
    }

    const renderFooterText = (text: string) => {
        const lines = text.split(/\r?\n/)
        return lines.flatMap((line, idx) => {
            const parts = linkify(line)
            if (idx < lines.length - 1) {
                return [...parts, <br key={`footer-br-${idx}`} />]
            }
            return parts
        })
    }

    return (
        <footer className="border-t border-border/50 py-6 pb-20 md:py-0 md:pb-0 bg-gradient-to-t from-muted/30 to-transparent">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p
                        className="text-center text-xs leading-loose text-muted-foreground/80 md:text-left footer-html"
                        dangerouslySetInnerHTML={{ __html: footerText }}
                    />
                </div>
                <a href="https://github.com/chatgptuk/ldc-shop" target="_blank" rel="noreferrer" className="text-center text-xs text-muted-foreground/40 hover:text-primary transition-colors duration-300">
                    v{version}
                </a>
            </div>
        </footer>
    )
}
