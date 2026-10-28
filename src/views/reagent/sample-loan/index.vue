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
        <el-form-item label="站点">
          <el-select v-model="queryParams.site" placeholder="全部站点" clearable class="!w-130px" @change="onQuerySiteChange">
            <el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="queryParams.location" placeholder="全部楼层" clearable class="!w-130px">
            <el-option v-for="location in queryLocationOptions" :key="location.value" :label="location.label" :value="location.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="!w-130px">
            <el-option label="可领用" :value="STATUS_BORROWING" />
            <el-option label="已归还" :value="STATUS_RETURNED" />
            <el-option label="无需归还" :value="STATUS_NO_RETURN" />
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
        <el-button @click="openScreen"><Icon icon="ep:full-screen" />打开宁波大屏</el-button>
      </div>
      <el-table v-loading="loading" :data="list">
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="BAS号" prop="basNo" min-width="160" show-overflow-tooltip />
        <el-table-column label="领用类型" width="110">
          <template #default="{ row }">{{ getMaterialTypeLabel(row.materialType) }}</template>
        </el-table-column>
        <el-table-column label="站点" width="90">
          <template #default="{ row }">{{ getSiteLabel(row.site) }}</template>
        </el-table-column>
        <el-table-column label="楼层" width="90" prop="location" />
        <el-table-column label="需求人" prop="requester" min-width="130" show-overflow-tooltip />
        <el-table-column label="提单人" prop="submitter" min-width="130" show-overflow-tooltip />
        <el-table-column label="物料信息" prop="sampleInfo" min-width="180" show-overflow-tooltip
          ><template #default="{ row }">{{ row.sampleInfo || '-' }}</template></el-table-column
        >
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip
          ><template #default="{ row }">{{ row.remark || '-' }}</template></el-table-column
        >
        <el-table-column label="状态" width="110"
          ><template #default="{ row }"
            ><el-tag
              :type="
                row.status === STATUS_BORROWING
                  ? 'primary'
                  : row.status === STATUS_NO_RETURN
                    ? 'warning'
                    : 'info'
              "
              >{{
                row.status === STATUS_BORROWING
                  ? '可领用'
                  : row.status === STATUS_NO_RETURN
                    ? '无需归还'
                    : '已归还'
              }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="领用时间" width="170"
          ><template #default="{ row }">{{ formatDate(row.createTime) }}</template></el-table-column
        >
        <el-table-column label="归还时间" width="170"
          ><template #default="{ row }">{{
            row.returnTime ? formatDate(row.returnTime) : '-'
          }}</template></el-table-column
        >
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button
              v-hasPermi="['reagent:sample-loan:update']"
              link
              type="primary"
              @click="openEditDialog(row)"
              >修改</el-button
            >
            <el-button
              v-hasPermi="['reagent:sample-loan:delete']"
              link
              type="danger"
              @click="handleDelete(row)"
              >删除</el-button
            >
            <el-button
              v-if="row.status === STATUS_BORROWING"
              v-hasPermi="['reagent:sample-loan:return']"
              link
              type="primary"
              @click="handleReturn(row)"
              >归还</el-button
            >
            <el-button
              v-if="row.status === STATUS_BORROWING"
              v-hasPermi="['reagent:sample-loan:no-return', 'reagent:sample-loan:return']"
              link
              type="warning"
              @click="handleNoReturn(row)"
              >无需归还</el-button
            >
            <span v-if="row.status === STATUS_RETURNED" class="text-gray-400">已归还</span>
            <span v-else-if="row.status === STATUS_NO_RETURN" class="text-gray-400">无需归还</span>
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

    <el-dialog v-model="createDialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
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
        <el-form-item label="领用类型" prop="materialType">
          <el-radio-group v-model="createForm.materialType">
            <el-radio-button value="SAMPLE">样品</el-radio-button>
            <el-radio-button value="REAGENT">试剂</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="站点" prop="site">
          <el-radio-group v-model="createForm.site" @change="onFormSiteChange">
            <el-radio-button v-for="site in siteOptions" :key="site.value" :value="site.value">{{ site.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="楼层" prop="location">
          <el-radio-group v-model="createForm.location">
            <el-radio-button v-for="location in formLocationOptions" :key="location.value" :value="location.value">{{ location.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
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
        <el-form-item label="物料信息"
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
          >{{ editingId ? '确认修改' : '确认登记' }}</el-button
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
const STATUS_NO_RETURN = 3
const loading = ref(false)
const total = ref(0)
const list = ref<ReagentApi.SampleLoanVO[]>([])
const userLoading = ref(false)
type RequesterOption = {
  id: number
  nickname: string
  username?: string
  status?: number
}
const userOptions = ref<RequesterOption[]>([])
const allUserOptions = ref<RequesterOption[]>([])
const siteOptions = ref<ReagentApi.SampleLoanOption[]>([])
const locationsBySite = ref<Record<string, ReagentApi.SampleLoanOption[]>>({})
const loadLocations = async (site: string) => {
  if (!site || locationsBySite.value[site]) return
  locationsBySite.value = { ...locationsBySite.value, [site]: await ReagentApi.getSampleLoanLocations(site) }
}
const queryLocationOptions = computed(() => {
  if (queryParams.site) return locationsBySite.value[queryParams.site] || []
  return [...new Map(Object.values(locationsBySite.value).flat().map((item) => [item.value, item])).values()]
})
const formLocationOptions = computed(() => createForm.site ? locationsBySite.value[createForm.site] || [] : [])
const onQuerySiteChange = async (site?: string) => {
  queryParams.location = undefined
  if (site) await loadLocations(site)
}
const onFormSiteChange = async (site: string) => {
  createForm.location = undefined
  await loadLocations(site)
}
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  basNo: '',
  site: undefined as string | undefined,
  location: undefined as string | undefined,
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
  queryParams.site = undefined
  queryParams.location = undefined
  queryParams.requesterId = undefined
  queryParams.status = undefined
  handleQuery()
}

const createDialogVisible = ref(false)
const submitLoading = ref(false)
const createFormRef = ref()
const editingId = ref<number>()
const dialogTitle = computed(() => (editingId.value ? '修改领用' : '新增领用'))
const createForm = reactive({
  basNo: '',
  materialType: undefined as 'SAMPLE' | 'REAGENT' | undefined,
  site: undefined as string | undefined,
  location: undefined as string | undefined,
  requesterId: undefined as number | undefined,
  requester: '',
  submitterId: undefined as number | undefined,
  submitter: '',
  sampleInfo: '',
  remark: ''
})
const createRules = {
  basNo: [{ required: true, message: '请输入 BAS 号', trigger: 'blur' }],
  materialType: [{ required: true, message: '请选择领用类型', trigger: 'change' }],
  site: [{ required: true, message: '请选择站点', trigger: 'change' }],
  location: [{ required: true, message: '请选择地点', trigger: 'change' }],
  requesterId: [{ required: true, message: '请选择需求人', trigger: 'change' }]
}
const getMaterialTypeLabel = (materialType?: ReagentApi.SampleLoanVO['materialType']) =>
  materialType === 'REAGENT' ? '试剂' : materialType === 'SAMPLE' ? '样品' : '-'
const getSiteLabel = (site?: ReagentApi.SampleLoanVO['site']) =>
  siteOptions.value.find((item) => item.value === (site || 'NINGBO'))?.label || site || '宁波'
const getUserDisplayName = (user?: { nickname?: string; username?: string }) =>
  user?.nickname || user?.username || ''
const getUserOptionLabel = (user: RequesterOption) => {
  const displayName = getUserDisplayName(user)
  const name = user.username && user.username !== displayName
    ? `${displayName}（${user.username}）`
    : displayName
  return user.status === 1 ? `${name}（已禁用）` : name
}
const searchUsers = async (keyword: string) => {
  const value = keyword.trim()
  userLoading.value = true
  try {
    if (!allUserOptions.value.length) {
      allUserOptions.value = await UserApi.getSimpleUserList(true)
    }
    const searchValue = value.toLowerCase()
    userOptions.value = allUserOptions.value
      .filter((user) => {
        if (!searchValue) return true
        return [user.nickname, user.username].some((text) =>
          text?.toLowerCase().includes(searchValue)
        )
      })
      .slice(0, 100)
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
  editingId.value = undefined
  Object.assign(createForm, {
    basNo: '',
    materialType: undefined,
    site: undefined,
    location: undefined,
    requesterId: undefined,
    requester: '',
    submitterId: currentUser?.id,
    submitter: getUserDisplayName(currentUser),
    sampleInfo: '',
    remark: ''
  })
  createDialogVisible.value = true
}
const openEditDialog = (row: ReagentApi.SampleLoanVO) => {
  void loadLocations(row.site || 'NINGBO')
  editingId.value = row.id
  if (row.requesterId && !userOptions.value.some((user) => user.id === row.requesterId)) {
    userOptions.value.push({ id: row.requesterId, nickname: row.requester })
  }
  Object.assign(createForm, {
    basNo: row.basNo,
    materialType: row.materialType,
    site: row.site || 'NINGBO',
    location: row.location,
    requesterId: row.requesterId,
    requester: row.requester,
    submitterId: row.submitterId,
    submitter: row.submitter || '',
    sampleInfo: row.sampleInfo || '',
    remark: row.remark || ''
  })
  createDialogVisible.value = true
}
const submitCreateForm = async () => {
  await createFormRef.value.validate()
  submitLoading.value = true
  try {
    const payload = {
      basNo: createForm.basNo.trim(),
      materialType: createForm.materialType!,
      site: createForm.site!,
      location: createForm.location!,
      requesterId: createForm.requesterId,
      requester: createForm.requester,
      submitterId: createForm.submitterId,
      submitter: createForm.submitter,
      sampleInfo: createForm.sampleInfo.trim() || undefined,
      remark: createForm.remark.trim() || undefined
    }
    // 重复检查仅用于提醒；检查接口异常时也不能影响正常登记。
    let duplicate = false
    try {
      duplicate = await ReagentApi.checkSampleLoanDuplicate({
        basNo: payload.basNo,
        site: payload.site,
        location: payload.location,
        requesterId: payload.requesterId!,
        excludeId: editingId.value
      })
    } catch {
      duplicate = false
    }
    if (duplicate) {
      try {
        await message.confirm('相同 BAS 号、站点、楼层和需求人已有未结束记录，是否仍要继续登记？')
      } catch {
        return
      }
    }
    if (editingId.value) {
      await ReagentApi.updateSampleLoan({ id: editingId.value, ...payload })
      message.success('领用记录已修改')
    } else {
      await ReagentApi.createSampleLoan(payload)
      message.success('领用登记成功')
    }
    createDialogVisible.value = false
    getList()
  } finally {
    submitLoading.value = false
  }
}
const handleDelete = async (row: ReagentApi.SampleLoanVO) => {
  try {
    await message.confirm(`确认删除 BAS 号“${row.basNo}”的领用记录？`)
  } catch {
    return
  }
  await ReagentApi.deleteSampleLoan(row.id)
  message.success('领用记录已删除')
  getList()
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
const handleNoReturn = async (row: ReagentApi.SampleLoanVO) => {
  try {
    await message.confirm(`确认 BAS 号“${row.basNo}”无需归还？确认后将不再显示在大屏。`)
  } catch {
    return
  }
  await ReagentApi.noReturnSampleLoan(row.id)
  message.success('已登记为无需归还')
  getList()
}
const openScreen = () =>
  window.open(
    router.resolve({
      path: '/reagent/sample-loan-screen',
      query: {
        location:
          queryParams.site === 'NINGBO' && queryParams.location
            ? queryParams.location
            : locationsBySite.value.NINGBO?.[0]?.value || '4楼'
      }
    }).href,
    '_blank',
    'noopener'
  )
const loadOptions = async () => {
  siteOptions.value = await ReagentApi.getSampleLoanSites()
  await Promise.all(siteOptions.value.map((site) => loadLocations(site.value)))
}
void loadOptions().catch(() => message.error('地点配置加载失败，请刷新页面'))
getList()
searchUsers('')
</script>
