"use server"

import { APP_VERSION } from "@/lib/version"

// Upstream repository to check for updates
const UPSTREAM_REPO = "chatgptuk/ldc-shop"

interface UpdateCheckResult {
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string | null
    releaseUrl: string | null
    error?: string
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
    try {
        // Fetch latest release from GitHub API
        const response = await fetch(
            `https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'LDC-Shop-Update-Checker'
                },
                // Cache for 1 hour
                next: { revalidate: 3600 }
            }
        )

        if (!response.ok) {
            // If no releases, try to get the latest tag
            if (response.status === 404) {
                // Try fetching tags instead
                const tagsResponse = await fetch(
                    `https://api.github.com/repos/${UPSTREAM_REPO}/tags`,
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'LDC-Shop-Update-Checker'
                        },
                        next: { revalidate: 3600 }
                    }
                )

                if (tagsResponse.ok) {
                    const tags = await tagsResponse.json()
                    if (tags.length > 0) {
                        const latestTag = tags[0].name.replace(/^v/, '')
                        return {
                            hasUpdate: compareVersions(latestTag, APP_VERSION) > 0,
                            currentVersion: APP_VERSION,
                            latestVersion: latestTag,
                            releaseUrl: `https://github.com/${UPSTREAM_REPO}`
                        }
                    }
                }

                return {
                    hasUpdate: false,
                    currentVersion: APP_VERSION,
                    latestVersion: null,
                    releaseUrl: null
                }
            }

            throw new Error(`GitHub API error: ${response.status}`)
        }

        const release = await response.json()
        const latestVersion = release.tag_name.replace(/^v/, '')

        return {
            hasUpdate: compareVersions(latestVersion, APP_VERSION) > 0,
            currentVersion: APP_VERSION,
            latestVersion,
            releaseUrl: release.html_url
        }
    } catch (error: any) {
        console.error('Update check failed:', error)
        return {
            hasUpdate: false,
            currentVersion: APP_VERSION,
            latestVersion: null,
            releaseUrl: null,
            error: error.message
        }
    }
}

// Compare semver versions: returns 1 if a > b, -1 if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number)
    const partsB = b.split('.').map(Number)

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0
        const partB = partsB[i] || 0
        if (partA > partB) return 1
        if (partA < partB) return -1
    }

    return 0
}

export async function getCurrentVersion(): Promise<string> {
    return APP_VERSION
}
