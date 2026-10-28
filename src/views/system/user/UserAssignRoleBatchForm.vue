<template>
  <Dialog v-model="dialogVisible" title="批量修改角色" width="560px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="90px"
    >
      <el-form-item label="选中用户">
        <div class="max-h-96px w-full flex flex-wrap gap-4px overflow-y-auto">
          <el-tag v-for="user in users" :key="user.id" size="small" type="info">
            {{ user.nickname || user.username }}
          </el-tag>
        </div>
      </el-form-item>
      <el-form-item label="操作方式" prop="mode">
        <div class="w-full">
          <el-radio-group v-model="formData.mode">
            <el-radio-button value="add">追加</el-radio-button>
            <el-radio-button value="replace">覆盖</el-radio-button>
            <el-radio-button value="remove">移除</el-radio-button>
          </el-radio-group>
          <div class="mt-6px text-12px text-[var(--el-text-color-secondary)]">
            {{ modeTip }}
          </div>
        </div>
      </el-form-item>
      <el-form-item label="角色" prop="roleIds">
        <el-select
          v-model="formData.roleIds"
          multiple
          filterable
          placeholder="请选择角色"
          class="w-full"
        >
          <el-option v-for="item in roleList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import { FormRules } from 'element-plus'
import * as PermissionApi from '@/api/system/permission'
import * as RoleApi from '@/api/system/role'
import * as UserApi from '@/api/system/user'

defineOptions({ name: 'SystemUserAssignRoleBatchForm' })

const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false) // 表单的加载中：1）打开时的数据加载；2）提交的按钮禁用
const formRef = ref() // 表单 Ref
const users = ref<UserApi.UserVO[]>([]) // 选中的用户
const roleList = ref([] as RoleApi.RoleVO[]) // 角色列表
const formData = ref({
  // 操作方式：add - 追加；replace - 覆盖；remove - 移除
  mode: 'add',
  roleIds: [] as number[]
})

const modeTip = computed(() => {
  switch (formData.value.mode) {
    case 'replace':
      return '覆盖：把所选用户的角色直接替换成下方选择的角色，原有角色会被移除'
    case 'remove':
      return '移除：从所选用户现有的角色中移除下方选择的角色，其他角色保持不变'
    default:
      return '追加：在所选用户现有角色的基础上增加下方选择的角色，不影响已有角色'
  }
})

const formRules = reactive<FormRules>({
  roleIds: [{ required: true, type: 'array', message: '请至少选择一个角色', trigger: 'change' }]
})

/** 打开弹窗 */
const open = async (rows: UserApi.UserVO[]) => {
  dialogVisible.value = true
  users.value = rows
  formData.value.mode = 'add'
  formData.value.roleIds = []
  formLoading.value = true
  try {
    roleList.value = await RoleApi.getSimpleRoleList()
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

const BATCH_CONCURRENCY = 5 // 批量处理时的最大并发数，避免一次性发出过多请求

/** 限制并发地处理每个用户 */
const runWithConcurrency = async (
  items: UserApi.UserVO[],
  handler: (item: UserApi.UserVO) => Promise<void>
) => {
  let cursor = 0
  const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor++
      await handler(item)
    }
  })
  await Promise.all(workers)
}

/** 计算用户在指定操作方式下，最终拥有的角色编号 */
const getTargetRoleIds = async (userId: number) => {
  const { mode, roleIds } = formData.value
  if (mode === 'replace') {
    return roleIds
  }
  const ownedRoleIds = (await PermissionApi.getUserRoleList(userId)) as number[]
  if (mode === 'add') {
    return Array.from(new Set([...ownedRoleIds, ...roleIds]))
  }
  return ownedRoleIds.filter((roleId) => !roleIds.includes(roleId))
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  // 覆盖、移除会改变用户原有的角色，做二次确认
  if (formData.value.mode !== 'add') {
    const action = formData.value.mode === 'replace' ? '覆盖' : '移除'
    try {
      await message.confirm(`确定要对选中的 ${users.value.length} 个用户执行角色${action}吗？`)
    } catch {
      return
    }
  }
  // 批量提交请求
  formLoading.value = true
  let failedCount = 0
  try {
    await runWithConcurrency(users.value, async (user) => {
      try {
        const roleIds = await getTargetRoleIds(user.id)
        await PermissionApi.assignUserRole({ userId: user.id, roleIds })
      } catch {
        failedCount++
      }
    })
  } finally {
    formLoading.value = false
  }
  if (failedCount === 0) {
    message.success(`已成功修改 ${users.value.length} 个用户的角色`)
  } else {
    message.warning(
      `成功 ${users.value.length - failedCount} 个，失败 ${failedCount} 个，请对失败的用户重试`
    )
  }
  dialogVisible.value = false
  // 发送操作成功的事件
  emit('success')
}
</script>
