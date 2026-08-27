<template>
  <div class="reagent-base-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form ref="queryFormRef" :inline="true" :model="queryParams">
        <el-form-item label="BAS号" prop="basId">
          <el-input v-model="queryParams.basId" placeholder="采购入库单号" clearable @keyup.enter="handleQuery" class="!w-180px" />
        </el-form-item>
        <el-form-item label="试剂编号" prop="reagentCode">
          <el-input v-model="queryParams.reagentCode" placeholder="材料编号" clearable @keyup.enter="handleQuery" class="!w-160px" />
        </el-form-item>
        <el-form-item label="试剂名称" prop="reagentName">
          <el-input v-model="queryParams.reagentName" placeholder="试剂名称" clearable @keyup.enter="handleQuery" class="!w-200px" />
        </el-form-item>
        <el-form-item label="货号" prop="catNo">
          <el-input v-model="queryParams.catNo" placeholder="货号" clearable @keyup.enter="handleQuery" class="!w-140px" />
        </el-form-item>
        <el-form-item label="分类" prop="itemCategory">
          <el-input v-model="queryParams.itemCategory" placeholder="分类名" clearable @keyup.enter="handleQuery" class="!w-180px" />
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

    <!-- ============ 扁平表（一行=一批，老ERP同步 + 可编辑/可删除） ============ -->
    <ContentWrap>
      <div class="mb-8px" style="display: flex; justify-content: flex-end">
        <el-popover placement="bottom-end" :width="220" trigger="click">
          <template #reference>
            <el-button size="small"><Icon icon="ep:setting" />列设置</el-button>
          </template>
          <div style="display: flex; flex-direction: column; gap: 6px">
            <el-checkbox v-for="c in columnOptions" :key="c.key" v-model="columnMap[c.key]">{{ c.label }}</el-checkbox>
          </div>
        </el-popover>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column v-if="columnMap.basId" label="BAS号" prop="basId" width="150" show-overflow-tooltip />
        <el-table-column v-if="columnMap.reagentCode" label="试剂编号" prop="reagentCode" width="120" show-overflow-tooltip />
        <el-table-column v-if="columnMap.reagentName" label="试剂名称" prop="reagentName" min-width="180" show-overflow-tooltip />
        <el-table-column v-if="columnMap.vendor" label="供应商" prop="vendor" width="150" show-overflow-tooltip />
        <el-table-column v-if="columnMap.warehouse" label="仓库" prop="warehouse" width="130" show-overflow-tooltip />
        <el-table-column v-if="columnMap.catNo" label="货号" prop="catNo" width="120" show-overflow-tooltip />
        <el-table-column v-if="columnMap.spec" label="规格" prop="spec" width="160" show-overflow-tooltip />
        <el-table-column v-if="columnMap.lotNo" label="批号" prop="lotNo" width="140" show-overflow-tooltip />
        <el-table-column v-if="columnMap.expireDate" label="过期日期" prop="expireDate" width="110" />
        <el-table-column v-if="columnMap.amountLeft" label="参考剩余量" prop="amountLeft" width="100" />
        <el-table-column v-if="columnMap.storageLocation" label="存储位置" prop="storageLocation" width="140" show-overflow-tooltip />
        <el-table-column v-if="columnMap.storageTemp" label="储存温度" prop="storageTemp" width="100" />
        <el-table-column v-if="columnMap.itemCategory" label="分类" prop="itemCategory" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="scope">
            <el-button v-hasPermi="['reagent:base:update']" link type="primary" @click.stop="openEditForm(scope.row)">
              编辑
            </el-button>
            <el-button v-hasPermi="['reagent:base:update']" link type="danger" @click.stop="handleDelete(scope.row)">
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

    <!-- ============ 编辑弹窗（可维护字段） ============ -->
    <el-dialog v-model="editDialogVisible" :title="editDialogTitle" width="560px">
      <el-form ref="editFormRef" v-loading="editFormLoading" :model="editForm" label-width="100px">
        <el-form-item label="BAS号">
          <el-input :model-value="editForm.basId" disabled />
        </el-form-item>
        <el-form-item label="试剂编号">
          <el-input :model-value="editForm.reagentCode" disabled />
        </el-form-item>
        <el-form-item label="批号">
          <el-input :model-value="editForm.lotNo" disabled />
        </el-form-item>
        <el-form-item label="试剂名称" prop="reagentName">
          <el-input v-model="editForm.reagentName" />
        </el-form-item>
        <el-form-item label="供应商" prop="vendor">
          <el-input v-model="editForm.vendor" />
        </el-form-item>
        <el-form-item label="仓库" prop="warehouse">
          <el-input v-model="editForm.warehouse" />
        </el-form-item>
        <el-form-item label="货号" prop="catNo">
          <el-input v-model="editForm.catNo" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="editForm.spec" />
        </el-form-item>
        <el-form-item label="储存温度" prop="storageTemp">
          <el-select
            v-model="editForm.storageTemp"
            placeholder="请选择储存温度"
            clearable
            filterable
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option
              v-for="dict in getStrDictOptions(DICT_TYPE.REAGENT_STORAGE_CONDITION)"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="储存位置" prop="storageLocation">
          <el-input v-model="editForm.storageLocation" placeholder="如：A区-3号冰箱" />
        </el-form-item>
        <el-form-item label="参考剩余量" prop="amountLeft">
          <el-input v-model="editForm.amountLeft" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="editForm.status">
            <el-radio :value="0">正常</el-radio>
            <el-radio :value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="editFormLoading" :loading="editFormLoading" type="primary" @click="submitEditForm">确 定</el-button>
        <el-button @click="editDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'

defineOptions({ name: 'ReagentBase' })

const message = useMessage()

// ==================== 查询（只读扁平表） ====================
const loading = ref(true)
const total = ref(0)
const list = ref<ReagentApi.ReagentBaseFlatVO[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 15,
  basId: '',
  reagentCode: '',
  reagentName: '',
  catNo: '',
  itemCategory: '',
  status: undefined as number | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await ReagentApi.getBaseFlatPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

// ==================== 列设置（显隐） ====================
const columnOptions = [
  { key: 'basId', label: 'BAS号' },
  { key: 'reagentCode', label: '试剂编号' },
  { key: 'reagentName', label: '试剂名称' },
  { key: 'vendor', label: '供应商' },
  { key: 'warehouse', label: '仓库' },
  { key: 'catNo', label: '货号' },
  { key: 'spec', label: '规格' },
  { key: 'lotNo', label: '批号' },
  { key: 'expireDate', label: '过期日期' },
  { key: 'amountLeft', label: '参考剩余量' },
  { key: 'storageLocation', label: '存储位置' },
  { key: 'storageTemp', label: '储存温度' },
  { key: 'itemCategory', label: '分类' }
]
const columnMap = reactive<Record<string, boolean>>(Object.fromEntries(columnOptions.map((c) => [c.key, true])))

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.basId = ''
  queryParams.reagentCode = ''
  queryParams.reagentName = ''
  queryParams.catNo = ''
  queryParams.itemCategory = ''
  queryParams.status = undefined
  handleQuery()
}

getList()

// ==================== 编辑（可维护字段；同步来源字段只读） ====================
const editDialogVisible = ref(false)
const editDialogTitle = ref('')
const editFormLoading = ref(false)
const editFormRef = ref()
const editForm = reactive<ReagentApi.ReagentBaseFlatVO>({})

const openEditForm = (row: ReagentApi.ReagentBaseFlatVO) => {
  editDialogTitle.value = '编辑试剂基础信息'
  Object.assign(editForm, {
    id: row.id,
    basId: row.basId,
    reagentCode: row.reagentCode,
    lotNo: row.lotNo,
    reagentName: row.reagentName,
    vendor: row.vendor,
    warehouse: row.warehouse,
    catNo: row.catNo,
    spec: row.spec,
    storageTemp: row.storageTemp,
    storageLocation: row.storageLocation,
    amountLeft: row.amountLeft,
    status: row.status ?? 0
  })
  editDialogVisible.value = true
}

const submitEditForm = async () => {
  await editFormRef.value.validate()
  editFormLoading.value = true
  try {
    await ReagentApi.updateBaseFlat(editForm)
    message.success('修改成功')
    editDialogVisible.value = false
    getList()
  } finally {
    editFormLoading.value = false
  }
}

// ==================== 删除（物理删除，重新同步可恢复） ====================
const handleDelete = async (row: ReagentApi.ReagentBaseFlatVO) => {
  try {
    await message.confirm(
      `确认删除该条试剂基础数据？\nBAS ${row.basId} · ${row.reagentName} · 批号 ${row.lotNo || '-'}\n删除后重新运行同步会按源数据恢复。`
    )
  } catch {
    return
  }
  try {
    await ReagentApi.deleteBaseFlat(row.id!)
    message.success('删除成功')
    getList()
  } catch {
    message.error('删除失败')
  }
}
</script>
