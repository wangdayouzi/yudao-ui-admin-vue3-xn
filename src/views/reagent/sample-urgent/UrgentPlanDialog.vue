<template>
  <el-dialog
    v-model="visible"
    title="周期预约计划"
    width="min(1200px, 96vw)"
    destroy-on-close
    @open="load"
  >
    <el-alert
      class="mb-16px"
      type="info"
      :closable="false"
      show-icon
      title="每个预约日自动生成当天单据，每单独立处理、独立判断逾期。"
      description="暂停、结束和调整周期只影响后续生成；已生成的单据保留。恢复时跳过暂停期间，不会重复生成今天的单据。"
    />
    <div class="mb-12px flex justify-end"
      ><el-button :loading="loading" @click="load">刷新</el-button></div
    >
    <el-table v-loading="loading" :data="list" row-key="id">
      <el-table-column label="计划编号" prop="id" width="100" />
      <el-table-column label="方案 / BAS号" min-width="190">
        <template #default="{ row }"
          ><div>{{ row.template.projectNo }}</div
          ><el-text size="small" type="info">{{ row.template.basNos }}</el-text></template
        >
      </el-table-column>
      <el-table-column label="预约规则" min-width="235">
        <template #default="{ row }">
          <div>{{ row.startDate }} ～ {{ row.endDate }}</div>
          <div>{{ repeatLabel(row.weekdays) }}，{{ row.dailyTime.slice(0, 5) }} 前</div>
        </template>
      </el-table-column>
      <el-table-column label="预约人" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.template.contacts }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }"
          ><el-tag :type="row.status === 0 ? 'success' : row.status === 1 ? 'warning' : 'info'">{{
            statusLabel(row)
          }}</el-tag></template
        >
      </el-table-column>
      <el-table-column label="下次生成 / 异常" min-width="180">
        <template #default="{ row }">
          <el-text v-if="row.lastError" type="danger">{{ row.lastError }}</el-text>
          <span v-else>{{ row.status === 0 ? row.nextDate : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewRecords(row.id)">查看单据</el-button>
          <template v-if="canManage(row) && row.status !== 2">
            <el-button link type="primary" :disabled="!!actingId" @click="openSchedule(row)"
              >调整周期</el-button
            >
            <el-button
              v-if="row.status === 0"
              link
              type="warning"
              :disabled="!!actingId"
              @click="action(row, 'PAUSE')"
              >暂停</el-button
            >
            <el-button
              v-else-if="!expired(row)"
              link
              type="primary"
              :disabled="!!actingId"
              @click="action(row, 'RESUME')"
              >恢复</el-button
            >
            <el-button link type="danger" :disabled="!!actingId" @click="action(row, 'END')"
              >结束</el-button
            >
          </template>
        </template>
      </el-table-column>
    </el-table>
    <div class="flow-root">
      <Pagination
        v-model:page="query.pageNo"
        v-model:limit="query.pageSize"
        :total="total"
        @pagination="load"
      />
    </div>
    <el-dialog
      v-model="scheduleVisible"
      title="调整后续预约周期"
      width="min(540px, 95vw)"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        :closable="false"
        class="mb-16px"
        title="已生成的单据保持原时间。调整只影响之后生成的单据。"
      />
      <el-form label-width="110px" :disabled="scheduleSaving">
        <el-form-item label="结束日期" required
          ><el-date-picker
            v-model="schedule.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledEndDate"
        /></el-form-item>
        <el-form-item label="重复星期" required
          ><el-checkbox-group v-model="schedule.weekdays"
            ><el-checkbox v-for="(label, index) in weekdays" :key="index" :value="index + 1">{{
              label
            }}</el-checkbox></el-checkbox-group
          ></el-form-item
        >
        <el-form-item label="每天截止时间" required
          ><el-time-picker v-model="schedule.dailyTime" value-format="HH:mm:ss" format="HH:mm"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :disabled="scheduleSaving" @click="scheduleVisible = false">取消</el-button
        ><el-button type="primary" :loading="scheduleSaving" @click="saveSchedule"
          >保存</el-button
        ></template
      >
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import * as Api from '@/api/reagent/sampleUrgent'
import type { UrgentPlan } from '@/api/reagent/sampleUrgent'
import { useUserStore } from '@/store/modules/user'
import { checkPermi } from '@/utils/permission'

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ viewRecords: [id: number]; changed: [] }>()
const message = useMessage()
const user = useUserStore()
const query = reactive({ pageNo: 1, pageSize: 10 })
const list = ref<UrgentPlan[]>([])
const total = ref(0)
const loading = ref(false)
const actingId = ref<number>()
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const repeatLabel = (days: number[]) =>
  days.length === 7 ? '每天' : days.map((d) => weekdays[d - 1]).join('、')
const expired = (row: UrgentPlan) => dayjs(row.endDate).isBefore(dayjs().startOf('day'))
const statusLabel = (row: UrgentPlan) =>
  row.status === 2 ? '已结束' : expired(row) ? '已到期' : row.status === 0 ? '进行中' : '已暂停'
const canManage = (row: UrgentPlan) =>
  checkPermi(['reagent:sample-urgent:update']) &&
  (row.requesterId === user.getUser.id || row.template.appointmentUserIds.includes(user.getUser.id))
const load = async () => {
  loading.value = true
  try {
    const res = await Api.getPlanPage(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}
const viewRecords = (id: number) => {
  visible.value = false
  emit('viewRecords', id)
}
const action = async (row: UrgentPlan, action: 'PAUSE' | 'RESUME' | 'END') => {
  if (actingId.value) return
  const descriptions = {
    PAUSE: '暂停后不再生成新单据，已生成的单据仍需正常处理。',
    RESUME: '恢复后从今天继续生成，暂停期间不补单，今天已有单据不会重复生成。',
    END: '结束后不能恢复此计划，已生成的单据保留。如需再次预约，请创建新计划。'
  }
  try {
    actingId.value = row.id
    await ElMessageBox.confirm(
      descriptions[action],
      { PAUSE: '暂停计划', RESUME: '恢复计划', END: '结束计划' }[action],
      { type: 'warning' }
    )
    await Api.actPlan({ id: row.id, revision: row.revision, action })
    message.success('计划已更新')
    await load()
    emit('changed')
  } catch {
    /* 取消或失败时保持原单据。 */
  } finally {
    actingId.value = undefined
  }
}
const scheduleVisible = ref(false)
const scheduleSaving = ref(false)
const selected = ref<UrgentPlan>()
const schedule = reactive({ endDate: '', dailyTime: '', weekdays: [] as number[] })
const openSchedule = (row: UrgentPlan) => {
  selected.value = row
  Object.assign(schedule, {
    endDate: row.endDate,
    dailyTime: row.dailyTime,
    weekdays: [...row.weekdays]
  })
  scheduleVisible.value = true
}
const disabledEndDate = (date: Date) =>
  dayjs(date).isBefore(dayjs().startOf('day')) ||
  (!!selected.value && dayjs(date).diff(dayjs(selected.value.startDate), 'day') > 365)
const saveSchedule = async () => {
  if (!selected.value || scheduleSaving.value) return
  if (!schedule.endDate || !schedule.dailyTime || !schedule.weekdays.length)
    return message.warning('请完整填写预约周期')
  scheduleSaving.value = true
  try {
    await Api.updatePlanSchedule({
      id: selected.value.id,
      revision: selected.value.revision,
      ...schedule
    })
    message.success('后续预约周期已更新')
    scheduleVisible.value = false
    await load()
    emit('changed')
  } finally {
    scheduleSaving.value = false
  }
}
</script>
