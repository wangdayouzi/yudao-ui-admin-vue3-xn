<template>
  <div class="reagent-base-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form ref="queryFormRef" :inline="true" :model="queryParams">
        <el-form-item label="试剂编号" prop="basId">
          <el-input v-model="queryParams.basId" placeholder="请输入试剂编号" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="试剂名称" prop="reagentName">
          <el-input v-model="queryParams.reagentName" placeholder="请输入试剂名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="货号" prop="catNo">
          <el-input v-model="queryParams.catNo" placeholder="请输入货号" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-150px">
            <el-option label="正常" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <Icon icon="ep:search" />搜索
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" />重置
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- ============ 表格 + 操作 ============ -->
    <ContentWrap>
      <el-button v-hasPermi="['reagent:base:create']" type="primary" @click="openBaseForm('create')">
        <Icon icon="ep:plus" />新增试剂
      </el-button>

      <el-table v-loading="loading" :data="list" style="margin-top: 12px" @row-click="onRowClick" highlight-current-row>
        <el-table-column label="编号" prop="id" width="70" />
        <el-table-column label="试剂编号" prop="basId" width="140" />
        <el-table-column label="试剂名称" prop="reagentName" min-width="180" show-overflow-tooltip />
        <el-table-column label="供应商" prop="vendor" width="140" />
        <el-table-column label="货号" prop="catNo" width="140" />
        <el-table-column label="储存温度" prop="storageTemp" width="100" />
        <el-table-column label="储存位置" prop="storageLocation" width="140" />
        <el-table-column label="状态" prop="status" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'">
              {{ scope.row.status === 0 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :formatter="dateFormatter" align="center" label="创建时间" prop="createTime" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button v-hasPermi="['reagent:base:update']" link type="primary" @click.stop="openBaseForm('update', scope.row.id)">
              修改
            </el-button>
            <el-button v-hasPermi="['reagent:base:delete']" link type="danger" @click.stop="handleDelete(scope.row.id)">
              删除
            </el-button>
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

    <!-- ============ 批号子表 ============ -->
    <ContentWrap v-if="currentBase">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <span style="font-weight: bold; font-size: 15px">
          批号列表 — {{ currentBase.basId }} / {{ currentBase.reagentName }}
        </span>
        <el-button type="primary" size="small" @click="openLotForm('create')">
          <Icon icon="ep:plus" />新增批号
        </el-button>
      </div>

      <el-table v-loading="lotLoading" :data="lotList" size="small">
        <el-table-column label="批号" prop="lotNo" width="160" />
        <el-table-column label="规格/浓度" prop="content" width="120" />
        <el-table-column :formatter="dateFormatter" align="center" label="过期日期" prop="expirationDate" width="160" />
        <el-table-column label="参考剩余量" prop="amountLeft" width="120" />
        <el-table-column label="状态" prop="status" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'" size="small">
              {{ scope.row.status === 0 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button v-hasPermi="['reagent:base:update']" link type="primary" @click="openLotForm('update', scope.row.id)">
              修改
            </el-button>
            <el-button v-hasPermi="['reagent:base:delete']" link type="danger" @click="handleDeleteLot(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <!-- ============ 试剂弹窗 ============ -->
    <el-dialog v-model="baseDialogVisible" :title="baseDialogTitle" width="600px">
      <el-form ref="baseFormRef" v-loading="baseFormLoading" :model="baseForm" :rules="baseFormRules" label-width="100px">
        <el-form-item label="试剂编号" prop="basId">
          <el-input v-model="baseForm.basId" placeholder="请输入试剂编号" />
        </el-form-item>
        <el-form-item label="试剂名称" prop="reagentName">
          <el-input v-model="baseForm.reagentName" placeholder="请输入试剂名称" />
        </el-form-item>
        <el-form-item label="供应商" prop="vendor">
          <el-input v-model="baseForm.vendor" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="货号" prop="catNo">
          <el-input v-model="baseForm.catNo" placeholder="请输入货号" />
        </el-form-item>
        <el-form-item label="储存温度" prop="storageTemp">
          <el-input v-model="baseForm.storageTemp" placeholder="如：2-8°C" />
        </el-form-item>
        <el-form-item label="储存位置" prop="storageLocation">
          <el-input v-model="baseForm.storageLocation" placeholder="如：A区-3号冰箱" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="baseForm.status">
            <el-radio :value="0">正常</el-radio>
            <el-radio :value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="baseFormLoading" :loading="baseFormLoading" type="primary" @click="submitBaseForm">确 定</el-button>
        <el-button @click="baseDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>

    <!-- ============ 批号弹窗 ============ -->
    <el-dialog v-model="lotDialogVisible" :title="lotDialogTitle" width="500px">
      <el-form ref="lotFormRef" v-loading="lotFormLoading" :model="lotForm" :rules="lotFormRules" label-width="100px">
        <el-form-item label="批号" prop="lotNo">
          <el-input v-model="lotForm.lotNo" placeholder="请输入批号" />
        </el-form-item>
        <el-form-item label="规格/浓度" prop="content">
          <el-input v-model="lotForm.content" placeholder="如：50g" />
        </el-form-item>
        <el-form-item label="过期日期" prop="expirationDate">
          <el-date-picker
            v-model="lotForm.expirationDate"
            type="date"
            placeholder="选择过期日期"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="参考剩余量" prop="amountLeft">
          <el-input v-model="lotForm.amountLeft" placeholder="如：300ml" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="lotForm.status">
            <el-radio :value="0">正常</el-radio>
            <el-radio :value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="lotFormLoading" :loading="lotFormLoading" type="primary" @click="submitLotForm">确 定</el-button>
        <el-button @click="lotDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import { dateFormatter } from '@/utils/formatTime'

defineOptions({ name: 'ReagentBase' })

const message = useMessage()

// ==================== 查询 ====================
const loading = ref(true)
const total = ref(0)
const list = ref<ReagentApi.ReagentBaseVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 15,
  basId: '',
  reagentName: '',
  catNo: '',
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await ReagentApi.getBasePage(queryParams)
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
  queryParams.basId = ''
  queryParams.reagentName = ''
  queryParams.catNo = ''
  queryParams.status = undefined
  handleQuery()
}

getList()

// ==================== 试剂主表 CRUD ====================
const baseDialogVisible = ref(false)
const baseDialogTitle = ref('')
const baseFormLoading = ref(false)
const baseFormRef = ref()
const baseFormType = ref('')

const baseForm = reactive<ReagentApi.ReagentBaseVO>({
  basId: '',
  reagentName: '',
  vendor: '',
  catNo: '',
  storageTemp: '',
  storageLocation: '',
  status: 0
})

const baseFormRules = {
  basId: [{ required: true, message: '试剂编号不能为空', trigger: 'blur' }],
  reagentName: [{ required: true, message: '试剂名称不能为空', trigger: 'blur' }]
}

const openBaseForm = async (type: string, id?: number) => {
  baseFormType.value = type
  baseDialogVisible.value = true
  baseDialogTitle.value = type === 'create' ? '新增试剂' : '修改试剂'

  // 重置表单
  Object.assign(baseForm, {
    id: undefined, basId: '', reagentName: '', vendor: '', catNo: '',
    storageTemp: '', storageLocation: '', status: 0
  })

  if (type === 'update' && id) {
    baseFormLoading.value = true
    try {
      const data = await ReagentApi.getBaseDetail(id)
      Object.assign(baseForm, data)
    } finally {
      baseFormLoading.value = false
    }
  }
}

const submitBaseForm = async () => {
  await baseFormRef.value.validate()
  baseFormLoading.value = true
  try {
    if (baseFormType.value === 'create') {
      await ReagentApi.createBase(baseForm)
      message.success('创建成功')
    } else {
      await ReagentApi.updateBase(baseForm)
      message.success('修改成功')
    }
    baseDialogVisible.value = false
    getList()
  } finally {
    baseFormLoading.value = false
  }
}

const handleDelete = async (id: number) => {
  try { await message.confirm('确认删除该试剂？删除后关联批号也将删除。') } catch { return }
  await ReagentApi.deleteBase(id)
  message.success('删除成功')
  if (currentBase.value?.id === id) { currentBase.value = null; lotList.value = [] }
  getList()
}

// ==================== 批号子表 ====================
const lotLoading = ref(false)
const currentBase = ref<ReagentApi.ReagentBaseVO | null>(null)
const lotList = ref<ReagentApi.ReagentBaseLotVO[]>([])

const onRowClick = async (row: ReagentApi.ReagentBaseVO) => {
  currentBase.value = row
  lotLoading.value = true
  try {
    lotList.value = await ReagentApi.getLotListByBaseId(row.id!)
  } finally {
    lotLoading.value = false
  }
}

// ==================== 批号 CRUD ====================
const lotDialogVisible = ref(false)
const lotDialogTitle = ref('')
const lotFormLoading = ref(false)
const lotFormRef = ref()
const lotFormType = ref('')

const lotForm = reactive<ReagentApi.ReagentBaseLotVO>({
  baseId: 0,
  lotNo: '',
  content: '',
  expirationDate: '',
  amountLeft: '',
  status: 0
})

const lotFormRules = {
  lotNo: [{ required: true, message: '批号不能为空', trigger: 'blur' }]
}

const openLotForm = async (type: string, id?: number) => {
  if (!currentBase.value) {
    message.warning('请先选择一条试剂')
    return
  }
  lotFormType.value = type
  lotDialogVisible.value = true
  lotDialogTitle.value = type === 'create' ? '新增批号' : '修改批号'

  Object.assign(lotForm, { id: undefined, baseId: currentBase.value.id!, lotNo: '', content: '', expirationDate: '', amountLeft: '', status: 0 })

  if (type === 'update' && id) {
    lotFormLoading.value = true
    try {
      // 通过重新获取列表找到对应记录
      const lots = await ReagentApi.getLotListByBaseId(currentBase.value.id!)
      const found = lots.find((l: any) => l.id === id)
      if (found) Object.assign(lotForm, found)
    } finally {
      lotFormLoading.value = false
    }
  }
}

const submitLotForm = async () => {
  await lotFormRef.value.validate()
  lotFormLoading.value = true
  try {
    if (lotFormType.value === 'create') {
      await ReagentApi.createLot(lotForm)
      message.success('批号创建成功')
    } else {
      await ReagentApi.updateLot(lotForm)
      message.success('批号修改成功')
    }
    lotDialogVisible.value = false
    // 刷新批号列表
    if (currentBase.value) {
      lotList.value = await ReagentApi.getLotListByBaseId(currentBase.value.id!)
    }
  } finally {
    lotFormLoading.value = false
  }
}

const handleDeleteLot = async (id: number) => {
  try { await message.confirm('确认删除该批号？') } catch { return }
  await ReagentApi.deleteLot(id)
  message.success('批号删除成功')
  // 刷新批号列表
  if (currentBase.value) {
    lotList.value = await ReagentApi.getLotListByBaseId(currentBase.value.id!)
  }
}
</script>
