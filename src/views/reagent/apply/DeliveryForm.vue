<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="1400px"
    :close-on-click-modal="false"
    top="3vh"
  >
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="110px">
      <!-- 退回理由提示 -->
      <el-alert v-if="formData.status === 4 && formData.remark" :title="'退回理由：' + formData.remark" type="error" :closable="false" style="margin-bottom: 12px" />

      <!-- ==================== 基础数据信息维护 ==================== -->
        <el-divider content-position="left">基础数据信息维护</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="运费结算方式" prop="freightSettlement">
              <el-select v-model="formData.freightSettlement" placeholder="请选择" :disabled="isReadonly">
                <el-option label="客户（客户预约物流）" value="客户（客户预约物流）" />
                <el-option label="我司（后续据实结算）" value="我司（后续据实结算）" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="项目号" prop="projectNo" :rules="formData.freightSettlement === '我司（后续据实结算）' ? [{ required: true, message: '我司结算时项目号必填', trigger: 'blur' }] : []">
              <el-input v-model="formData.projectNo" placeholder="请输入项目号" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="运输温度">
              <el-input v-model="formData.transportTemp" placeholder="如：2-8°C" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="温度记录仪">
              <el-switch v-model="formData.hasTempLogger" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
        </el-row>

      <!-- ==================== 试剂明细区块 ==================== -->
      <el-divider content-position="left">试剂明细</el-divider>
      <el-button
        v-if="!isReadonly"
        type="primary"
        size="small"
        style="margin-bottom: 8px"
        @click="addItem"
      >
        <Icon icon="ep:plus" />添加试剂
      </el-button>
      <el-table :data="formData.items" border size="small">
        <el-table-column label="试剂名称" min-width="160">
          <template #default="scope">
            <el-select
              v-if="!isReadonly"
              v-model="scope.row.basId"
              filterable
              placeholder="选择试剂"
              @change="(val: string) => onReagentChange(val, scope.$index)"
            >
              <el-option
                v-for="r in reagentOptions"
                :key="r.basId"
                :label="`${r.basId} - ${r.reagentName}`"
                :value="r.basId"
              />
            </el-select>
            <span v-else>{{ scope.row.reagentName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="试剂编号" prop="basId" width="120" />
        <el-table-column label="货号" prop="catNo" width="120" />
        <el-table-column label="规格/浓度" prop="content" width="100" />
        <el-table-column label="储存温度" prop="storageTemp" width="100" />
        <el-table-column label="储存位置" prop="storageLocation" width="140" />
        <el-table-column label="批号" width="150">
          <template #default="scope">
            <el-select
              v-if="!isReadonly"
              v-model="scope.row.lotNo"
              filterable
              clearable
              placeholder="选择批号"
              :disabled="!scope.row.basId"
              @change="(val: string) => onLotChange(val, scope.$index)"
            >
              <el-option
                v-for="lot in getLotOptions(scope.row.basId)"
                :key="lot.lotNo"
                :label="lot.lotNo"
                :value="lot.lotNo"
              />
            </el-select>
            <span v-else>{{ scope.row.lotNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="需求数量" width="110">
          <template #default="scope">
            <el-input-number
              v-if="!isReadonly"
              v-model="scope.row.requestedQty"
              :min="1"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
            <span v-else>{{ scope.row.requestedQty }}</span>
          </template>
        </el-table-column>
        <el-table-column label="过期日期" width="140">
          <template #default="scope">
            <span v-if="scope.row.expirationDate">{{ formatDate(scope.row.expirationDate) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="mode === 'ship'" label="已发数量" width="80">
          <template #default="scope">
            {{ scope.row.shippedQtyTotal || 0 }}
          </template>
        </el-table-column>
        <el-table-column v-if="mode === 'ship'" label="本次发货" width="110">
          <template #default="scope">
            <el-input-number
              v-model="scope.row._shipQty"
              :min="0"
              :max="(scope.row.requestedQty || 0) - (scope.row.shippedQtyTotal || 0)"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="120">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row._remark" size="small" placeholder="选填" />
            <span v-else>{{ scope.row._remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="70">
          <template #default="scope">
            <el-button link type="danger" size="small" @click="removeItem(scope.$index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ==================== 物流信息区块（仅样品组处理时显示） ==================== -->
      <template v-if="mode === 'ship'">
        <el-divider content-position="left">物流信息（必填）</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="快递单号" prop="trackingNumber">
              <el-input v-model="logisticsForm.trackingNumber" placeholder="请输入快递单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流公司" prop="expressCompany">
              <el-input v-model="logisticsForm.expressCompany" placeholder="如：顺丰速运" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <!-- ==================== 发货记录展示 ==================== -->
      <template v-if="mode === 'ship' || mode === 'view'">
        <el-divider content-position="left">
          发货记录
          <el-button v-if="mode === 'ship'" type="primary" size="small" link @click="loadShipmentHistory">
            <Icon icon="ep:refresh" />刷新
          </el-button>
        </el-divider>
        <div v-if="shipmentHistory.length > 0" style="margin-bottom: 8px">
          <el-button type="success" size="small" :disabled="selectedShipments.length === 0" @click="handlePrintSelected">
            <Icon icon="ep:printer" />打印选中 ({{ selectedShipments.length }})
          </el-button>
        </div>
        <el-table
          v-if="mode === 'ship'"
          ref="shipmentTableRef" style="width: 100%"
          :data="shipmentHistory"
          border
          size="small"
          empty-text="暂无发货记录"
          @expand-change="onShipmentExpand"
          @selection-change="(rows) => selectedShipments = rows.map(r => r.id)"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column type="expand">
            <template #default="{ row: sh }">
              <div v-loading="sh._loading" style="width: 100%; overflow-x: auto">
                <el-table :data="sh._items" border size="small" empty-text="暂无明细">
                  <el-table-column label="试剂名称" prop="reagentName" min-width="160" />
                  <el-table-column label="试剂编号" prop="basId" min-width="100" />
                  <el-table-column label="货号" prop="catNo" min-width="100" />
                  <el-table-column label="规格/浓度" prop="content" min-width="90" />
                  <el-table-column label="储存温度" prop="storageTemp" min-width="90" />
                  <el-table-column label="储存位置" prop="storageLocation" min-width="120" />
                  <el-table-column label="批号" prop="lotNo" min-width="100" />
                  <el-table-column label="发货数量" prop="quantityShipped" min-width="80" />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发货单号" prop="shipmentNo" min-width="170" />
          <el-table-column label="快递公司" prop="expressCompany" min-width="120" />
          <el-table-column label="快递单号" prop="trackingNumber" min-width="160" />
          <el-table-column label="发货时间" min-width="170">
            <template #default="scope">{{ formatDate(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="70">
            <template #default="scope">
              <el-button link type="warning" size="small" @click="handleRevokeShipment(scope.row.id)">
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-table
          v-else
          ref="shipmentTableRef" style="width: 100%"
          :data="shipmentHistory"
          border
          size="small"
          empty-text="暂无发货记录"
          @expand-change="onShipmentExpand"
          @selection-change="(rows) => selectedShipments = rows.map(r => r.id)"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column type="expand">
            <template #default="{ row: sh }">
              <div v-loading="sh._loading" style="width: 100%; overflow-x: auto">
                <el-table :data="sh._items" border size="small" empty-text="暂无明细">
                  <el-table-column label="试剂名称" prop="reagentName" min-width="160" />
                  <el-table-column label="试剂编号" prop="basId" min-width="100" />
                  <el-table-column label="货号" prop="catNo" min-width="100" />
                  <el-table-column label="规格/浓度" prop="content" min-width="90" />
                  <el-table-column label="储存温度" prop="storageTemp" min-width="90" />
                  <el-table-column label="储存位置" prop="storageLocation" min-width="120" />
                  <el-table-column label="批号" prop="lotNo" min-width="100" />
                  <el-table-column label="发货数量" prop="quantityShipped" min-width="80" />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发货单号" prop="shipmentNo" min-width="170" />
          <el-table-column label="快递公司" prop="expressCompany" min-width="120" />
          <el-table-column label="快递单号" prop="trackingNumber" min-width="160" />
          <el-table-column label="发货时间" min-width="170">
            <template #default="scope">{{ formatDate(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="70">
            <template #default="scope">
              <el-button link type="warning" size="small" @click="handleRevokeShipment(scope.row.id)">
                撤回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- ==================== 收货/发货信息区块 ==================== -->
      <el-divider content-position="left">
        收发信息
        <el-button size="small" type="primary" link @click="showAddress = !showAddress">
          {{ showAddress ? '收起' : '展开' }}
        </el-button>
      </el-divider>
      <template v-if="showAddress">
      <el-row :gutter="12">
        <el-col :span="12">
          <fieldset style="border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px 12px">
            <legend style="font-weight: bold; color: #409eff">
              发货方信息
              <el-button v-if="!isReadonly" size="small" type="warning" style="margin-left: 8px" @click="fillConsignorShanghai">上海地址</el-button>
              <el-button v-if="!isReadonly" size="small" type="success" @click="fillConsignorNingbo">宁波地址</el-button>
            </legend>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="联系人" prop="consignorName" class="mb-8px">
                  <el-input v-model="formData.consignorName" :disabled="isReadonly" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="电话" prop="consignorPhone" class="mb-8px">
                  <el-input v-model="formData.consignorPhone" :disabled="isReadonly" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="单位" prop="consignorUnit" class="mb-8px">
              <el-input v-model="formData.consignorUnit" :disabled="isReadonly" />
            </el-form-item>
            <el-form-item label="地址" prop="consignorAddress" class="mb-0">
              <el-input v-model="formData.consignorAddress" :disabled="isReadonly" />
            </el-form-item>
          </fieldset>
        </el-col>
        <el-col :span="12">
          <fieldset style="border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px 12px">
            <legend style="font-weight: bold; color: #e6a23c">接收方信息（必填）</legend>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="联系人" prop="receiverName" class="mb-8px">
                  <el-input v-model="formData.receiverName" :disabled="isReadonly" placeholder="请输入联系人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="电话" prop="receiverPhone" class="mb-8px">
                  <el-input v-model="formData.receiverPhone" :disabled="isReadonly" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="单位" prop="receiverUnit" class="mb-8px">
              <el-input v-model="formData.receiverUnit" :disabled="isReadonly" placeholder="请输入接收单位" />
            </el-form-item>
            <el-form-item label="地址" prop="receiverAddress" class="mb-0">
              <el-input v-model="formData.receiverAddress" :disabled="isReadonly" placeholder="请输入接收地址" />
            </el-form-item>
          </fieldset>
        </el-col>
      </el-row>
      </template>
    </el-form>

    <!-- ==================== 底部操作按钮 ==================== -->
    <template #footer>
      <div style="display: flex; justify-content: space-between; width: 100%">
        <div>
          <!-- 样品组：拒绝/退回按钮 -->
          <el-button
            v-if="mode === 'ship' && formData.status === 1"
            type="danger"
            :loading="formLoading"
            @click="handleReject"
          >
            拒绝/退回
          </el-button>
        </div>
        <div>
          <el-button @click="dialogVisible = false">取 消</el-button>
          <!-- 项目组：保存/提交按钮 -->
          <template v-if="mode === 'create' || mode === 'edit'">
            <el-button type="primary" :loading="formLoading" @click="handleSave">
              保存草稿
            </el-button>
          </template>
          <!-- 样品组：确认发货按钮 -->
          <template v-if="mode === 'ship'">
            <el-button type="primary" :loading="formLoading" @click="handleConfirmShip">
              确认发货
            </el-button>
          </template>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import { formatDate } from '@/utils/formatTime'
import { nextTick } from 'vue'

defineOptions({ name: 'ReagentDeliveryForm' })

const message = useMessage()

const emit = defineEmits(['success'])

// ==================== 模式与可见性 ====================
const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref()
const mode = ref<string>('') // 'create' | 'edit' | 'view' | 'ship'
const editingId = ref<number>()
const showAddress = ref(false)

const dialogTitle = computed(() => {
  const map: Record<string, string> = {
    create: '新增申请单（项目组提单）',
    edit: '编辑申请单',
    view: '查看申请单详情',
    ship: '处理发货（样品组）'
  }
  return map[mode.value] || '申请单'
})

const isReadonly = computed(() => mode.value === 'view' || mode.value === 'ship')

// 发货方地址快速填充
const fillConsignorShanghai = () => {
  Object.assign(formData, {
    consignorUnit: '精翰生物',
    consignorAddress: '上海市浦东新区张江高科技园区XXX号',
    consignorName: '仓库管理员',
    consignorPhone: '021-XXXXXXXX'
  })
}
const fillConsignorNingbo = () => {
  Object.assign(formData, {
    consignorUnit: '精翰生物',
    consignorAddress: '宁波市杭州湾新区XXX号',
    consignorName: '宁波仓管员',
    consignorPhone: '0574-XXXXXXXX'
  })
}

// ==================== 表单数据 ====================
const formData = reactive<ReagentApi.ReagentApplyVO>({
  consignorUnit: '精翰生物',
  consignorAddress: '上海市浦东新区张江高科技园区XXX号',
  consignorName: '仓库管理员',
  consignorPhone: '021-XXXXXXXX',
  receiverUnit: '',
  receiverAddress: '',
  receiverName: '',
  receiverPhone: '',
  freightSettlement: '',
  projectNo: '',
  transportTemp: '',
  hasTempLogger: 0,
  items: []
})

const formRules = {
  receiverUnit: [{ required: true, message: '接收方单位不能为空', trigger: 'blur' }],
  receiverAddress: [{ required: true, message: '接收方地址不能为空', trigger: 'blur' }],
  receiverName: [{ required: true, message: '接收联系人不能为空', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '接收联系电话不能为空', trigger: 'blur' },
    { pattern: /^(1[3-9]\d{9}|\d{3,4}-\d{7,8}(-\d{1,6})?)$/, message: '请输入正确的手机号或座机号', trigger: 'blur' }
  ],
  consignorPhone: [
    { pattern: /^(1[3-9]\d{9}|\d{3,4}-\d{7,8}(-\d{1,6})?)$/, message: '请输入正确的手机号或座机号', trigger: 'blur' }
  ]
}

// 物流表单（仅 ship 模式）
const logisticsForm = reactive({
  trackingNumber: '',
  expressCompany: ''
})

// 发货记录
const shipmentHistory = ref<ReagentApi.ReagentShipmentVO[]>([])
const selectedShipments = ref<number[]>([])

// ==================== 打印功能 ====================
const handlePrintSelected = async () => {
  if (selectedShipments.value.length === 0) {
    message.warning('请至少勾选一条发货记录')
    return
  }
  try {
    const res = selectedShipments.value.length === 1
      ? await ReagentApi.printShipment(selectedShipments.value[0])
      : await ReagentApi.printShipments(selectedShipments.value)
    downloadBlob(res, `交接单.xlsx`)
    message.success('打印文件下载中')
  } catch {
    message.error('打印失败')
  }
}

/** Blob 响应下载辅助 */
const downloadBlob = (res: any, fileName: string) => {
  const blob = res instanceof Blob ? res : new Blob([res.data ?? res])
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
}

const handleRevokeShipment = async (shipmentId: number) => {
  try { await message.confirm('确认撤回该发货单？将回退已发数量和申请单状态。') } catch { return }
  try {
    await ReagentApi.revokeShipment(shipmentId)
    message.success('已撤回')
    // 重新加载申请单详情（刷新状态）和发货记录
    if (editingId.value) {
      const data = await ReagentApi.getApplyDetail(editingId.value)
      Object.assign(formData, data)
      formData.items = data.items || []
    }
    await loadShipmentHistory()
    selectedShipments.value = []
    emit('success')
  } catch {
    message.error('撤回失败')
  }
}

// ==================== 试剂下拉选项 & 批号缓存 ====================
const reagentOptions = ref<ReagentApi.ReagentBaseVO[]>([])
const lotCache = ref<Record<string, ReagentApi.ReagentBaseLotVO[]>>({})

const loadReagentOptions = async () => {
  try {
    reagentOptions.value = await ReagentApi.getBaseSimpleList()
  } catch {
    // ignore
  }
}

const getLotOptions = (basId: string) => {
  if (!basId || !lotCache.value[basId]) return []
  return lotCache.value[basId]
}

// 选择试剂 → 加载批号
const onReagentChange = async (basId: string, index: number) => {
  const item = formData.items![index]
  // 找到对应的试剂信息填充名称和货号
  const reagent = reagentOptions.value.find((r) => r.basId === basId)
  if (reagent) {
    item.reagentName = reagent.reagentName
    item.catNo = reagent.catNo || ''
    item.storageTemp = reagent.storageTemp || ''
    item.storageLocation = reagent.storageLocation || ''
  }
  // 清空批号、过期日期、规格/浓度
  item.lotNo = ''
  item.expirationDate = ''
  item.content = ''

  // 加载批号
  if (basId && !lotCache.value[basId]) {
    try {
      const allLots = await ReagentApi.getLotListByBasId(basId)
      lotCache.value[basId] = allLots.filter((l: any) => l.status !== 1) // 仅正常批号
    } catch {
      lotCache.value[basId] = []
    }
  }
}

// 选择批号 → 联动过期日期（只读锁定）
const onLotChange = (lotNo: string, index: number) => {
  const item = formData.items![index]
  if (!lotNo || !item.basId) {
    item.expirationDate = ''
    return
  }
  const lots = lotCache.value[item.basId] || []
  const lot = lots.find((l) => l.lotNo === lotNo)
  item.expirationDate = lot?.expirationDate || ''
  item.content = lot?.content || ''
}

// ==================== 明细行操作 ====================
const addItem = () => {
  const item = {
    basId: '',
    reagentName: '',
    catNo: '',
    content: '',
    lotNo: '',
    storageTemp: '',
    storageLocation: '',
    expirationDate: '',
    requestedQty: 1,
    shippedQtyTotal: 0
  } as ReagentApi.ReagentApplyItemVO
  formData.items!.push(item)
}

const removeItem = (index: number) => {
  formData.items!.splice(index, 1)
}

// ==================== 打开发货记录 ====================
const loadShipmentHistory = async () => {
  if (!editingId.value) return
  try {
    const list = await ReagentApi.getShipmentListByApplyId(editingId.value)
    shipmentHistory.value = list.map((s: any) => ({ ...s, _loading: false, _items: [] }))
  } catch {
    shipmentHistory.value = []
  }
}

// 展开发货单 → 加载发货明细
const onShipmentExpand = async (row: any, expandedRows: any[]) => {
  if (expandedRows.includes(row) && (!row._items || row._items.length === 0)) {
    row._loading = true
    try {
      const detail = await ReagentApi.getShipmentDetail(row.id)
      // 用 applyItemId 联查 apply_item 补上试剂名称
      const applyData = await ReagentApi.getApplyDetail(formData.id!)
      const itemMap = new Map((applyData.items || []).map((i: any) => [i.id, i]))
      row._items = (detail.items || []).map((si: any) => {
        const ai = itemMap.get(si.applyItemId) || {}
        return { ...si, ...ai, lotNo: si.lotNo || ai.lotNo, quantityShipped: si.quantityShipped }
      })
    } catch {
      row._items = []
    } finally {
      row._loading = false
    }
  }
}

// ==================== 打开弹窗 ====================
const open = async (m: string, id?: number) => {
  mode.value = m
  editingId.value = id
  dialogVisible.value = true
  formLoading.value = true
  // 收发信息：仅新增模式默认展开，其他模式默认折叠
  showAddress.value = m === 'create'

  // 加载试剂下拉
  await loadReagentOptions()

  // 重置表单
  Object.assign(formData, {
    id: undefined,
    consignorUnit: '精翰生物',
    consignorAddress: '上海市浦东新区张江高科技园区XXX号',
    consignorName: '仓库管理员',
    consignorPhone: '021-XXXXXXXX',
    receiverUnit: '',
    receiverAddress: '',
    receiverName: '',
    receiverPhone: '',
    remark: '',
    freightSettlement: '',
    projectNo: '',
    transportTemp: '',
    hasTempLogger: 0,
    items: []
  })
  Object.assign(logisticsForm, { trackingNumber: '', expressCompany: '' })
  shipmentHistory.value = []

  if ((m === 'edit' || m === 'view' || m === 'ship') && id) {
    try {
      const data = await ReagentApi.getApplyDetail(id)
      Object.assign(formData, data)
      formData.items = data.items || []  // 显式赋值保证明细 reactivity
      // 预加载所有批号缓存
      for (const item of data.items || []) {
        if (item.basId && !lotCache.value[item.basId]) {
          try {
            lotCache.value[item.basId] = await ReagentApi.getLotListByBasId(item.basId)
          } catch {
            lotCache.value[item.basId] = []
          }
        }
        // 为 ship 模式添加临时的 _shipQty 字段
        ;(item as any)._shipQty = 0
      }
    } catch {
      message.error('加载申请单失败')
    }

    // 加载发货记录
    if (m === 'ship' || m === 'view') {
      await loadShipmentHistory()
    }
  }
  formLoading.value = false
}

defineExpose({ open })

// ==================== 保存草稿 ====================
const handleSave = async () => {
  if (!formData.items || formData.items.length === 0) {
    message.warning('请至少添加一条试剂明细')
    return
  }
  await formRef.value?.validate()
  formLoading.value = true
  try {
    if (mode.value === 'create') {
      await ReagentApi.createApply(formData)
      message.success('申请单创建成功')
    } else {
      await ReagentApi.updateApply(formData)
      message.success('申请单修改成功')
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

// ==================== 拒绝/退回 ====================
const handleReject = async () => {
  try {
    const { value: remark } = await ElMessageBox.prompt('请输入拒绝/退回理由', '拒单退回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (val: string) => val && val.trim() ? true : '理由不能为空'
    })
    if (!remark) return
    formLoading.value = true
    await ReagentApi.rejectApply({ id: editingId.value!, remark })
    message.success('已退回')
    dialogVisible.value = false
    emit('success')
  } catch {
    // 用户取消
  } finally {
    formLoading.value = false
  }
}

// ==================== 确认发货 ====================
const handleConfirmShip = async () => {
  if (!logisticsForm.trackingNumber || !logisticsForm.expressCompany) {
    message.warning('请填写快递单号和物流公司')
    return
  }
  if (formData.freightSettlement === '我司（后续据实结算）' && !formData.projectNo?.trim()) {
    message.warning('我司结算时项目号必填')
    return
  }
  const shipmentItems = (formData.items || [])
    .filter((item: any) => item._shipQty > 0)
    .map((item: any) => ({
      applyItemId: item.id,
      lotNo: item.lotNo,
      quantityShipped: item._shipQty
    }))
  if (shipmentItems.length === 0) {
    message.warning('请至少填写一项本次发货数量')
    return
  }

  formLoading.value = true
  await nextTick()  // 让 loading 遮罩先渲染出来
  try {
    await message.confirm(`确认发货？共 ${shipmentItems.length} 项，快递单号: ${logisticsForm.trackingNumber}`)
  } catch {
    formLoading.value = false
    return
  }

  try {
    await ReagentApi.confirmShipment({
      applyId: editingId.value,
      trackingNumber: logisticsForm.trackingNumber,
      expressCompany: logisticsForm.expressCompany,
      freightSettlement: formData.freightSettlement,
      projectNo: formData.projectNo,
      transportTemp: formData.transportTemp,
      hasTempLogger: formData.hasTempLogger,
      items: shipmentItems
    })
    message.success('发货成功')
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
