<template>
  <ContentWrap>
    <el-radio-group v-model="query.view" @change="search" class="mb-16px">
      <el-radio-button value="ALL">全部需求</el-radio-button>
      <el-radio-button value="MINE">我的预约</el-radio-button>
      <el-radio-button value="TODAY">今日到期</el-radio-button>
    </el-radio-group>
    <el-form :inline="true" @submit.prevent="search">
      <el-form-item label="关键词"
        ><el-input
          v-model="query.keyword"
          clearable
          placeholder="临床方案、BAS、检测项或备注"
          @keydown.enter="searchOnEnter"
          @clear="search"
      /></el-form-item>
      <el-form-item label="预约人"
        ><el-input
          v-model="query.contacts"
          clearable
          class="!w-150px"
          @keydown.enter="searchOnEnter"
          @clear="search"
      /></el-form-item>
      <el-form-item label="入库地点">
        <el-select v-model="query.inboundSite" class="!w-140px" @change="search">
          <el-option label="全部" value="ALL" />
          <el-option label="宁波" value="NINGBO" />
          <el-option label="上海" value="SHANGHAI" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable class="!w-140px" @change="search">
          <el-option v-for="(s, i) in statuses" :key="i" :label="s" :value="i" />
        </el-select>
      </el-form-item>
      <el-form-item label="逾期情况">
        <el-select
          :model-value="query.view === 'OVERDUE' ? 'OVERDUE' : ''"
          clearable
          placeholder="全部"
          class="!w-140px"
          @change="changeOverdueFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="已逾期" value="OVERDUE" />
        </el-select>
      </el-form-item>
      <el-form-item
        ><el-button type="primary" native-type="submit" :loading="loading">搜索</el-button
        ><el-button @click="reset">重置</el-button></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <div class="mb-16px flex justify-between items-center">
      <el-button v-hasPermi="['reagent:sample-urgent:create']" type="primary" @click="openCreate"
        ><Icon icon="ep:plus" class="mr-4px" />登记加急需求</el-button
      >
      <div
        ><el-button :loading="loading" @click="getList">刷新</el-button
        ><el-button :loading="exporting" :disabled="loading || !total" @click="exportCsv"
          >导出查询结果</el-button
        ></div
      >
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      :row-class-name="rowClass"
      row-key="id"
      @row-dblclick="(row) => openDetail(row.id)"
    >
      <template #empty
        ><el-empty :description="listError ? '加载失败，请重试' : '暂无加急需求'" :image-size="70"
          ><el-button v-if="listError" @click="getList">重新加载</el-button></el-empty
        ></template
      >
      <el-table-column label="登记编号" width="110"
        ><template #default="{ row }">{{ row.id }}</template></el-table-column
      >
      <el-table-column
        label="临床方案编号"
        prop="projectNo"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="BAS号" prop="basNos" min-width="190" show-overflow-tooltip />
      <el-table-column label="检测项" prop="sampleScope" min-width="190" show-overflow-tooltip />
      <el-table-column label="入库地点" width="100">
        <template #default="{ row }">{{ siteName(row.inboundSite) }}</template>
      </el-table-column>
      <el-table-column label="预约入库时间" width="185">
        <template #default="{ row }"
          ><div :class="overdue(row) ? 'text-red-500' : ''">{{ fmt(row.deadline) }}</div
          ><el-tag v-if="overdue(row)" type="danger" size="small">已逾期</el-tag></template
        >
      </el-table-column>
      <el-table-column label="预约人" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{
          row.appointmentUserIds?.length ? row.contacts : '待确认'
        }}</template>
      </el-table-column>
      <el-table-column label="状态" width="125"
        ><template #default="{ row }"
          ><el-tag :type="statusType(row.status)">{{ statuses[row.status] }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="异常情况" min-width="150" show-overflow-tooltip
        ><template #default="{ row }"
          ><span :class="row.exceptionType !== 'NONE' ? 'text-orange-500' : ''"
            >{{ exceptionLabel(row.exceptionType) }} {{ row.exceptionNote }}</span
          ></template
        ></el-table-column
      >
      <el-table-column label="处理人" prop="handlerName" width="100" />
      <el-table-column label="提交人" prop="requesterName" width="100" />
      <el-table-column label="操作" fixed="right" width="210"
        ><template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">{{
            row.status < 4
              ? '处理'
              : '详情'
          }}</el-button>
          <el-button v-if="canEdit(row)" link type="primary" @click="openEdit(row.id)"
            >修改</el-button
          >
          <el-button
            v-if="canDelete(row)"
            link
            type="danger"
            :loading="deletingId === row.id"
            :disabled="deletingId !== undefined && deletingId !== row.id"
            @click="deleteRow(row)"
            >删除</el-button
          >
        </template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="getList"
    />
  </ContentWrap>

  <el-dialog
    v-model="editVisible"
    :title="form.id ? '修改加急需求' : '登记加急需求'"
    width="min(760px, 96vw)"
    :close-on-click-modal="true"
    :before-close="beforeEditClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      :disabled="saving"
      scroll-to-error
      @submit.prevent="save"
    >
      <el-form-item label="临床方案" prop="projectNo">
        <el-select
          v-model="form.projectNo"
          filterable
          remote
          allow-create
          default-first-option
          clearable
          class="!w-full"
          placeholder="搜索临床方案编号，也可直接输入新编号"
          :remote-method="searchClinicalOptions"
          :loading="clinicalLoading"
          @visible-change="onClinicalVisible"
          @change="onClinicalChange"
        >
          <el-option
            v-for="c in clinicalSelectOptions"
            :key="`${c.id}-${c.number}`"
            :label="c.number"
            :value="c.number"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="新项目">
        <el-switch v-model="form.newProject" />
      </el-form-item>
      <el-form-item
        label="BAS号"
        prop="basNos"
        required
        :rules="[{ validator: validateBas, trigger: ['change'] }]"
      >
        <el-select
          v-model="basItems"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          clearable
          class="!w-full"
          placeholder="搜索/选择 BAS 号，可输入后缀（如 22BAS0055-Blind）"
          :remote-method="searchItemOptions"
          :loading="itemLoading"
          @visible-change="onItemVisible"
        >
          <el-option v-for="v in basSelectOptions" :key="v" :label="v" :value="v" />
        </el-select>
      </el-form-item>
      <el-form-item label="检测项" prop="sampleScope">
        <el-select
          v-model="detectionItems"
          multiple
          filterable
          allow-create
          default-first-option
          clearable
          class="!w-full"
          placeholder="选择检测项，也可直接输入"
        >
          <el-option v-for="item in detectionOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="入库地点" prop="inboundSite">
        <el-radio-group v-model="form.inboundSite">
          <el-radio value="SHANGHAI">上海</el-radio>
          <el-radio value="NINGBO">宁波</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="预约入库时间" prop="deadline">
        <el-date-picker
          v-model="form.deadline"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择具体日期和时分"
        />
        <div class="mt-8px flex flex-wrap gap-8px w-full">
          <el-button
            v-for="shortcut in deadlineShortcuts"
            :key="shortcut.label"
            size="small"
            :disabled="shortcutTime(shortcut).valueOf() <= now"
            @click="selectDeadlineShortcut(shortcut)"
            >{{ shortcut.label }}</el-button
          >
        </div>
      </el-form-item>
      <el-form-item label="预约人" prop="appointmentUserIds">
        <el-select
          v-model="form.appointmentUserIds"
          :multiple-limit="20"
          multiple
          filterable
          class="!w-full"
          placeholder="搜名字选择预约人"
          :loading="optionsLoading"
          @visible-change="loadAppointmentUsers"
        >
          <el-option
            v-for="person in appointmentOptions"
            :key="person.id"
            :label="person.name"
            :value="person.id"
          />
        </el-select>
        <el-text v-if="editingLegacyContacts" type="info" size="small"
          >原联系人：{{ editingLegacyContacts }}，请确认预约人</el-text
        >
      </el-form-item>
      <el-form-item label="样本接收时间">
        <el-date-picker
          v-model="form.sampleReceivedTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择日期和时间"
          clearable
        />
      </el-form-item>
      <el-form-item label="备注"
        ><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="4000"
      /></el-form-item>
      <el-form-item v-if="form.id" label="修改原因" prop="changeReason"
        ><el-input
          v-model="form.changeReason"
          type="textarea"
          maxlength="1000"
          placeholder="请输入修改原因"
      /></el-form-item>
    </el-form>
    <template #footer
      ><el-button :disabled="saving" @click="beforeEditClose(() => (editVisible = false))"
        >取消</el-button
      ><el-button type="primary" :loading="saving" @click="save">{{
        form.id ? '保存修改' : '提交需求'
      }}</el-button></template
    >
  </el-dialog>

  <el-drawer
    v-model="detailVisible"
    title="加急入库详情"
    size="min(920px, 100vw)"
    :close-on-click-modal="true"
    :before-close="beforeDetailClose"
    @closed="onDetailClosed"
    class="urgent-drawer"
  >
    <div v-loading="detailLoading">
      <el-result v-if="detailError" icon="error" title="详情加载失败"
        ><template #extra
          ><el-button @click="openDetail(detailId, true)">重新加载</el-button></template
        ></el-result
      >
      <template v-if="detail">
        <div class="mb-16px flex gap-12px items-center"
          ><strong>{{ detail.id }} · {{ detail.projectNo }}</strong
          ><el-tag :type="statusType(detail.status)">{{ statuses[detail.status] }}</el-tag
          ><el-tag v-if="overdue(detail)" type="danger">已逾期</el-tag></div
        >
        <div class="detail-summary"
          ><span>预约入库：{{ fmt(detail.deadline) }}</span
          ><span>预约人：{{ detail.appointmentUserIds?.length ? detail.contacts : '待确认' }}</span
          ><div>{{ detail.sampleScope }}</div></div
        >
        <el-tabs v-model="drawerTab">
          <el-tab-pane label="需求信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="BAS号" :span="2"
                >{{ detail.basNos || '未填写' }}
                {{ detail.newProject ? '（新项目）' : '' }}</el-descriptions-item
              >
              <el-descriptions-item label="检测项" :span="2">{{
                detail.sampleScope
              }}</el-descriptions-item>
              <el-descriptions-item label="入库地点">
                {{ siteName(detail.inboundSite) }}
              </el-descriptions-item>
              <el-descriptions-item label="预约入库时间">{{
                fmt(detail.deadline)
              }}</el-descriptions-item>
              <el-descriptions-item
                v-if="detail.expectedArrival || detail.plannedTestTime"
                label="原到样 / 检测计划"
                >{{ fmt(detail.expectedArrival) }} /
                {{ fmt(detail.plannedTestTime) }}</el-descriptions-item
              >
              <el-descriptions-item label="预约人">{{
                detail.appointmentUserIds?.length ? detail.contacts : '待确认'
              }}</el-descriptions-item>
              <el-descriptions-item label="样本接收时间">
                {{ fmt(detail.sampleReceivedTime) }}
              </el-descriptions-item>
              <el-descriptions-item label="通知样品管理员" :span="2">{{
                detail.noticeNames || '使用钉钉模板默认接收范围'
              }}</el-descriptions-item>
              <el-descriptions-item v-if="detail.legacyContacts" label="原联系人">{{
                detail.legacyContacts
              }}</el-descriptions-item>
              <el-descriptions-item v-if="detail.reason" label="原加急原因" :span="2">{{
                detail.reason
              }}</el-descriptions-item>
              <el-descriptions-item v-if="detail.logisticsNo" label="原物流单号">{{
                detail.logisticsNo || '—'
              }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{
                detail.remark || '—'
              }}</el-descriptions-item>
              <el-descriptions-item label="提交人 / 时间"
                >{{ detail.requesterName }} / {{ fmt(detail.createTime) }}</el-descriptions-item
              >
              <el-descriptions-item label="当前处理人">{{
                detail.handlerName || '尚未接手'
              }}</el-descriptions-item>
              <el-descriptions-item label="已完成范围" :span="2">{{
                detail.completedScope || '—'
              }}</el-descriptions-item>
              <el-descriptions-item label="剩余范围" :span="2">{{
                detail.remainingScope || '—'
              }}</el-descriptions-item>
              <el-descriptions-item label="异常情况" :span="2"
                >{{ exceptionLabel(detail.exceptionType) }}
                {{ detail.exceptionNote }}</el-descriptions-item
              >
              <el-descriptions-item v-if="detail.completedTime" label="实际入库时间">{{
                fmt(detail.completedTime)
              }}</el-descriptions-item>
            </el-descriptions>
            <div class="my-16px flex gap-12px">
              <el-button v-if="canEdit(detail)" @click="openEdit(detail.id)">修改需求</el-button>
              <el-button
                v-if="canEdit(detail)"
                type="danger"
                plain
                :loading="acting"
                @click="cancel"
                >取消需求</el-button
              >
            </div>
          </el-tab-pane>
          <el-tab-pane v-if="canProcess" label="处理进度" name="process">
            <el-form
              ref="progressRef"
              :model="progress"
              :rules="progressRules"
              label-width="110px"
              :disabled="acting"
              scroll-to-error
              @submit.prevent="submitProgress"
            >
              <el-form-item label="处理进度"
                ><el-radio-group v-model="progress.status"
                  ><el-radio :value="1" :disabled="detail.status === 2">处理中</el-radio
                  ><el-radio :value="2">部分入库</el-radio
                  ><el-radio :value="3">全部完成</el-radio></el-radio-group
                ></el-form-item
              >
              <el-form-item label="异常类型"
                ><el-select v-model="progress.exceptionType"
                  ><el-option
                    v-for="e in exceptions"
                    :key="e.value"
                    :label="e.label"
                    :value="e.value" /></el-select
              ></el-form-item>
              <el-form-item
                v-if="progress.exceptionType !== 'NONE'"
                label="异常说明"
                prop="exceptionNote"
                ><el-input
                  v-model="progress.exceptionNote"
                  type="textarea"
                  maxlength="4000"
                  placeholder="请输入异常说明"
              /></el-form-item>
              <el-form-item label="已完成范围" prop="completedScope"
                ><el-input
                  v-model="progress.completedScope"
                  type="textarea"
                  maxlength="4000"
                  placeholder="请输入累计已完成的样品范围"
              /></el-form-item>
              <el-form-item v-if="progress.status === 2" label="剩余范围" prop="remainingScope"
                ><el-input
                  v-model="progress.remainingScope"
                  type="textarea"
                  maxlength="4000"
                  placeholder="请输入尚未完成的样品范围"
              /></el-form-item>
              <el-form-item
                v-if="progress.status === 3"
                label="实际入库时间"
                prop="completedTime"
                ><el-date-picker
                  v-model="progress.completedTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="填写实际完成时间"
                /><el-button
                  class="ml-8px"
                  @click="progress.completedTime = dayjs().format('YYYY-MM-DD HH:mm:ss')"
                  >现在</el-button
                ></el-form-item
              >
              <el-form-item label="本次说明"
                ><el-input v-model="progress.content" type="textarea" maxlength="4000"
              /></el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="处理记录" name="history">
            <template v-if="isParty(detail) || canHandle">
              <el-input
                v-model="comment"
                type="textarea"
                :rows="3"
                maxlength="4000"
                placeholder="请输入补充说明或异常回复"
                :disabled="acting"
              />
            </template>
            <el-divider content-position="left">处理记录</el-divider>
            <el-timeline class="mt-20px">
              <el-timeline-item
                v-for="log in logs"
                :key="log.id"
                :timestamp="fmt(log.createTime)"
                placement="top"
              >
                <div
                  ><strong>{{ log.operatorName }}</strong> · {{ log.action }}</div
                >
                <div class="log-content">{{ log.content }}</div>
              </el-timeline-item>
            </el-timeline>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
    <template #footer
      ><div class="drawer-footer"
        ><el-button :disabled="acting || detailLoading" @click="openDetail(detailId)"
          >刷新</el-button
        ><div
          ><el-button :disabled="acting" @click="beforeDetailClose(() => (detailVisible = false))"
            >关闭</el-button
          ><el-button
            v-if="drawerTab === 'process' && canProcess"
            type="primary"
            :loading="acting || confirmingProgress"
            :disabled="detailLoading || !progressDirty"
            @click="submitProgress"
            >保存进度</el-button
          ><el-button
            v-if="drawerTab === 'history' && detail && (isParty(detail) || canHandle)"
            type="primary"
            :loading="acting"
            :disabled="detailLoading || !comment.trim()"
            @click="submitComment"
            >提交说明</el-button
          ></div
        ></div
      ></template
    >
  </el-drawer>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as Api from '@/api/reagent/sampleUrgent'
import * as BasicDataApi from '@/api/reagent/basicData'
import type { UrgentRecord, UrgentSave, UrgentLog, UrgentAction } from '@/api/reagent/sampleUrgent'
import { useUserStore } from '@/store/modules/user'
import { checkPermi } from '@/utils/permission'
import { useRoute, onBeforeRouteLeave } from 'vue-router'

defineOptions({ name: 'ReagentSampleUrgent' })
const message = useMessage()
const store = useUserStore()
const route = useRoute()
const userId = computed(() => store.getUser.id)
const canHandle = computed(() => checkPermi(['reagent:sample-urgent:handle']))
const statuses = ['待处理', '处理中', '部分入库', '已入库', '已取消']
const exceptions = [
  { value: 'NONE', label: '无异常' },
  { value: 'NOT_ARRIVED', label: '未收到样品' },
  { value: 'WAIT_REPLY', label: '等待回复/补资料' },
  { value: 'SAMPLE_ISSUE', label: '样品问题' },
  { value: 'DELAY', label: '预计延期' },
  { value: 'OTHER', label: '其他异常' }
]
const exceptionLabel = (value: string) => exceptions.find((e) => e.value === value)?.label || value
const statusType = (s: number): 'info' | 'primary' | 'warning' | 'success' =>
  (['info', 'primary', 'warning', 'success', 'info'] as const)[s] || 'info'
const fmt = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—')
const now = ref(dayjs().valueOf())
let timer: ReturnType<typeof setInterval> | undefined
const siteName = (site: UrgentSave['inboundSite']) => {
  if (site === 'SHANGHAI') return '上海'
  if (site === 'NINGBO') return '宁波'
  return '—'
}
const overdue = (row: UrgentRecord) => row.status < 3 && dayjs(row.deadline).valueOf() < now.value
const rowClass = ({ row }: { row: UrgentRecord }) => (overdue(row) ? 'urgent-overdue' : '')
const canEdit = (row: UrgentRecord) =>
  isParty(row) && row.status < 3 && checkPermi(['reagent:sample-urgent:update'])
const canDelete = (row: UrgentRecord) =>
  isParty(row) && checkPermi(['reagent:sample-urgent:update'])
const deletingId = ref<number>()
const deleteRow = async (row: UrgentRecord) => {
  if (deletingId.value !== undefined || acting.value || saving.value) return
  if (detailId.value === row.id && !(await confirmDiscard(detailDirty.value))) return
  deletingId.value = row.id
  try {
    await ElMessageBox.confirm(`确认删除单据编号 ${row.id}？待发送的通知将同时取消。`, '删除预约', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '返回'
    })
    await Api.deleteRecord(row.id, row.revision)
    message.success('已删除')
    if (detailId.value === row.id) {
      ++detailToken
      progressBaseline.value = ''
      comment.value = ''
      detail.value = undefined
      detailVisible.value = false
      detailLoading.value = false
    }
    if (list.value.length === 1 && query.pageNo > 1) query.pageNo--
    await getList()
  } catch {
    /* 取消确认或请求失败时保留列表，请求层负责提示错误。 */
  } finally {
    deletingId.value = undefined
  }
}
const defaults = () => ({
  pageNo: 1,
  pageSize: 20,
  keyword: '',
  contacts: '',
  inboundSite: 'ALL',
  status: undefined as number | undefined,
  view: 'ALL'
})
const query = reactive(defaults())
const appliedQuery = ref(defaults())
const loading = ref(false)
const listError = ref(false)
const list = ref<UrgentRecord[]>([])
const total = ref(0)
let queryToken = 0
const getList = async () => {
  const token = ++queryToken
  loading.value = true
  listError.value = false
  const params = { ...query, keyword: query.keyword.trim(), contacts: query.contacts.trim() }
  try {
    const res = await Api.getPage(params)
    if (token === queryToken) {
      list.value = res.list
      total.value = res.total
      appliedQuery.value = params
    }
  } catch {
    if (token === queryToken) {
      listError.value = true
      list.value = []
      total.value = 0
    }
  } finally {
    if (token === queryToken) loading.value = false
  }
}
const search = () => {
  query.pageNo = 1
  getList()
}
const changeOverdueFilter = (value: string) => {
  if (value === 'OVERDUE') query.view = 'OVERDUE'
  else if (query.view === 'OVERDUE') query.view = 'ALL'
  search()
}
const searchOnEnter = (event: KeyboardEvent) => {
  if (event.isComposing) return
  event.preventDefault()
  search()
}
const reset = () => {
  Object.assign(query, defaults())
  getList()
}
const editVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const formBaseline = ref('')
const isParty = (row: UrgentRecord) =>
  row.requesterId === userId.value || row.appointmentUserIds?.includes(userId.value)
const appointmentUsers = ref<Api.UrgentOptions['appointmentUsers']>()
const optionsLoading = ref(false)
const editingLegacyContacts = ref('')
const appointmentOptions = computed(() => {
  const names = form.value.contacts.split('、')
  const selected = form.value.appointmentUserIds.map((id, index) => ({
    id,
    name: id === userId.value ? store.getUser.nickname : names[index] || String(id)
  }))
  return [
    ...new Map(
      [...selected, ...(appointmentUsers.value || [])].map((person) => [person.id, person])
    ).values()
  ]
})
const loadAppointmentUsers = async (visible: boolean) => {
  if (!visible || appointmentUsers.value || optionsLoading.value) return
  optionsLoading.value = true
  try {
    appointmentUsers.value = (await Api.getSelectionOptions()).appointmentUsers
  } finally {
    optionsLoading.value = false
  }
}
const emptyForm = (): UrgentSave => ({
  projectNo: '',
  clinicalId: undefined,
  newProject: false,
  basNos: '',
  sampleScope: '',
  inboundSite: undefined,
  deadline: '',
  contacts: '',
  appointmentUserIds: [userId.value],
  noticeUserIds: [],
  noticeDeptIds: [],
  reason: '',
  logisticsNo: '',
  remark: ''
})
const form = ref<UrgentSave>(emptyForm())

// ==================== 临床方案 / BAS 下拉 ====================
const clinicalOptions = ref<BasicDataApi.ReagentClinicalOptionVO[]>([])
const clinicalLoading = ref(false)
const itemOptions = ref<BasicDataApi.ReagentItemOptionVO[]>([])
const itemLoading = ref(false)
const lastClinicalNo = ref('')
let clinicalSearchSeq = 0
let itemSearchSeq = 0

const searchClinicalOptions = async (keyword = '') => {
  const seq = ++clinicalSearchSeq
  clinicalLoading.value = true
  try {
    const list = await BasicDataApi.getClinicalOptions(keyword || undefined)
    if (seq === clinicalSearchSeq) clinicalOptions.value = list
  } catch {
    // 选项加载失败不阻断表单，仍可手工输入
  } finally {
    if (seq === clinicalSearchSeq) clinicalLoading.value = false
  }
}
const searchItemOptions = async (keyword = '') => {
  const seq = ++itemSearchSeq
  itemLoading.value = true
  try {
    const list = await BasicDataApi.getItemOptions({
      clinicalId: form.value.clinicalId,
      keyword: keyword || undefined
    })
    if (seq === itemSearchSeq) itemOptions.value = list
  } catch {
    // 选项加载失败不阻断表单，仍可手工输入
  } finally {
    if (seq === itemSearchSeq) itemLoading.value = false
  }
}
const onClinicalVisible = (visible: boolean) => {
  if (visible) searchClinicalOptions('')
}
const onItemVisible = (visible: boolean) => {
  if (visible) searchItemOptions('')
}
const basItems = computed({
  get: () =>
    form.value.basNos
      ? form.value.basNos
          .split(/[,，、;；\r\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  set: (items: string[]) => {
    form.value.basNos = items.join('、')
  }
})
const clinicalSelectOptions = computed(() => {
  const list = clinicalOptions.value.slice()
  const current = (form.value.projectNo || '').trim()
  if (current && !list.some((c) => c.number === current)) {
    list.unshift({ id: 0, name: current, number: current })
  }
  return list
})
const basSelectOptions = computed(() => {
  const list = itemOptions.value.map((i) => i.baseId).filter(Boolean)
  for (const value of basItems.value) {
    if (!list.includes(value)) list.unshift(value)
  }
  return [...new Set(list)]
})
const onClinicalChange = (number?: string) => {
  const changed = (number || '') !== lastClinicalNo.value
  lastClinicalNo.value = number || ''
  const clinical = clinicalOptions.value.find((c) => c.number === number)
  form.value.clinicalId = clinical?.id
  if (!changed) return
  form.value.basNos = ''
  searchItemOptions('')
}
const deadlineShortcuts = [
  { label: '今天下班前', days: 0, hour: 17, minute: 30 },
  { label: '明天中午', days: 1, hour: 12, minute: 0 },
  { label: '明天下班前', days: 1, hour: 17, minute: 30 },
  { label: '后天下班前', days: 2, hour: 17, minute: 30 }
]
const shortcutTime = (shortcut: (typeof deadlineShortcuts)[number]) =>
  dayjs()
    .add(shortcut.days, 'day')
    .hour(shortcut.hour)
    .minute(shortcut.minute)
    .second(0)
    .millisecond(0)
const selectDeadlineShortcut = (shortcut: (typeof deadlineShortcuts)[number]) => {
  const time = shortcutTime(shortcut)
  if (!time.isAfter(dayjs())) return message.warning('该时间已过，请选择其他时间')
  form.value.deadline = time.format('YYYY-MM-DD HH:mm:ss')
  formRef.value?.validateField('deadline').catch(() => {})
}
const detectionOptions = [
  '所有检测管',
  '所有样品',
  'PK检测管',
  'ADA检测管',
  'PD检测管',
  'PK1检测管',
  'PK2检测管',
  '备份管'
]
const detectionItems = computed({
  get: () => (form.value.sampleScope ? form.value.sampleScope.split('、').filter(Boolean) : []),
  set: (items: string[]) => {
    form.value.sampleScope = items.join('、')
  }
})
const validateBas = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  const hasBas = (value || '').split(/[,，、;；\r\n]+/).some((part) => part.trim())
  callback(!hasBas ? new Error('请填写 BAS 号') : undefined)
}
const rules: FormRules = {
  projectNo: [{ required: true, message: '请选择临床方案', trigger: 'change' }],
  sampleScope: [{ required: true, whitespace: true, message: '请填写检测项', trigger: 'blur' }],
  inboundSite: [{ required: true, message: '请选择入库地点', trigger: 'change' }],
  deadline: [{ required: true, message: '请选择预约入库时间', trigger: 'change' }],
  appointmentUserIds: [
    { type: 'array', required: true, min: 1, message: '请选择预约人', trigger: 'change' }
  ],
  changeReason: [{ required: true, whitespace: true, message: '请填写修改原因', trigger: 'blur' }]
}
const confirmDiscard = async (dirty: boolean) => {
  if (!dirty) return true
  try {
    await ElMessageBox.confirm('当前内容尚未保存，确定放弃修改？', '未保存的内容', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
    return true
  } catch {
    return false
  }
}
const editDirty = computed(
  () => editVisible.value && JSON.stringify(form.value) !== formBaseline.value
)
const beforeEditClose = async (done: () => void) => {
  if (!saving.value && (await confirmDiscard(editDirty.value))) done()
}
const openCreate = async () => {
  if (editVisible.value) return
  if (!(await confirmDiscard(detailDirty.value))) return
  editingLegacyContacts.value = ''
  form.value = emptyForm()
  lastClinicalNo.value = ''
  searchClinicalOptions('')
  searchItemOptions('')
  formBaseline.value = JSON.stringify(form.value)
  if (detailVisible.value) {
    if (progressBaseline.value) Object.assign(progress, JSON.parse(progressBaseline.value))
    comment.value = ''
  }
  editVisible.value = true
}
const openEdit = async (id: number) => {
  if (editVisible.value) return
  if (detailVisible.value && !(await confirmDiscard(detailDirty.value))) return
  try {
    const r = await Api.getRecord(id)
    if (!canEdit(r)) return message.warning('当前需求不可修改，请刷新列表')
    editingLegacyContacts.value = r.appointmentUserIds?.length ? '' : r.legacyContacts || r.contacts
    form.value = {
      ...r,
      appointmentUserIds: r.appointmentUserIds || [],
      noticeUserIds: r.noticeUserIds || [],
      noticeDeptIds: r.noticeDeptIds || [],
      inboundSite: r.inboundSite ?? undefined,
      deadline: dayjs(r.deadline).format('YYYY-MM-DD HH:mm:ss'),
      sampleReceivedTime: r.sampleReceivedTime
        ? dayjs(r.sampleReceivedTime).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      expectedArrival: r.expectedArrival
        ? dayjs(r.expectedArrival).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      plannedTestTime: r.plannedTestTime
        ? dayjs(r.plannedTestTime).format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      changeReason: ''
    }
    lastClinicalNo.value = form.value.projectNo || ''
    await searchClinicalOptions('')
    if (!form.value.clinicalId && form.value.projectNo) {
      const clinical = clinicalOptions.value.find((c) => c.number === form.value.projectNo)
      if (clinical) form.value.clinicalId = clinical.id
    }
    await searchItemOptions('')
    formBaseline.value = JSON.stringify(form.value)
    if (detailVisible.value && progressBaseline.value) {
      Object.assign(progress, JSON.parse(progressBaseline.value))
      comment.value = ''
    }
    editVisible.value = true
  } catch {
    /* 请求层已提示错误 */
  }
}
const save = async () => {
  if (saving.value) return
  saving.value = true
  try {
    if (!(await formRef.value?.validate().catch(() => false))) return
    const matchedClinical = clinicalOptions.value.find((c) => c.number === form.value.projectNo)
    if (matchedClinical) form.value.clinicalId = matchedClinical.id
    if (dayjs(form.value.deadline).isBefore(dayjs())) {
      await ElMessageBox.confirm(
        '预约入库时间已经过去，提交后将显示为逾期。是否继续？',
        '核实截止时间',
        { type: 'warning' }
      )
    }
    await Api.saveRecord({
      ...form.value,
      projectNo: (form.value.projectNo || '').trim(),
      contacts: form.value.contacts.trim(),
      sampleScope: form.value.sampleScope.trim(),
      reason: form.value.reason.trim(),
      sampleReceivedTime: form.value.sampleReceivedTime || undefined,
      expectedArrival: form.value.expectedArrival || undefined,
      plannedTestTime: form.value.plannedTestTime || undefined
    })
    message.success('已保存')
    formBaseline.value = JSON.stringify(form.value)
    editVisible.value = false
    await getList()
    if (detailVisible.value && detail.value?.id === form.value.id)
      await openDetail(form.value.id!, true)
  } catch {
    /* 保留表单，取消确认或请求失败均可继续编辑 */
  } finally {
    saving.value = false
  }
}
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref(false)
const detailId = ref(0)
const drawerTab = ref('info')
const progressRef = ref<FormInstance>()
const progressBaseline = ref('')
const detail = ref<UrgentRecord>()
const logs = ref<UrgentLog[]>([])
const acting = ref(false)
const comment = ref('')
const progress = reactive({
  status: 1,
  exceptionType: 'NONE',
  exceptionNote: '',
  completedScope: '',
  remainingScope: '',
  completedTime: '',
  content: ''
})
const progressDirty = computed(() => JSON.stringify(progress) !== progressBaseline.value)
const detailDirty = computed(
  () => detailVisible.value && !!detail.value && (progressDirty.value || !!comment.value.trim())
)
const beforeDetailClose = async (done: () => void) => {
  if (
    !acting.value &&
    !confirmingProgress.value &&
    !editVisible.value &&
    (await confirmDiscard(detailDirty.value))
  )
    done()
}
const onDetailClosed = () => {
  if (detailVisible.value) return
  ++detailToken
  detail.value = undefined
  logs.value = []
  comment.value = ''
  detailLoading.value = false
}
const progressRules = computed<FormRules>(() => ({
  exceptionNote: [
    {
      required: progress.exceptionType !== 'NONE',
      whitespace: true,
      message: '请填写异常说明',
      trigger: 'blur'
    }
  ],
  completedTime: [
    {
      validator: (_r, value, cb) => {
        if (progress.status !== 3) return cb()
        if (!value) return cb()
        if (detail.value && dayjs(value).isBefore(dayjs(detail.value.createTime)))
          return cb(new Error('实际入库时间不能早于提交时间'))
        cb()
      },
      trigger: 'change'
    }
  ]
}))
const canProcess = computed(() => detail.value && detail.value.status < 4)
let detailToken = 0
const openDetail = async (
  id: number,
  force = false,
  preserveProgress = false,
  preserveComment = false
) => {
  if (!id || (acting.value && !force)) return
  if (!force && !(await confirmDiscard(detailDirty.value))) return
  const previousTab = drawerTab.value
  const sameRecord = detail.value?.id === id
  const oldProgress = { ...progress }
  const oldComment = comment.value
  const token = ++detailToken
  detailId.value = id
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = false
  detail.value = undefined
  logs.value = []
  comment.value = ''
  try {
    const [r, history] = await Promise.all([Api.getRecord(id), Api.getLogs(id)])
    if (token !== detailToken) return
    detail.value = r
    logs.value = history
    Object.assign(progress, {
      status: r.status === 3 ? 3 : r.status === 2 ? 2 : 1,
      exceptionType: r.exceptionType,
      exceptionNote: r.exceptionNote || '',
      completedScope: r.completedScope || '',
      remainingScope: r.remainingScope || '',
      completedTime: r.completedTime ? dayjs(r.completedTime).format('YYYY-MM-DD HH:mm:ss') : '',
      content: ''
    })
    progressBaseline.value = JSON.stringify(progress)
    if (sameRecord && preserveProgress) Object.assign(progress, oldProgress)
    if (sameRecord && preserveComment) comment.value = oldComment
    drawerTab.value =
      sameRecord && (previousTab !== 'process' || canProcess.value)
        ? previousTab
        : canProcess.value
          ? 'process'
          : 'info'
    await nextTick()
    progressRef.value?.clearValidate()
  } catch {
    if (token === detailToken) detailError.value = true
  } finally {
    if (token === detailToken) detailLoading.value = false
  }
}
const perform = async (data: Omit<UrgentAction, 'id' | 'revision'>) => {
  if (!detail.value || acting.value) return
  const id = detail.value.id
  acting.value = true
  try {
    await Api.act({ id, revision: detail.value.revision, ...data })
    message.success('已保存')
    await Promise.all([
      openDetail(
        id,
        true,
        data.action === 'COMMENT',
        data.action !== 'COMMENT' && data.action !== 'CANCEL'
      ),
      getList()
    ])
    return true
  } catch {
    // 请求失败保留输入，版本冲突可通过“刷新”重新获取最新数据。
    return false
  } finally {
    acting.value = false
  }
}
const cancel = async () => {
  if (!(await confirmDiscard(detailDirty.value))) return
  try {
    const result = await ElMessageBox.prompt(
      '取消后将停止处理，已有进度仍保留。请填写原因：',
      '取消需求',
      { inputType: 'textarea', inputValidator: (value) => !!value?.trim() || '请填写取消原因' }
    )
    await perform({ action: 'CANCEL', content: result.value })
  } catch {
    /* 取消操作不报错 */
  }
}
const confirmingProgress = ref(false)
const submitProgress = async () => {
  if (acting.value || confirmingProgress.value) return
  confirmingProgress.value = true
  try {
    if (!(await progressRef.value?.validate().catch(() => false))) return
    if (progress.status === 3) {
      if (progress.exceptionType !== 'NONE') return message.warning('请先解决异常，再确认全部完成')
      await ElMessageBox.confirm('确认本次要求的全部样品范围均已完成入库？', '确认全部完成', {
        type: 'warning'
      })
    }
    await perform({
      action: 'PROGRESS',
      ...progress,
      remainingScope: progress.status === 2 ? progress.remainingScope.trim() : '',
      completedTime: progress.status === 3 ? progress.completedTime || undefined : undefined
    })
  } catch {
    /* 取消确认保留输入 */
  } finally {
    confirmingProgress.value = false
  }
}
const submitComment = () => {
  if (!comment.value.trim()) return message.warning('请填写说明')
  return perform({ action: 'COMMENT', content: comment.value })
}
const exporting = ref(false)
const exportCsv = async () => {
  if (exporting.value || loading.value || !total.value) return
  exporting.value = true
  try {
    const rows: UrgentRecord[] = []
    const params = { ...appliedQuery.value }
    for (let pageNo = 1; ; pageNo++) {
      const res = await Api.getPage({ ...params, pageNo, pageSize: 100 })
      if (res.total > 10000) throw new Error('导出超过10000条，请缩小查询范围')
      rows.push(...res.list)
      if (rows.length > 10000) throw new Error('导出超过10000条，请缩小查询范围')
      if (rows.length >= res.total || !res.list.length) break
    }
    const headers = [
      '登记编号',
      '临床方案编号',
      'BAS号',
      '检测项',
      '预约入库时间',
      '预约人',
      '通知样品管理员',
      '原联系人',
      '原加急原因',
      '预计到样时间',
      '计划检测时间',
      '物流单号',
      '备注',
      '状态',
      '异常类型',
      '异常说明',
      '已完成范围',
      '剩余范围',
      '实际入库时间',
      '提交人',
      '处理人',
      '提交时间'
    ]
    const cell = (v: unknown) => {
      let s = String(v ?? '')
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s
      return '"' + s.replace(/"/g, '""') + '"'
    }
    const data = rows.map((r) => [
      r.id,
      r.projectNo,
      r.basNos,
      r.sampleScope,
      fmt(r.deadline),
      r.appointmentUserIds?.length ? r.contacts : '',
      r.noticeNames,
      r.legacyContacts,
      r.reason,
      fmt(r.expectedArrival),
      fmt(r.plannedTestTime),
      r.logisticsNo,
      r.remark,
      statuses[r.status],
      exceptionLabel(r.exceptionType),
      r.exceptionNote,
      r.completedScope,
      r.remainingScope,
      fmt(r.completedTime),
      r.requesterName,
      r.handlerName,
      fmt(r.createTime)
    ])
    const blob = new Blob(
      ['\uFEFF' + [headers, ...data].map((r) => r.map(cell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8;' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `加急入库-${dayjs().format('YYYYMMDD-HHmm')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exporting.value = false
  }
}
const openLinkedRecord = () => {
  const id = Number(route.query.id)
  if (Number.isSafeInteger(id) && id > 0) openDetail(id)
}
onBeforeRouteLeave(async () => {
  if (saving.value || acting.value) return false
  const allowed = await confirmDiscard(editDirty.value || detailDirty.value)
  if (allowed) {
    editVisible.value = false
    detailVisible.value = false
  }
  return allowed
})
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (editDirty.value || detailDirty.value || saving.value || acting.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
watch(() => route.query.id, openLinkedRecord)
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  getList()
  openLinkedRecord()
  timer = setInterval(() => {
    now.value = dayjs().valueOf()
  }, 60000)
})
onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.log-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-top: 8px;
  color: var(--el-text-color-regular);
}
:deep(.urgent-overdue) {
  --el-table-tr-bg-color: var(--el-color-danger-light-9);
}
:deep(.el-descriptions__content) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  color: var(--el-text-color-regular);
}
.detail-summary > div {
  width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
:deep(.el-drawer__footer) {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 14px 20px;
}
:deep(.el-date-editor.el-input) {
  max-width: 100%;
}
</style>
