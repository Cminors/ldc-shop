import { cookies, headers } from "next/headers"
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

type Locale = 'en' | 'zh'
type Translations = typeof en

const translations: Record<Locale, Translations> = { en, zh }

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }, text)
}

async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('ldc-locale')?.value as Locale | undefined
  if (cookieLocale && translations[cookieLocale]) return cookieLocale

  const headerList = await headers()
  const acceptLang = headerList.get('accept-language') || ''
  if (acceptLang.toLowerCase().includes('zh')) return 'zh'
  return 'en'
}

export async function getServerI18n() {
  const locale = await detectLocale()
  const t = (key: string, params?: Record<string, string | number>): string => {
    const text = getNestedValue(translations[locale], key)
    return interpolate(text, params)
  }
  return { locale, t }
}
