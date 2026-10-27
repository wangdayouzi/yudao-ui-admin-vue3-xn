<template>
  <!-- 文件夹信息与快捷操作 -->
  <div
    class="mb-8px flex items-center justify-between gap-24px border-b border-[var(--el-border-color-lighter)] pb-24px pt-8px max-[900px]:flex-col max-[900px]:items-start"
  >
    <div>
      <div class="flex items-center gap-8px text-24px font-600">
        <Icon icon="ep:folder" />{{ folder.title }}
      </div>
      <div class="mt-8px text-13px text-[var(--el-text-color-secondary)]">
        创建于 {{ formatDate(folder.createTime) }} · 子文件夹 {{ folder.childFolderCount ?? 0 }} 个
        · 文档 {{ folder.documentCount ?? 0 }} 篇
      </div>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-8px">
      <template
        v-if="
          canEditKnowledgeContent(folder.currentUserLevel) && checkPermi(['pms:kb:library:update'])
        "
      >
        <el-button
          class="!ml-0"
          size="small"
          type="primary"
          @click="emit('create', 'create-document')"
          ><Icon icon="ep:document-add" class="mr-4px" />新建文档</el-button
        >
        <el-button class="!ml-0" size="small" @click="emit('create', 'upload')">上传文件</el-button>
        <el-button class="!ml-0" size="small" @click="emit('create', 'create-folder')"
          >新建子文件夹</el-button
        >
      </template>
      <el-button
        v-if="canManage"
        v-hasPermi="['pms:kb:library:update']"
        class="!ml-0"
        size="small"
        @click="emit('permission')"
      >
        <Icon icon="ep:user" />协作
      </el-button>
      <el-button class="!ml-0" size="small" @click="emit('collect')">
        <Icon :icon="folder.favoriteStatus ? 'ep:star-filled' : 'ep:star'" />
        {{ folder.favoriteStatus ? '已关注' : '关注' }}
      </el-button>
      <el-dropdown
        v-if="canEditKnowledgeContent(folder.currentUserLevel)"
        @command="handleMoreCommand"
      >
        <el-button class="!ml-0" size="small"><Icon icon="ep:more-filled" /></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="checkPermi(['pms:kb:library:update'])" command="update">
              文件夹设置
            </el-dropdown-item>
            <el-dropdown-item
              v-if="canManage && checkPermi(['pms:kb:library:update'])"
              command="move"
            >
              移动
            </el-dropdown-item>
            <el-dropdown-item
              v-if="
                canDeleteKnowledgeContent(folder.currentUserLevel) &&
                checkPermi(['pms:kb:library:delete'])
              "
              command="delete"
              divided
            >
              删除
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>

  <!-- 文件夹直属内容 -->
  <div class="mb-8px text-16px font-600">文件夹内容</div>
  <el-table
    v-if="children.length"
    :data="children"
    :show-header="false"
    class="knowledge-content-table"
    @row-click="emit('node-click', $event)"
  >
    <el-table-column min-width="240">
      <template #default="scope">
        <div class="flex cursor-pointer items-center gap-8px">
          <Icon :icon="getKnowledgeTreeNodeIcon(scope.row)" />
          <span>{{ scope.row.label }}</span>
        </div>
      </template>
    </el-table-column>
    <el-table-column align="right" width="100">
      <template #default="scope">
        <span class="text-12px text-[var(--el-text-color-secondary)]">
          {{ getKnowledgeTreeNodeTypeName(scope.row) }}
        </span>
      </template>
    </el-table-column>
  </el-table>
  <el-empty v-else description="该文件夹暂无内容" />
</template>

<script lang="ts" setup>
import * as KnowledgeFolderApi from '@/api/pms/kb/content/folder'
import { PmsKnowledgeContentLevel } from '@/views/pms/kb/utils/constants'
import { canDeleteKnowledgeContent, canEditKnowledgeContent } from '@/views/pms/kb/utils/permission'
import { formatDate } from '@/utils/formatTime'
import { checkPermi } from '@/utils/permission'
import {
  getKnowledgeTreeNodeIcon,
  getKnowledgeTreeNodeTypeName,
  type KnowledgeTreeNode
} from './types'

defineOptions({ name: 'PmsKnowledgeFolderDetail' })

const props = defineProps<{
  folder: KnowledgeFolderApi.PmsKnowledgeFolderVO
  children: KnowledgeTreeNode[]
}>() // 组件参数
const emit = defineEmits([
  'collect',
  'permission',
  'update',
  'move',
  'delete',
  'node-click',
  'create'
]) // 组件事件
const message = useMessage() // 消息弹窗

const canManage = computed(() => props.folder.currentUserLevel === PmsKnowledgeContentLevel.MANAGE) // 是否可管理文件夹协作权限

/** 处理更多操作 */
async function handleMoreCommand(command: string) {
  if (command === 'delete') {
    await handleDelete()
    return
  }
  if (command === 'update' || command === 'move') emit(command)
}

/** 删除文件夹 */
async function handleDelete() {
  try {
    // 删除的二次确认
    await message.delConfirm(`确认删除文件夹“${props.folder.title}”及其全部内容吗？`)
    // 发起删除
    await KnowledgeFolderApi.deleteKnowledgeFolder(props.folder.id)
    message.success('删除成功')
    // 通知父组件刷新目录树
    emit('delete')
  } catch {}
}
</script>

<style lang="scss" scoped>
:deep(.knowledge-content-table .el-table__row) {
  height: 48px;
  font-size: 14px;
  cursor: pointer;
}
</style>
