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
      <div class="section-title">查询结果（点击选择要打印的批次）</div>
      <el-table
        v-loading="queryLoading"
        :data="resultList"
        highlight-current-row
        @current-change="onCurrentChange"
      >
        <el-table-column label="名称" prop="name" min-width="200" show-overflow-tooltip />
        <el-table-column label="BASID" prop="basId" width="180" />
        <el-table-column label="批号" prop="batchNo" width="160" />
        <el-table-column label="过期日期" prop="expireDate" width="140" />
      </el-table>
    </ContentWrap>

    <!-- ============ 打印标签表单 ============ -->
    <ContentWrap v-if="selectedRow">
      <div class="section-title">打印标签信息</div>
      <el-form :model="printForm" label-width="100px" style="max-width: 640px">
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
          <el-select v-model="printForm.storageCondition" placeholder="请选择存储条件" clearable style="width: 100%">
            <el-option
              v-for="dict in getStrDictOptions(DICT_TYPE.REAGENT_STORAGE_CONDITION)"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
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
        <el-button v-hasPermi="['reagent:label-print:print']" type="primary" @click="handlePreview">
          <Icon icon="ep:printer" />打印
        </el-button>
        <el-button v-hasPermi="['reagent:label-print:print']" type="primary" plain @click="handleLabelPreview">
          <Icon icon="ep:tickets" />打印标签
        </el-button>
      </div>
    </ContentWrap>

    <!-- ============ 打印预览弹窗 ============ -->
    <el-dialog v-model="previewVisible" title="试剂标签打印预览" width="620px" destroy-on-close>
      <table class="print-table">
        <tbody>
          <tr v-for="(item, index) in printRows" :key="index">
            <th>{{ item.label }}</th>
            <td>{{ item.value }}</td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <el-button @click="previewVisible = false">关 闭</el-button>
        <el-button type="primary" :loading="printLoading" @click="handlePrint">打 印</el-button>
      </template>
    </el-dialog>

    <!-- ============ 标签打印弹窗（36mm，浏览器打印到 PT-P900） ============ -->
    <el-dialog v-model="labelVisible" title="标签预览（36mm）" width="560px" destroy-on-close>
      <div class="label-preview-wrap">
        <div id="labelPrintArea" class="label-sheet">
          <div class="label-row"><span class="label-key">Name:</span><span class="label-val">{{ printForm.name }}</span></div>
          <div class="label-row"><span class="label-key">BASID:</span><span class="label-val">{{ printForm.basId }}</span></div>
          <div class="label-row"><span class="label-key">LOT:</span><span class="label-val">{{ printForm.batchNo }}</span></div>
          <div class="label-row"><span class="label-key">Storage condition(unopen):</span><span class="label-val">{{ printForm.storageCondition }}</span></div>
          <div class="label-row"><span class="label-key">Received date:</span><span class="label-val">{{ printForm.receiveDate }}</span></div>
          <div class="label-row"><span class="label-key">Received by:</span><span class="label-val">{{ printForm.receiverName }}</span></div>
          <div class="label-row"><span class="label-key">Exp.Date(unopen):</span><span class="label-val">{{ printForm.expireDate }}</span></div>
          <div class="label-row"><span class="label-key">Remark:</span><span class="label-val">{{ printForm.remark }}</span></div>
        </div>
      </div>
      <div class="label-tip">打印时务必：① 选择 PT-P900；② 更多设置 → 纸张尺寸选「shijibiaoqian」（1.4in × 1.18in）；③ 取消「页眉和页脚」；④ 缩放 100%。纸张不对会出现空白/裁切。</div>
      <template #footer>
        <el-button @click="labelVisible = false">关 闭</el-button>
        <el-button type="primary" @click="handleLabelPrint">打 印</el-button>
      </template>
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
const queryParams = reactive({ basId: '' })
const resultList = ref<ReagentApi.ReagentLabelPrintVO[]>([])
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
  queryLoading.value = true
  try {
    resultList.value = await ReagentApi.getLabelPrintByBasId(basId)
    selectedRow.value = null
    resetPrintForm()
    if (resultList.value.length === 0) {
      message.warning('未查询到相关数据')
    } else {
      // 默认选中第一条，方便直接进入打印
      onCurrentChange(resultList.value[0])
    }
  } finally {
    queryLoading.value = false
  }
}

const resetQuery = () => {
  queryParams.basId = ''
  resultList.value = []
  selectedRow.value = null
  resetPrintForm()
}

// ==================== 打印表单 ====================
const printForm = reactive({
  name: '',
  basId: '',
  batchNo: '',
  storageCondition: '',
  expireDate: '',
  receiverId: undefined as number | undefined,
  receiverName: '',
  receiveDate: '',
  remark: ''
})

/** 今天日期 YYYY-MM-DD */
const today = () => dayjs().format('YYYY-MM-DD')

const resetPrintForm = () => {
  // 接收人默认当前用户昵称
  const user = userStore.getUser
  Object.assign(printForm, {
    name: '',
    basId: '',
    batchNo: '',
    storageCondition: '',
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
  Object.assign(printForm, {
    name: row.name ?? '',
    basId: row.basId ?? '',
    batchNo: row.batchNo ?? '',
    expireDate: row.expireDate ?? ''
  })
}

/** UserSelectV2 选中回调：取用户昵称 */
const onReceiverChange = (item: any) => {
  printForm.receiverName = item?.nickname || item?.username || ''
}

// ==================== 打印预览 ====================
const previewVisible = ref(false)
const printLoading = ref(false)

/** 打印表格：每一行一个键值对，键和值各占一个单元格 */
const printRows = computed(() => [
  { label: 'Name:', value: printForm.name },
  { label: 'BASID:', value: printForm.basId },
  { label: 'LOT:', value: printForm.batchNo },
  { label: 'Storage condition(unopen):', value: printForm.storageCondition },
  { label: 'Received date:', value: printForm.receiveDate },
  { label: 'Received by:', value: printForm.receiverName },
  { label: 'Exp.Date(unopen):', value: printForm.expireDate },
  { label: 'Remark:', value: printForm.remark }
])

const handlePreview = async () => {
  if (!selectedRow.value) {
    message.warning('请先查询并选择批次')
    return
  }
  previewVisible.value = true
}

/** 打印：调用后端生成 Excel 键值对表格并下载 */
const handlePrint = async () => {
  printLoading.value = true
  try {
    const res = await ReagentApi.printLabelPrint(printForm)
    downloadBlob(res, `试剂标签-${printForm.basId || 'label'}.xlsx`)
    message.success('打印文件下载中')
    previewVisible.value = false
  } catch {
    message.error('打印失败')
  } finally {
    printLoading.value = false
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

// ==================== 标签打印（36mm，浏览器打印到 PT-P900） ====================
const labelVisible = ref(false)

const handleLabelPreview = () => {
  if (!selectedRow.value) {
    message.warning('请先查询并选择批次')
    return
  }
  labelVisible.value = true
}

/** 打印标签：window.print() 只输出 #labelPrintArea（见 @media print 样式）
 *  注意：标签高度用固定值（30mm，与自定义纸张 shijibiaoqian 高度一致），不要用内容动态高度——
 *  过小的 @page 会被 Chrome 回退成默认纸张，导致空白/裁切 */
const handleLabelPrint = () => {
  window.print()
}
</script>

<style scoped>
.section-title {
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 12px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
}

.print-table th,
.print-table td {
  border: 1px solid #dcdfe6;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
}

.print-table th {
  width: 120px;
  background: #f5f7fa;
  font-weight: bold;
  color: #303133;
}

/* ============ 36mm 标签 ============ */
.label-preview-wrap {
  display: inline-block;
  padding: 6px;
  background: #fff;
  border: 1px dashed #c0c4cc;
}

.label-sheet {
  width: 1.26in; /* ≈32mm，36mm 纸两侧各有 ~2mm 不可打印区，内容收窄到可打印区避免右边被裁 */
  box-sizing: border-box;
  padding: 0.6mm 2mm;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 1.8mm;
  line-height: 1.1;
  color: #000;
  background: #fff;
}

.label-row {
  padding: 0.15mm 0;
}

.label-key {
  font-weight: 600;
}

.label-val {
  word-break: break-all;
}

.label-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>

<style>
/* 标签打印：只输出 #labelPrintArea，其余隐藏（用于 window.print()） */
@media print {
  body * {
    visibility: hidden !important;
  }
  #labelPrintArea,
  #labelPrintArea * {
    visibility: visible !important;
  }
  #labelPrintArea {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 1.26in !important; /* 收窄到可打印区，右边不被裁 */
    border: none !important;
    box-shadow: none !important;
  }
}
@page {
  /* 纸张 1.4in × 1.37in（宽×长），landscape 强制横向，避免被旋转成纵向导致第一行被裁 */
  size: 1.4in 1.37in landscape;
  margin: 0;
}
</style>
