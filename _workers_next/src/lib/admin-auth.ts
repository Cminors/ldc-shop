export function getAdminUsernames() {
    return (process.env.ADMIN_USERS || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
}

export function isAdminUsername(username?: string | null) {
    if (!username) return false
    const adminUsers = getAdminUsernames()
    return adminUsers.some((name) => name.toLowerCase() === username.toLowerCase())
}
