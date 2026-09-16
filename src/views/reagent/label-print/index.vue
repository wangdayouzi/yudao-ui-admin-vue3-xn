<template>
  <div class="reagent-label-print-container">
    <!-- ============ 搜索区域 ============ -->
    <ContentWrap>
      <el-form :inline="true" :model="queryParams" @submit.prevent>
        <el-form-item label="BASID" required>
          <el-input
            v-model="queryParams.basId"
            placeholder="请输入 BASID（必填，支持模糊）"
            clearable
            class="!w-260px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            v-hasPermi="['reagent:label-print:query']"
            type="primary"
            :loading="queryLoading"
            @click="handleQuery"
          >
            <Icon icon="ep:search" />查询
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" />重置
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- ============ 查询结果（一个 BASID 可能对应多个批号） ============ -->
    <ContentWrap v-if="resultList.length > 0">
      <div class="section-title">查询结果（共 {{ resultTotal }} 条，每页 5 条；点击选择要打印的批次）</div>
      <el-table
        v-loading="queryLoading"
        :data="resultList"
        highlight-current-row
        @current-change="onCurrentChange"
      >
        <el-table-column type="index" label="#" width="56" :index="getRowIndex" />
        <el-table-column label="名称" prop="name" min-width="200" show-overflow-tooltip />
        <el-table-column label="BASID" prop="basId" width="180" />
        <el-table-column label="批号" prop="batchNo" width="160" />
        <el-table-column label="存储位置" prop="storageLocation" min-width="160" show-overflow-tooltip />
        <el-table-column label="过期日期" prop="expireDate" width="140" />
      </el-table>
      <el-pagination
        v-if="resultTotal > queryParams.pageSize"
        v-model:current-page="queryParams.pageNo"
        :page-size="queryParams.pageSize"
        :total="resultTotal"
        background
        layout="total, prev, pager, next, jumper"
        class="result-pagination"
        @current-change="handlePageChange"
      />
    </ContentWrap>

    <!-- ============ 打印标签表单 ============ -->
    <ContentWrap v-if="selectedRow">
      <div class="section-title-row">
        <div class="section-title">打印标签信息</div>
        <el-alert
          class="label-print-notice"
          title="请在连接标签打印机的电脑上打印；务必先确认标签打印机内的纸张宽度正确。未出纸请查看打印历史"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
      <el-form :model="printForm" label-width="100px" style="max-width: 640px">
        <el-form-item label="打印机" required>
          <el-select v-model="printForm.printerId" :loading="printerLoading" placeholder="请选择标签打印机" style="width: 100%" @change="cachePrinterSelection">
            <el-option
              v-for="printer in printers"
              :key="printer.id"
              :label="`${printer.name}${printer.onlineStatus === 1 ? '' : '（离线）'}`"
              :value="printer.id"
              :disabled="printer.onlineStatus !== 1"
            />
          </el-select>
          <div class="form-tip">任务会由该打印机所在 Windows 服务自动领取并打印，无需弹出浏览器打印窗口。</div>
        </el-form-item>
        <el-form-item label="标签模板" required>
          <el-select v-model="printForm.templateCode" :loading="templateLoading" placeholder="请选择标签模板" style="width: 100%" @change="cacheTemplateSelection">
            <el-option v-for="template in templates" :key="template.code" :label="template.name" :value="template.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="打印份数" required>
          <el-input-number v-model="printForm.copies" :min="1" :max="50" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="printForm.name" placeholder="可修改" />
        </el-form-item>
        <el-form-item label="BASID" prop="basId">
          <el-input v-model="printForm.basId" placeholder="可修改" />
        </el-form-item>
        <el-form-item label="批号" prop="batchNo">
          <el-input v-model="printForm.batchNo" placeholder="可修改" />
        </el-form-item>
        <el-form-item label="存储条件" prop="storageCondition">
          <el-select
            v-model="storageConditionArr"
            placeholder="请选择存储条件（可多选）"
            clearable
            multiple
            filterable
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
        <el-form-item label="存储位置" prop="storageLocation">
          <el-input v-model="printForm.storageLocation" placeholder="请输入存储位置" />
        </el-form-item>
        <el-form-item label="过期日期" prop="expireDate">
          <el-input v-model="printForm.expireDate" placeholder="可修改" />
        </el-form-item>
        <el-form-item label="接收人" prop="receiverName">
          <UserSelectV2 v-model="printForm.receiverId" placeholder="请选择接收人（显示昵称）" @change="onReceiverChange" />
        </el-form-item>
        <el-form-item label="接收日期" prop="receiveDate">
          <el-date-picker
            v-model="printForm.receiveDate"
            type="date"
            placeholder="选择接收日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="printForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div style="margin-top: 12px">
        <el-button v-hasPermi="['reagent:label-print:print']" type="primary" :loading="jobSubmitting" @click="handleLabelPrint">
          <Icon icon="ep:printer" />提交打印
        </el-button>
        <el-button v-hasPermi="['reagent:label-print:print']" @click="handlePrint">
          <Icon icon="ep:download" />导出 Excel（旧格式）
        </el-button>
        <el-button @click="openPrintHistory">
          <Icon icon="ep:document" />打印历史
        </el-button>
      </div>
    </ContentWrap>

    <el-dialog v-model="historyVisible" title="打印历史（最近 20 条）" width="1100px" destroy-on-close>
      <el-table v-loading="historyLoading" :data="printHistory" max-height="440" empty-text="暂无打印历史">
        <el-table-column label="任务编号" prop="jobNo" min-width="210" show-overflow-tooltip />
        <el-table-column label="打印机" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ printerNameOf(row.printerId) }}</template>
        </el-table-column>
        <el-table-column label="模板" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ templateNameOf(row.templateCode) }}</template>
        </el-table-column>
        <el-table-column label="份数" width="70">
          <template #default="{ row }">{{ row.printedCount || 0 }}/{{ row.copies }}</template>
        </el-table-column>
        <el-table-column label="状态" width="94">
          <template #default="{ row }">
            <el-tag :type="jobStatusTagType(row.status)">{{ jobStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="失败原因" prop="errorMessage" min-width="220" show-overflow-tooltip />
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatHistoryTime(row.createTime) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import UserSelectV2 from '@/views/system/user/components/UserSelectV2.vue'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import dayjs from 'dayjs'

defineOptions({ name: 'ReagentLabelPrint' })

const message = useMessage()
const userStore = useUserStoreWithOut()

// ==================== 查询 ====================
const queryLoading = ref(false)
const queryParams = reactive({
  basId: '',
  pageNo: 1,
  // 标签页固定每页 5 条，避免查询结果把下面的打印表单顶出屏幕。
  pageSize: 5
})
const resultList = ref<ReagentApi.ReagentLabelPrintVO[]>([])
const resultTotal = ref(0)
const selectedRow = ref<ReagentApi.ReagentLabelPrintVO | null>(null)

const handleQuery = async () => {
  const basId = queryParams.basId.trim()
  if (!basId) {
    message.warning('请输入 BASID')
    return
  }
  if (!/bas/i.test(basId)) {
    message.warning('BASID 必须包含 "bas" 字符')
    return
  }
  queryParams.pageNo = 1
  // 只有新的查询条件才清空已选试剂；翻页保留，方便对照不同批次。
  selectedRow.value = null
  resetPrintForm()
  await loadResultPage()
}

const loadResultPage = async () => {
  queryLoading.value = true
  try {
    const data = await ReagentApi.getLabelPrintByBasId({ basId: queryParams.basId.trim(), pageNo: queryParams.pageNo })
    resultList.value = data.list
    resultTotal.value = data.total
    if (resultList.value.length === 0) {
      message.warning('未查询到相关数据')
    }
  } finally {
    queryLoading.value = false
  }
}

const handlePageChange = async (pageNo: number) => {
  queryParams.pageNo = pageNo
  // 翻页不清空当前已选试剂及其已修改的标签内容。
  await loadResultPage()
}

const getRowIndex = (index: number) => (queryParams.pageNo - 1) * queryParams.pageSize + index + 1

const resetQuery = () => {
  queryParams.basId = ''
  queryParams.pageNo = 1
  resultList.value = []
  resultTotal.value = 0
  selectedRow.value = null
  resetPrintForm()
}

// ==================== 打印表单 ====================
const printForm = reactive({
  printerId: undefined as number | undefined,
  templateCode: '',
  copies: 1,
  name: '',
  basId: '',
  batchNo: '',
  storageCondition: '',
  storageLocation: '',
  expireDate: '',
  receiverId: undefined as number | undefined,
  receiverName: '',
  receiveDate: '',
  remark: ''
})

// ==================== 逻辑打印机与打印任务 ====================
const printerLoading = ref(false)
const templateLoading = ref(false)
const jobSubmitting = ref(false)
const printers = ref<ReagentApi.ReagentLabelPrinterVO[]>([])
const templates = ref<ReagentApi.ReagentLabelTemplateVO[]>([])
const historyVisible = ref(false)
const historyLoading = ref(false)
const printHistory = ref<ReagentApi.ReagentLabelPrintJobVO[]>([])

/** 浏览器本地记住当前用户最近使用的标签打印机；不同站点域名的 localStorage 天然隔离。 */
const printerStorageKey = () => `reagent-label-print:last-printer:${userStore.getUser?.id || 'anonymous'}`

const cachePrinterSelection = (printerId: number) => {
  window.localStorage.setItem(printerStorageKey(), String(printerId))
}

const templateStorageKey = () => `reagent-label-print:last-template:${userStore.getUser?.id || 'anonymous'}`

const cacheTemplateSelection = (templateCode: string) => {
  window.localStorage.setItem(templateStorageKey(), templateCode)
}

const loadPrinters = async () => {
  printerLoading.value = true
  try {
    printers.value = await ReagentApi.getLabelPrinters()
    const cachedPrinterId = Number(window.localStorage.getItem(printerStorageKey()))
    const cachedPrinter = printers.value.find((item) => item.id === cachedPrinterId)
    // 优先使用该浏览器上次选择的打印机；即使它已离线也不自动切换到别的地点。
    if (cachedPrinter) {
      printForm.printerId = cachedPrinter.id
      return
    }
    // 没有历史选择时才默认第一台在线机，并记住该选择。
    if (!printForm.printerId) {
      const firstOnlinePrinter = printers.value.find((item) => item.onlineStatus === 1)
      if (firstOnlinePrinter) {
        printForm.printerId = firstOnlinePrinter.id
        cachePrinterSelection(firstOnlinePrinter.id)
      }
    }
  } finally {
    printerLoading.value = false
  }
}

const loadTemplates = async () => {
  templateLoading.value = true
  try {
    templates.value = await ReagentApi.getLabelTemplates()
    const cachedTemplateCode = window.localStorage.getItem(templateStorageKey())
    const cachedTemplate = templates.value.find((item) => item.code === cachedTemplateCode)
    if (cachedTemplate) {
      printForm.templateCode = cachedTemplate.code
      return
    }
    if (!printForm.templateCode) {
      const firstTemplate = templates.value[0]
      printForm.templateCode = firstTemplate?.code || ''
      if (firstTemplate) {
        cacheTemplateSelection(firstTemplate.code)
      }
    }
  } finally {
    templateLoading.value = false
  }
}

const printerNameOf = (printerId?: number) => printers.value.find((item) => item.id === printerId)?.name || `打印机 #${printerId ?? '-'}`
const templateNameOf = (templateCode?: string) => templates.value.find((item) => item.code === templateCode)?.name || templateCode || '-'
const formatHistoryTime = (time?: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
const jobStatusText = (status?: number) => {
  const map: Record<number, string> = { 0: '待领取', 1: '已领取', 2: '打印中', 3: '成功', 4: '失败', 5: '已取消' }
  return map[status ?? -1] || '未知'
}
const jobStatusTagType = (status?: number) => {
  const map: Record<number, string> = { 0: 'info', 1: 'warning', 2: 'warning', 3: 'success', 4: 'danger', 5: 'info' }
  return map[status ?? -1] || 'info'
}

const openPrintHistory = async () => {
  historyVisible.value = true
  historyLoading.value = true
  try {
    const [jobs] = await Promise.all([
      ReagentApi.getRecentLabelPrintJobs(),
      loadPrinters(),
      loadTemplates()
    ])
    printHistory.value = jobs
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  loadPrinters()
  loadTemplates()
})

/** 存储条件多选（值存 printForm.storageCondition，逗号拼接打印到标签） */
const storageConditionArr = computed({
  get: () => (printForm.storageCondition ? String(printForm.storageCondition).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
  set: (v: string[]) => {
    printForm.storageCondition = v.join(',')
  }
})

/** 今天日期 YYYY-MM-DD */
const today = () => dayjs().format('YYYY-MM-DD')

const resetPrintForm = () => {
  // 接收人默认当前用户昵称
  const user = userStore.getUser
  Object.assign(printForm, {
    printerId: printForm.printerId,
    templateCode: printForm.templateCode,
    copies: 1,
    name: '',
    basId: '',
    batchNo: '',
    storageCondition: '',
    storageLocation: '',
    expireDate: '',
    receiverId: user?.id,
    receiverName: user?.nickname || '',
    receiveDate: today(),
    remark: ''
  })
}

const onCurrentChange = (row: ReagentApi.ReagentLabelPrintVO) => {
  if (!row) return
  selectedRow.value = row
  // 选择另一条试剂时按默认值重新带入，避免把上一条的手工修改误打到新批次。
  resetPrintForm()
  Object.assign(printForm, {
    name: row.name ?? '',
    basId: stripLabelBasIdPrefix(row.basId),
    batchNo: row.batchNo ?? '',
    storageLocation: row.storageLocation ?? '',
    expireDate: row.expireDate ?? ''
  })
}

/** 标签上的 BASID 不显示来源区域前缀（NB-/SH-，不区分大小写）。 */
const stripLabelBasIdPrefix = (value?: string) => (value || '').replace(/^(?:NB|SH)-/i, '')

/** UserSelectV2 选中回调：取用户昵称 */
const onReceiverChange = (item: any) => {
  printForm.receiverName = item?.nickname || item?.username || ''
}

/** 导出旧版 Excel 键值对表格；不再作为 PT-P900 的正式打印链路。 */
const handlePrint = async () => {
  try {
    const res = await ReagentApi.printLabelPrint(printForm)
    downloadBlob(res, `试剂标签-${printForm.basId || 'label'}.xlsx`)
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

/** 创建任务，由对应 Windows 打印代理主动领取并调用 Brother b-PAC。 */
const handleLabelPrint = async () => {
  if (!selectedRow.value) {
    message.warning('请先查询并选择批次')
    return
  }
  if (!printForm.printerId) {
    message.warning('请选择在线的标签打印机')
    return
  }
  const selectedPrinter = printers.value.find((item) => item.id === printForm.printerId)
  if (!selectedPrinter || selectedPrinter.onlineStatus !== 1) {
    message.warning('当前记住的标签打印机离线，请选择一台在线打印机')
    return
  }
  if (!printForm.templateCode) {
    message.warning('请选择标签模板')
    return
  }
  const printerName = selectedPrinter.name
  const templateName = templates.value.find((item) => item.code === printForm.templateCode)?.name || printForm.templateCode
  try {
    await message.confirm(`确认向“${printerName}”提交 ${printForm.copies} 份“${templateName}”标签吗？提交后将由现场标签机实际出纸。`)
  } catch {
    return
  }
  jobSubmitting.value = true
  try {
    const { printerId, templateCode, copies, receiverId: _receiverId, ...label } = printForm
    const jobId = await ReagentApi.createLabelPrintJob({ printerId, templateCode, copies, label })
    message.success(`打印任务已提交（任务 ID：${jobId}）`)
  } catch {
    message.error('提交打印任务失败')
  } finally {
    jobSubmitting.value = false
  }
}
</script>

<style scoped>
.section-title {
  font-weight: bold;
  font-size: 15px;
  white-space: nowrap;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.label-print-notice {
  width: auto;
  flex: 1;
  min-width: 0;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}

.result-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
