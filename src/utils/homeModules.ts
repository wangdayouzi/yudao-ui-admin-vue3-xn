export interface HomeModule {
  path: string
  title: string
  icon: string
}

const storageKey = (kind: 'recent' | 'favorite', userId: number) => `yudao:home:${kind}:${userId}`

export function getHomeModules(routes: AppRouteRecordRaw[]): HomeModule[] {
  const modules: HomeModule[] = []
  const visit = (items: AppRouteRecordRaw[], parentPath = '', parentIcon = '') => {
    for (const route of items) {
      if (route.meta?.hidden) continue
      const rawPath = route.path.startsWith('/')
        ? route.path
        : `${parentPath.replace(/\/$/, '')}/${route.path}`
      const path = rawPath.replace(/\/+$/, '') || '/'
      const icon = String(route.meta?.icon || parentIcon || 'ep:grid')
      if (route.children?.length) {
        visit(route.children, path, icon)
      } else if (
        route.meta?.title &&
        path !== '/index' &&
        !path.includes(':') &&
        !path.startsWith('/redirect') &&
        !/^https?:/i.test(path)
      ) {
        modules.push({ path, title: String(route.meta.title), icon })
      }
    }
  }
  visit(routes)
  return Array.from(new Map(modules.map((item) => [item.path, item])).values())
}

export function readHomeModulePaths(kind: 'recent' | 'favorite', userId: number): string[] {
  if (!userId) return []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(kind, userId)) || '[]')
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function saveHomeModulePaths(kind: 'recent' | 'favorite', userId: number, paths: string[]) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(kind, userId), JSON.stringify(paths))
  } catch {
    // The navigation itself must still work when browser storage is unavailable.
  }
}

export function recordRecentModule(path: string, userId: number, routes: AppRouteRecordRaw[]) {
  if (!userId || !getHomeModules(routes).some((item) => item.path === path)) return
  const paths = readHomeModulePaths('recent', userId).filter((item) => item !== path)
  saveHomeModulePaths('recent', userId, [path, ...paths].slice(0, 8))
}
