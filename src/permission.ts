import router from './router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { isRelogin } from '@/config/axios/service'
import { getAccessToken, setToken } from '@/utils/auth'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { useDictStoreWithOut } from '@/store/modules/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { parseRouteLocation } from '@/utils/routeParams'

const { start, done } = useNProgress()

const { loadStart, loadDone } = usePageLoading()

// 登录后提醒：用户邮箱为空时提示完善（每个浏览器会话只弹一次，避免每次刷新都打扰）
const EMAIL_EMPTY_REMIND_KEY = 'EMAIL_EMPTY_REMINDED'
const remindEmptyEmail = () => {
  const userStore = useUserStoreWithOut()
  const email = (userStore.getUser.email || '').trim()
  if (email) {
    return // 已有邮箱，无需提醒
  }
  if (sessionStorage.getItem(EMAIL_EMPTY_REMIND_KEY)) {
    return // 本会话已提醒过，避免重复打扰
  }
  sessionStorage.setItem(EMAIL_EMPTY_REMIND_KEY, '1')
  ElMessageBox.confirm('您的账号尚未填写邮箱，将无法正常接收发货等邮件通知。建议前往个人中心完善邮箱。', '完善邮箱提醒', {
    confirmButtonText: '去完善',
    cancelButtonText: '暂不',
    type: 'warning'
  })
    .then(() => {
      router.push('/user/profile')
    })
    .catch(() => {})
}

// 路由不重定向白名单
const whiteList = [
  '/login',
  '/social-login',
  '/auth-redirect',
  '/bind',
  '/register',
  '/oauthLogin/gitee',
  '/pms/kb/document/share',
  // 独立样品看板：电视端直接打开，不要求登录
  '/reagent/sample-loan-screen'
]

// 路由加载前
router.beforeEach(async (to, from) => {
  start()
  loadStart()

  // 钉钉 OAuth 首次设密回调会落在任意前端路径；统一转到登录页展示设置密码弹窗。
  const passwordSetupToken = to.query.passwordSetupToken as string
  if (to.path !== '/login' && to.query.passwordSetupRequired === 'true' && passwordSetupToken) {
    return {
      path: '/login',
      query: {
        passwordSetupRequired: 'true',
        passwordSetupToken,
        redirect: to.path
      },
      replace: true
    }
  }

  // 钉钉OAuth回调携带token参数，提取并存储后清除URL参数
  const tokenParam = to.query.token as string
  if (tokenParam) {
    setToken({
      accessToken: tokenParam,
      refreshToken: (to.query.refreshToken as string) || '',
      userId: 0,
      userType: 0,
      clientId: '',
      id: 0,
      expiresTime: 0
    })
    return { path: to.path, query: {}, replace: true }
  }

  if (getAccessToken()) {
    if (to.path === '/login') {
      return { path: '/' }
    } else {
      const dictStore = useDictStoreWithOut()
      const userStore = useUserStoreWithOut()
      const permissionStore = usePermissionStoreWithOut()
      // 异步加载字典
      // 另外，间接 issue：https://gitee.com/yudaocode/yudao-ui-admin-vue3/issues/ID9FLI
      if (!dictStore.getIsSetDict) {
        dictStore.setDictMap().then()
      }
      if (!userStore.getIsSetUser) {
        isRelogin.show = true
        await userStore.setUserInfoAction()
        isRelogin.show = false
        // 登录后：邮箱为空时提醒完善（含账号密码/短信/钉钉OAuth等所有登录方式）
        remindEmptyEmail()
        // 后端过滤菜单
        await permissionStore.generateRoutes()
        permissionStore.getAddRouters.forEach((route) => {
          router.addRoute(route as unknown as RouteRecordRaw) // 动态添加可访问路由表
        })
        const redirectPath = from.query.redirect
        // 修复跳转时不带参数的问题
        const redirect = typeof redirectPath === 'string' ? redirectPath : to.fullPath
        const redirectLocation = parseRouteLocation(redirect)
        const nextData =
          to.fullPath === redirect
            ? { ...to, replace: true }
            : { ...redirectLocation, replace: true }
        return nextData
      } else {
        return true
      }
    }
  } else {
    if (whiteList.some((path) => to.path === path || to.path.startsWith(`${path}/`))) {
      return true
    } else {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}` // 否则全部重定向到登录页
    }
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done() // 结束Progress
  loadDone()
})
