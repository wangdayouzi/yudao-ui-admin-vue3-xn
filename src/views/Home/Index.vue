<template>
  <div class="space-y-8px">
    <el-card shadow="never" class="home-section">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-600">最近使用的模块</span>
          <span class="text-12px text-[var(--el-text-color-secondary)]">最近访问的 8 个模块</span>
        </div>
      </template>
      <div v-if="!recentModules.length" class="home-empty">访问模块后，这里会显示最近使用记录</div>
      <div v-else class="grid grid-cols-2 gap-8px md:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="item in recentModules"
          :key="item.path"
          class="home-entry flex min-w-0 items-center gap-12px"
        >
          <button
            class="flex min-w-0 flex-1 items-center gap-8px text-left"
            type="button"
            @click="openModule(item.path)"
          >
            <Icon :icon="item.icon" :size="20" class="shrink-0 text-[var(--el-color-primary)]" />
            <span class="truncate text-14px" :title="item.title">{{ item.title }}</span>
          </button>
          <el-button
            link
            :title="isFavorite(item.path) ? '取消常用' : '加入常用'"
            @click="toggleFavorite(item.path)"
          >
            <Icon
              :icon="isFavorite(item.path) ? 'ep:star-filled' : 'ep:star'"
              :size="18"
              :style="{ color: isFavorite(item.path) ? '#f5b301' : undefined }"
            />
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="home-section">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-8px">
          <span class="font-600">我的常用模块</span>
          <el-select v-model="moduleToAdd" class="!w-220px" filterable clearable placeholder="添加常用模块" @change="addFavorite">
            <el-option v-for="item in availableModules" :key="item.path" :label="item.title" :value="item.path" />
          </el-select>
        </div>
      </template>
      <div v-if="!favoriteModules.length" class="home-empty">点击模块旁的星标，添加常用模块</div>
      <div v-else class="grid grid-cols-2 gap-8px md:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="item in favoriteModules"
          :key="item.path"
          class="home-entry flex min-w-0 items-center gap-12px"
        >
          <button
            class="flex min-w-0 flex-1 items-center gap-8px text-left"
            type="button"
            @click="openModule(item.path)"
          >
            <Icon :icon="item.icon" :size="20" class="shrink-0 text-[var(--el-color-primary)]" />
            <span class="truncate text-14px" :title="item.title">{{ item.title }}</span>
          </button>
          <el-button link title="取消常用" @click="toggleFavorite(item.path)"
            ><Icon icon="ep:star-filled" :size="18" style="color: #f5b301"
          /></el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="home-section">
      <template #header><span class="font-600">系统导航</span></template>
      <div class="grid grid-cols-2 gap-8px md:grid-cols-3 xl:grid-cols-6">
        <button
          v-for="item in navLinks"
          :key="item.url"
          type="button"
          class="home-entry flex min-w-0 items-center gap-12px text-left"
          @click="handleNavClick(item.url)"
        >
          <Icon :icon="item.icon" :size="20" class="shrink-0" :style="{ color: item.color }" />
          <span class="truncate text-14px" :title="item.name">{{ item.name }}</span>
        </button>
      </div>
    </el-card>

    <!-- ==================== IT 工具箱 ==================== -->
    <el-card v-if="toolboxTools.length > 0" shadow="never" class="home-section mt-8px">
      <template #header>
        <div class="h-3 flex justify-between">
          <span>IT 工具箱</span>
        </div>
      </template>
      <el-row :gutter="8" class="gap-y-8px">
        <el-col
          v-for="(item, index) in toolboxTools"
          :key="`toolbox-${index}`"
          :xl="6"
          :lg="6"
          :md="8"
          :sm="12"
          :xs="12"
          class="!flex"
        >
          <el-card shadow="never" class="home-tool flex-1" body-class="!p-12px">
            <!-- 第一行：图标 + 名称 + 说明按钮 -->
            <div class="flex items-center gap-x-6px">
              <el-image
                v-if="isToolIconUrl(item.icon)"
                :src="item.icon"
                class="h-18px w-18px flex-none"
                fit="contain"
              />
              <Icon
                v-else-if="item.icon"
                :icon="item.icon"
                :size="18"
                class="flex-none"
                :style="{ color: '#409EFF' }"
              />
              <span class="min-w-0 flex-1 truncate text-13px" :title="item.name">{{
                item.name
              }}</span>
              <el-popover :width="260" trigger="click">
                <template #reference>
                  <el-button link type="primary" class="!p-0 !text-12px">
                    <Icon icon="ep:info-filled" class="mr-2px" /> 说明
                  </el-button>
                </template>
                <div class="text-13px">
                  <div class="mb-8px text-14px font-bold">{{ item.name }}</div>
                  <div class="text-gray-500" style="white-space: pre-line">
                    {{ item.description || '暂无说明' }}
                  </div>
                </div>
              </el-popover>
            </div>
            <!-- 第二行：分类/版本 + 下载（下载在版本后面） -->
            <div
              v-if="item.category || item.version"
              class="mt-6px flex items-center justify-between gap-x-6px"
            >
              <div class="flex min-w-0 items-center">
                <el-tag v-if="item.category" size="small">{{ item.category }}</el-tag>
                <el-tag v-if="item.version" size="small" type="info" class="ml-6px">
                  {{ item.version }}
                </el-tag>
              </div>
              <el-button size="small" type="primary" @click="handleToolDownload(item)">
                <Icon icon="ep:download" class="mr-5px" /> 下载
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import * as ToolboxToolApi from '@/api/infra/toolboxTool'
import { useUserStore } from '@/store/modules/user'
import { usePermissionStore } from '@/store/modules/permission'
import {
  getHomeModules,
  readHomeModulePaths,
  saveHomeModulePaths,
  type HomeModule
} from '@/utils/homeModules'

defineOptions({ name: 'Index' })

const router = useRouter()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const moduleCatalog = computed(() => getHomeModules(permissionStore.getRouters))
const recentPaths = ref<string[]>([])
const favoritePaths = ref<string[]>([])
const moduleToAdd = ref('')
const availableModules = computed(() =>
  moduleCatalog.value.filter((item) => !favoritePaths.value.includes(item.path))
)
const recentModules = computed(() =>
  recentPaths.value
    .map((path) => moduleCatalog.value.find((item) => item.path === path))
    .filter((item): item is HomeModule => !!item)
)
const favoriteModules = computed(() =>
  favoritePaths.value
    .map((path) => moduleCatalog.value.find((item) => item.path === path))
    .filter((item): item is HomeModule => !!item)
)
function loadModulePreferences() {
  const userId = userStore.getUser.id
  recentPaths.value = readHomeModulePaths('recent', userId)
  favoritePaths.value = readHomeModulePaths('favorite', userId)
}
function isFavorite(path: string) {
  return favoritePaths.value.includes(path)
}
function toggleFavorite(path: string) {
  favoritePaths.value = isFavorite(path)
    ? favoritePaths.value.filter((item) => item !== path)
    : [...favoritePaths.value, path]
  saveHomeModulePaths('favorite', userStore.getUser.id, favoritePaths.value)
}
function addFavorite(path: string) {
  if (path && !isFavorite(path)) toggleFavorite(path)
  moduleToAdd.value = ''
}
function openModule(path: string) {
  router.push(path)
}
onActivated(loadModulePreferences)
onMounted(loadModulePreferences)

// ==================== 系统导航（Accurant Home 门户链接） ====================
interface NavItem {
  name: string
  url: string
  icon: string
  color: string
}

const navLinks: NavItem[] = [
  { name: '邮箱系统', url: 'https://mail.accurantbio.com:44300', icon: 'ep:message', color: '#409EFF' },
  { name: 'SOP查阅平台', url: 'http://192.168.20.100/kod/index.php?user/login', icon: 'ep:reading', color: '#f5222d' },
  { name: '宁波NAS', url: 'http://172.16.100.102/', icon: 'ep:folder', color: '#13c2c2' },
  { name: '上海NAS', url: 'http://192.168.30.105:5000/', icon: 'ep:folder', color: '#2f54eb' },
  { name: '项目管理系统', url: 'http://172.16.200.200:7777/', icon: 'ep:briefcase', color: '#3fb27f' },
  { name: '采样耗材管理', url: 'https://scms.accurantbio.com:54361/#/login', icon: 'ep:box', color: '#1a73e8' },
  { name: '档案管理系统', url: 'http://192.168.20.13:88/qian/', icon: 'ep:files', color: '#faad14' },
  { name: 'IT知识库', url: 'http://192.168.20.100/upload/index.php', icon: 'ep:notebook', color: '#722ed1' },
  { name: '公司官网', url: 'http://www.accurantbio.com/', icon: 'ep:monitor', color: '#36b37e' },
  { name: '匿名信箱', url: 'http://192.168.20.100/upload/open.php', icon: 'ep:chat-dot-round', color: '#fa541c' },
  { name: '样本管理系统', url: 'https://www.accurantbio.top/dist/index.html#/login', icon: 'ep:collection', color: '#ff4d4f' },
  { name: '商务资料库', url: 'http://192.168.20.100/kod2/index.php?user/login', icon: 'ep:folder-opened', color: '#eb2f96' },
  { name: '企学宝', url: 'https://qxb.accurantbio.com:8553/static/admin/#/login?siteId=0001', icon: 'ep:school', color: '#7c3aed' },
  { name: '法大大签名', url: 'https://essz.accurantbio.com:20056/portal/#/login', icon: 'ep:edit-pen', color: '#fa8c16' },
  { name: 'QA系统', url: 'http://192.168.10.166/admin/login/index', icon: 'ep:circle-check', color: '#52c41a' },
  { name: '投诉信箱', url: 'http://192.168.20.100/upload/mail.php', icon: 'ep:warning', color: '#f5222d' },
  { name: 'Lims活跃账号', url: 'http://172.16.200.101:9999/index', icon: 'ep:user', color: '#eb2f96' },
  { name: '钉钉知识库', url: 'https://docs.dingtalk.com/i/desktop/spaces', icon: 'ep:chat-dot-square', color: '#1890ff' },
  { name: '海尔智慧物联', url: 'http://192.168.10.63/login?redirect=%2Flogin', icon: 'ep:connection', color: '#1890ff' },
  { name: '线粒生物样本', url: 'https://biobank.accurantbio.com:54365', icon: 'ep:first-aid-kit', color: '#722ed1' },
  { name: '上海表单填写', url: 'http://192.168.11.89:3838/accurant/', icon: 'ep:edit', color: '#13c2c2' },
  { name: '遗传办备案截图(周更）', url: 'https://alidocs.dingtalk.com/i/spaces/ZRPG2y5ojZ1DKmBp/overview', icon: 'ep:camera', color: '#52c41a' },
  {
    name: '上海研究记录本打印系统',
    url: 'http://192.168.20.64/login/ad?redirect=/index',
    icon: 'ep:printer',
    color: '#1677ff'
  },
  {
    name: '宁波研究记录本打印系统',
    url: 'http://192.168.10.80/login/ad?redirect=/index',
    icon: 'ep:printer',
    color: '#9254de'
  }
]

const handleNavClick = (url: string) => {
  window.open(url, '_blank')
}

// ==================== IT 工具箱 ====================
const toolboxTools = ref<ToolboxToolApi.ToolboxToolVO[]>([])

const isToolIconUrl = (icon: string) => {
  return (
    !!icon && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/'))
  )
}

const getToolboxTools = async () => {
  const data = await ToolboxToolApi.getEnabledToolboxToolList()
  toolboxTools.value = data ?? []
}

const handleToolDownload = async (item: ToolboxToolApi.ToolboxToolVO) => {
  if (item.fileUrl) {
    window.open(item.fileUrl, '_blank')
    // 异步记录下载次数，不阻塞下载
    if (item.id) {
      ToolboxToolApi.recordToolboxToolDownload(item.id).catch(() => {})
    }
  }
}

onMounted(getToolboxTools)
</script>

<style scoped>
.home-section { border: 1px solid var(--el-border-color-lighter); border-radius: 14px; box-shadow: 0 4px 20px rgb(30 55 90 / 4%); }
.home-section > :deep(.el-card__header) { padding: 10px 16px; }
.home-section > :deep(.el-card__body) { padding: 10px 16px 12px; }
.home-empty { padding: 5px 0; color: var(--el-text-color-secondary); font-size: 13px; }
.home-entry { width: 100%; min-height: 40px; padding: 7px 10px; border: 1px solid transparent; border-radius: 10px; background: var(--el-fill-color-light); transition: background .2s, border-color .2s, transform .2s; }
.home-entry:hover { background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-7); transform: translateY(-2px); }
.home-entry button { border: 0; background: transparent; cursor: pointer; }
button.home-section > :deep(.el-card__header) { padding: 10px 16px; }
.home-section > :deep(.el-card__body) { padding: 10px 16px 12px; }
.home-empty { padding: 5px 0; color: var(--el-text-color-secondary); font-size: 13px; }
.home-entry { cursor: pointer; }
.home-tool { border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-fill-color-light); transition: border-color .2s, transform .2s; }
.home-tool:hover { border-color: var(--el-color-primary-light-7); transform: translateY(-2px); }
</style>
