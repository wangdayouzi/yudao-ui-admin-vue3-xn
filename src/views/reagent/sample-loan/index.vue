<template>
  <div class="sample-loan-container">
    <ContentWrap>
      <el-form :inline="true" :model="queryParams" @submit.prevent>
        <el-form-item label="BAS号">
          <el-input
            v-model="queryParams.basNo"
            placeholder="请输入 BAS 号"
            clearable
            class="!w-200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="需求人">
          <el-select
            v-model="queryParams.requesterId"
            filterable
            remote
            clearable
            reserve-keyword
            placeholder="输入姓名搜索"
            :remote-method="searchUsers"
            :loading="userLoading"
            class="!w-180px"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="getUserOptionLabel(user)"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="!w-130px">
            <el-option label="可领用" :value="STATUS_BORROWING" />
            <el-option label="已归还" :value="STATUS_RETURNED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-hasPermi="['reagent:sample-loan:query']" type="primary" @click="handleQuery"
            ><Icon icon="ep:search" />搜索</el-button
          >
          <el-button @click="resetQuery"><Icon icon="ep:refresh" />重置</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap>
      <div class="mb-12px flex justify-between">
        <el-button
          v-hasPermi="['reagent:sample-loan:create']"
          type="primary"
          @click="openCreateDialog"
          ><Icon icon="ep:plus" />新增领用</el-button
        >
        <el-button @click="openScreen"><Icon icon="ep:full-screen" />打开大屏</el-button>
      </div>
      <el-table v-loading="loading" :data="list">
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="BAS号" prop="basNo" min-width="160" show-overflow-tooltip />
        <el-table-column label="需求人" prop="requester" min-width="130" show-overflow-tooltip />
        <el-table-column label="提单人" prop="submitter" min-width="130" show-overflow-tooltip />
        <el-table-column label="样品信息" prop="sampleInfo" min-width="180" show-overflow-tooltip
          ><template #default="{ row }">{{ row.sampleInfo || '-' }}</template></el-table-column
        >
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip
          ><template #default="{ row }">{{ row.remark || '-' }}</template></el-table-column
        >
        <el-table-column label="状态" width="110"
          ><template #default="{ row }"
            ><el-tag :type="row.status === STATUS_BORROWING ? 'primary' : 'info'">{{
              row.status === STATUS_BORROWING ? '可领用' : '已归还'
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="登记时间" width="170"
          ><template #default="{ row }">{{ formatDate(row.createTime) }}</template></el-table-column
        >
        <el-table-column label="归还时间" width="170"
          ><template #default="{ row }">{{
            row.returnTime ? formatDate(row.returnTime) : '-'
          }}</template></el-table-column
        >
        <el-table-column label="操作" fixed="right" width="110">
          <template #default="{ row }">
            <el-button
              v-if="row.status === STATUS_BORROWING"
              v-hasPermi="['reagent:sample-loan:return']"
              link
              type="primary"
              @click="handleReturn(row)"
              >归还</el-button
            >
            <span v-else class="text-gray-400">已归还</span>
          </template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:limit="queryParams.pageSize"
        v-model:page="queryParams.pageNo"
        :total="total"
        @pagination="getList"
      />
    </ContentWrap>

    <el-dialog v-model="createDialogVisible" title="新增样品领用" width="520px" destroy-on-close>
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="92px"
        @submit.prevent
      >
        <el-form-item label="BAS号" prop="basNo"
          ><el-input v-model="createForm.basNo" placeholder="请输入 BAS 号" maxlength="64"
        /></el-form-item>
        <el-form-item label="需求人" prop="requesterId"
          ><el-select
            v-model="createForm.requesterId"
            filterable
            remote
            clearable
            reserve-keyword
            placeholder="输入姓名搜索"
            :remote-method="searchUsers"
            :loading="userLoading"
            class="!w-full"
            @change="handleRequesterChange"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="getUserOptionLabel(user)"
              :value="user.id"
            /> </el-select
        ></el-form-item>
        <el-form-item label="提单人"
          ><el-input v-model="createForm.submitter" readonly
        /></el-form-item>
        <el-form-item label="样品信息"
          ><el-input
            v-model="createForm.sampleInfo"
            type="textarea"
            :rows="3"
            placeholder="选填"
            maxlength="500"
        /></el-form-item>
        <el-form-item label="备注"
          ><el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="2"
            placeholder="选填"
            maxlength="500"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="createDialogVisible = false">取消</el-button
        ><el-button type="primary" :loading="submitLoading" @click="submitCreateForm"
          >确认登记</el-button
        ></template
      >
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent'
import * as UserApi from '@/api/system/user'
import { formatDate } from '@/utils/formatTime'
import router from '@/router'
import { useUserStoreWithOut } from '@/store/modules/user'

defineOptions({ name: 'ReagentSampleLoan' })

const message = useMessage()
const STATUS_BORROWING = 1
const STATUS_RETURNED = 2
const loading = ref(false)
const total = ref(0)
const list = ref<ReagentApi.SampleLoanVO[]>([])
const userLoading = ref(false)
const userOptions = ref<UserApi.UserVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  basNo: '',
  requesterId: undefined as number | undefined,
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await ReagentApi.getSampleLoanPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}
const resetQuery = () => {
  queryParams.basNo = ''
  queryParams.requesterId = undefined
  queryParams.status = undefined
  handleQuery()
}

const createDialogVisible = ref(false)
const submitLoading = ref(false)
const createFormRef = ref()
const createForm = reactive({
  basNo: '',
  requesterId: undefined as number | undefined,
  requester: '',
  submitterId: undefined as number | undefined,
  submitter: '',
  sampleInfo: '',
  remark: ''
})
const createRules = {
  basNo: [{ required: true, message: '请输入 BAS 号', trigger: 'blur' }],
  requesterId: [{ required: true, message: '请选择需求人', trigger: 'change' }]
}
const getUserDisplayName = (user?: { nickname?: string; username?: string }) =>
  user?.nickname || user?.username || ''
const getUserOptionLabel = (user: UserApi.UserVO) => {
  const displayName = getUserDisplayName(user)
  return user.username && user.username !== displayName
    ? `${displayName}（${user.username}）`
    : displayName
}
const searchUsers = async (keyword: string) => {
  const value = keyword.trim()
  userLoading.value = true
  try {
    const baseParams = { pageNo: 1, pageSize: 20, status: 0 }
    const [byUsername, byNickname] = await Promise.all([
      UserApi.getUserPage({ ...baseParams, username: value || undefined }),
      UserApi.getUserPage({ ...baseParams, nickname: value || undefined })
    ])
    const userMap = new Map<number, UserApi.UserVO>()
    const users = [...byUsername.list, ...byNickname.list]
    users.forEach((user) => userMap.set(user.id, user))
    userOptions.value = Array.from(userMap.values())
  } finally {
    userLoading.value = false
  }
}
const handleRequesterChange = (requesterId?: number) => {
  createForm.requester = getUserDisplayName(
    userOptions.value.find((user) => user.id === requesterId)
  )
}
const openCreateDialog = () => {
  const currentUser = useUserStoreWithOut().getUser
  Object.assign(createForm, {
    basNo: '',
    requesterId: undefined,
    requester: '',
    submitterId: currentUser?.id,
    submitter: getUserDisplayName(currentUser),
    sampleInfo: '',
    remark: ''
  })
  createDialogVisible.value = true
}
const submitCreateForm = async () => {
  await createFormRef.value.validate()
  submitLoading.value = true
  try {
    await ReagentApi.createSampleLoan({
      basNo: createForm.basNo.trim(),
      requesterId: createForm.requesterId,
      requester: createForm.requester,
      submitterId: createForm.submitterId,
      submitter: createForm.submitter,
      sampleInfo: createForm.sampleInfo.trim() || undefined,
      remark: createForm.remark.trim() || undefined
    })
    message.success('领用登记成功')
    createDialogVisible.value = false
    getList()
  } finally {
    submitLoading.value = false
  }
}
const handleReturn = async (row: ReagentApi.SampleLoanVO) => {
  try {
    await message.confirm(`确认 BAS 号“${row.basNo}”已归还？`)
  } catch {
    return
  }
  await ReagentApi.returnSampleLoan(row.id)
  message.success('已登记归还')
  getList()
}
const openScreen = () =>
  window.open(router.resolve({ path: '/reagent/sample-loan-screen' }).href, '_blank', 'noopener')
getList()
searchUsers('')
</script>
