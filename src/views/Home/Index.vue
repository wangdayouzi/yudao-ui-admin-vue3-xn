<template>
  <div>
    <el-card shadow="never">
      <el-skeleton :loading="loading" animated>
        <el-row :gutter="16" justify="space-between">
          <el-col :xl="12" :lg="12" :md="12" :sm="24" :xs="24">
            <div class="flex items-center">
              <el-avatar :src="avatar" :size="70" class="mr-16px">
                <img src="@/assets/imgs/avatar.gif" alt="" />
              </el-avatar>
              <div>
                <div class="text-20px">
                  {{ t('workplace.welcome') }} {{ username }} {{ t('workplace.happyDay') }}
                </div>
                <div class="mt-10px text-14px text-gray-500">
                  {{ t('workplace.toady') }}，20℃ - 32℃！
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xl="12" :lg="12" :md="12" :sm="24" :xs="24">
            <div class="h-70px flex items-center justify-end lt-sm:mt-10px">
              <div class="px-8px text-right">
                <div class="mb-16px text-14px text-gray-400">{{ t('workplace.project') }}</div>
                <CountTo
                  class="text-20px"
                  :start-val="0"
                  :end-val="totalSate.project"
                  :duration="2600"
                />
              </div>
              <el-divider direction="vertical" />
              <div class="px-8px text-right">
                <div class="mb-16px text-14px text-gray-400">{{ t('workplace.toDo') }}</div>
                <CountTo
                  class="text-20px"
                  :start-val="0"
                  :end-val="totalSate.todo"
                  :duration="2600"
                />
              </div>
              <el-divider direction="vertical" border-style="dashed" />
              <div class="px-8px text-right">
                <div class="mb-16px text-14px text-gray-400">{{ t('workplace.access') }}</div>
                <CountTo
                  class="text-20px"
                  :start-val="0"
                  :end-val="totalSate.access"
                  :duration="2600"
                />
              </div>
            </div>
          </el-col>
        </el-row>
      </el-skeleton>
    </el-card>
  </div>

  <el-row class="mt-8px" :gutter="8" justify="space-between">
    <el-col :xl="16" :lg="16" :md="24" :sm="24" :xs="24" class="mb-8px">
      <el-card shadow="never">
        <template #header>
          <div class="h-3 flex justify-between">
            <span>系统导航</span>
          </div>
        </template>
        <el-skeleton :loading="loading" animated>
          <el-row :gutter="8" class="gap-y-8px">
            <el-col
              v-for="(item, index) in navLinks"
              :key="`nav-${index}`"
              :xl="6"
              :lg="6"
              :md="8"
              :sm="12"
              :xs="12"
              class="!flex"
            >
              <el-card
                shadow="hover"
                class="flex-1 cursor-pointer"
                body-class="!p-14px"
                @click="handleNavClick(item.url)"
              >
                <div class="flex items-center">
                  <Icon
                    :icon="item.icon"
                    :size="22"
                    class="mr-8px flex-none"
                    :style="{ color: item.color }"
                  />
                  <span class="min-w-0 flex-1 truncate text-14px" :title="item.name">{{
                    item.name
                  }}</span>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-skeleton>
      </el-card>
    </el-col>
    <el-col :xl="8" :lg="8" :md="24" :sm="24" :xs="24" class="mb-8px">
      <el-card shadow="never">
        <template #header>
          <div class="h-3 flex justify-between">
            <span>{{ t('workplace.notice') }}</span>
            <el-link type="primary" :underline="false" @click="goNoticePage">{{
              t('action.more')
            }}</el-link>
          </div>
        </template>
        <el-skeleton :loading="loading" animated>
          <div v-for="(item, index) in notice" :key="`dynamics-${index}`">
            <div class="flex items-center">
              <el-avatar :src="avatar" :size="35" class="mr-16px">
                <img src="@/assets/imgs/avatar.gif" alt="" />
              </el-avatar>
              <div class="min-w-0 flex-1">
                <div class="text-14px">
                  <el-tag size="small" class="mr-6px">{{ typeLabel(item.type) }}</el-tag>
                  <span class="align-middle">{{ item.title }}</span>
                </div>
                <div class="mt-16px text-12px text-gray-400">
                  {{ formatTime(item.createTime, 'yyyy-MM-dd') }}
                </div>
              </div>
            </div>
            <el-divider />
          </div>
        </el-skeleton>
      </el-card>
    </el-col>
  </el-row>

  <!-- ==================== IT 工具箱 ==================== -->
  <el-card v-if="toolboxTools.length > 0" shadow="never" class="mt-8px">
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
        <el-card shadow="hover" class="flex-1" body-class="!p-12px">
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
            <span class="min-w-0 flex-1 truncate text-13px" :title="item.name">{{ item.name }}</span>
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
</template>
<script lang="ts" setup>
import { formatTime } from '@/utils'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { useRouter } from 'vue-router'

import * as NoticeApi from '@/api/system/notice'
import * as ToolboxToolApi from '@/api/infra/toolboxTool'
import { useUserStore } from '@/store/modules/user'
import type { WorkplaceTotal } from './types'

defineOptions({ name: 'Index' })

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const avatar = userStore.getUser.avatar
const username = userStore.getUser.nickname
// 获取统计数
let totalSate = reactive<WorkplaceTotal>({
  project: 0,
  access: 0,
  todo: 0
})

const getCount = async () => {
  const data = {
    project: 40,
    access: 2340,
    todo: 10
  }
  totalSate = Object.assign(totalSate, data)
}

// ==================== 系统导航（Accurant Home 门户链接） ====================
interface NavItem {
  name: string
  url: string
  icon: string
  color: string
}

const navLinks: NavItem[] = [
  { name: '邮箱系统', url: 'https://mail.accurantbio.com:44300', icon: 'ep:message', color: '#409EFF' },
  { name: '公司官网', url: 'http://www.accurantbio.com/', icon: 'ep:monitor', color: '#36b37e' },
  { name: '钉钉知识库', url: 'https://docs.dingtalk.com/i/desktop/spaces', icon: 'ep:chat-dot-square', color: '#1890ff' },
  { name: '企学宝', url: 'https://qxb.accurantbio.com:8553/static/admin/#/login?siteId=0001', icon: 'ep:school', color: '#7c3aed' },
  { name: '法大大签名', url: 'https://essz.accurantbio.com:20056/portal/#/login', icon: 'ep:edit-pen', color: '#fa8c16' },
  { name: '项目管理系统', url: 'http://172.16.200.200:7777/', icon: 'ep:briefcase', color: '#3fb27f' },
  { name: '样本管理系统', url: 'https://www.accurantbio.top/dist/index.html#/login', icon: 'ep:collection', color: '#ff4d4f' },
  { name: '采样耗材管理', url: 'https://scms.accurantbio.com:54361/#/login', icon: 'ep:box', color: '#1a73e8' },
  { name: 'SOP查阅平台', url: 'http://192.168.20.100/kod/index.php?user/login', icon: 'ep:reading', color: '#f5222d' },
  { name: '商务资料库', url: 'http://192.168.20.100/kod2/index.php?user/login', icon: 'ep:folder-opened', color: '#eb2f96' },
  { name: 'IT知识库', url: 'http://192.168.20.100/upload/index.php', icon: 'ep:notebook', color: '#722ed1' },
  { name: '宁波NAS', url: 'http://172.16.100.102/', icon: 'ep:folder', color: '#13c2c2' },
  { name: '上海NAS', url: 'http://192.168.30.102:5000/', icon: 'ep:folder', color: '#2f54eb' },
  { name: '档案管理系统', url: 'http://192.168.20.13:88/qian/', icon: 'ep:files', color: '#faad14' },
  { name: 'QA系统', url: 'http://192.168.10.166/admin/login/index', icon: 'ep:circle-check', color: '#52c41a' },
  { name: 'Lims活跃账号', url: 'http://172.16.200.101:9999/index', icon: 'ep:user', color: '#eb2f96' },
  { name: '海尔智慧物联', url: 'http://192.168.10.63/login?redirect=%2Flogin', icon: 'ep:connection', color: '#1890ff' },
  { name: '线粒生物样本', url: 'https://biobank.accurantbio.com:54365', icon: 'ep:first-aid-kit', color: '#722ed1' },
  { name: '上海表单填写', url: 'http://192.168.11.89:3838/accurant/', icon: 'ep:edit', color: '#13c2c2' },
  { name: '匿名信箱', url: 'http://192.168.20.100/upload/open.php', icon: 'ep:chat-dot-round', color: '#fa541c' },
  { name: '投诉信箱', url: 'http://192.168.20.100/upload/mail.php', icon: 'ep:warning', color: '#f5222d' },
  { name: '遗传办备案截图', url: 'https://alidocs.dingtalk.com/i/spaces/ZRPG2y5ojZ1DKmBp/overview', icon: 'ep:camera', color: '#52c41a' }
]

const handleNavClick = (url: string) => {
  window.open(url, '_blank')
}

// ==================== 通知公告（真实数据） ====================
let notice = reactive<NoticeApi.NoticeVO[]>([])
const typeLabel = (type: number) => {
  const item = getIntDictOptions(DICT_TYPE.SYSTEM_NOTICE_TYPE).find((d) => d.value === type)
  return item?.label ?? String(type ?? '')
}

const getNotice = async () => {
  const data = await NoticeApi.getNoticePage({
    pageNo: 1,
    pageSize: 5,
    status: 0
  } as PageParam & { status: number })
  notice = Object.assign(notice, data.list ?? [])
}

const goNoticePage = () => {
  router.push('/system/notice')
}

// ==================== IT 工具箱 ====================
const toolboxTools = ref<ToolboxToolApi.ToolboxToolVO[]>([])

const isToolIconUrl = (icon: string) => {
  return !!icon && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/'))
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

const getAllApi = async () => {
  await Promise.all([getCount(), getNotice(), getToolboxTools()])
  loading.value = false
}

getAllApi()
</script>
