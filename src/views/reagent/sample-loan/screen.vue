<template>
  <main class="sample-loan-screen" :class="{ 'is-dark': isDark }">
    <header class="screen-header">
      <div class="title-block">
        <h1><span>样品</span><span>领用</span></h1>
      </div>
      <div class="header-actions">
        <div class="time-card">
          <strong>{{ nowText }}</strong>
        </div>
        <button
          class="theme-toggle"
          type="button"
          :title="isDark ? '切换为冰川白' : '切换为深海钴蓝'"
          @click="isDark = !isDark"
        >
          <Icon :icon="isDark ? 'ep:sunny' : 'ep:moon'" />
        </button>
      </div>
    </header>
    <section class="screen-panel">
      <div class="grid-head">
        <div v-for="column in 3" :key="column"><span>BAS 号</span><span>需求人</span></div>
      </div>
      <div :key="pageNo" class="loan-grid">
        <article v-for="row in pageList" :key="row.id" class="loan-card">
          <strong class="bas-value">{{ row.basNo }}</strong>
          <strong class="requester-value">{{ row.requester }}</strong>
        </article>
        <div v-if="!loading && pageList.length === 0" class="empty-state"
          >当前 24 小时内没有样品记录</div
        >
      </div>
      <footer class="panel-footer">
        <span>自动翻页</span>
        <div class="page-dots">
          <button
            v-for="page in pageCount"
            :key="page"
            :class="{ active: pageNo === page - 1 }"
            type="button"
            :aria-label="`第 ${page} 页`"
            @click="pageNo = page - 1"
          ></button>
        </div>
        <span>{{ pageNo + 1 }} / {{ pageCount }}</span>
      </footer>
    </section>
  </main>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import * as ReagentApi from '@/api/reagent'

defineOptions({ name: 'ReagentSampleLoanScreen' })

const PAGE_SIZE = 24
const loading = ref(false)
const isDark = ref(false)
const list = ref<ReagentApi.SampleLoanVO[]>([])
const nowText = ref('')
const pageNo = ref(0)
const pageCount = computed(() => Math.max(Math.ceil(list.value.length / PAGE_SIZE), 1))
const pageList = computed(() =>
  list.value.slice(pageNo.value * PAGE_SIZE, (pageNo.value + 1) * PAGE_SIZE)
)
let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let pageTimer: ReturnType<typeof setInterval> | undefined

const refreshClock = () => {
  nowText.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}
const getList = async () => {
  loading.value = true
  try {
    const data = await ReagentApi.getBorrowingSampleLoanList()
    list.value = [...data].sort((a, b) => {
      const timeDiff = dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf()
      return timeDiff || b.id - a.id
    })
    if (pageNo.value >= pageCount.value) pageNo.value = 0
  } finally {
    loading.value = false
  }
}
const nextPage = () => {
  if (pageCount.value > 1) pageNo.value = (pageNo.value + 1) % pageCount.value
}

onMounted(() => {
  refreshClock()
  getList()
  refreshTimer = setInterval(getList, 10_000)
  clockTimer = setInterval(refreshClock, 1_000)
  pageTimer = setInterval(nextPage, 10_000)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (pageTimer) clearInterval(pageTimer)
})
</script>

<style lang="scss" scoped>
.sample-loan-screen {
  --background: #eef6ff;
  --grid-color: rgb(40 126 224 / 2%);
  --glow-a: rgb(69 153 255 / 13%);
  --glow-b: rgb(90 118 222 / 10%);
  --text-primary: #17365f;
  --text-secondary: #58708f;
  --panel: rgb(255 255 255 / 96%);
  --panel-border: rgb(91 159 244 / 26%);
  --card: linear-gradient(180deg, #fff 0%, #f4f9ff 100%);
  --card-border: #c4dcf5;
  --card-shadow: rgb(60 111 180 / 14%);
  --accent: #1d73ed;
  --bas-color: #0d62d8;
  --card-stripe: linear-gradient(#1d73ed, #5fd9ff);
  --clock-gradient: #de2910;
  --clock-glow: rgb(226 45 45 / 10%);
  --success: #087f72;

  position: relative;
  display: flex;
  height: 100vh;
  min-width: 100vw;
  min-height: 100vh;
  padding: clamp(20px, 3vh, 42px) clamp(20px, 3vw, 56px) clamp(18px, 2.5vh, 38px);
  overflow: hidden;
  color: var(--text-primary);
  background:
    radial-gradient(ellipse 34% 25% at 12% 4%, rgb(255 255 255 / 72%), transparent 76%),
    radial-gradient(ellipse 28% 21% at 54% 5%, rgb(255 255 255 / 58%), transparent 78%),
    radial-gradient(ellipse 66% 27% at 12% 106%, rgb(113 166 230 / 22%), transparent 72%),
    radial-gradient(ellipse 58% 24% at 88% 106%, rgb(137 185 238 / 20%), transparent 72%),
    radial-gradient(ellipse 52% 48% at 100% 0%, var(--glow-a), transparent 72%),
    radial-gradient(ellipse 38% 34% at 0% 100%, var(--glow-b), transparent 70%), var(--background);
  box-sizing: border-box;
  flex-direction: column;

  &::before {
    position: absolute;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(var(--grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 48px 48px;
    content: '';
    inset: 0;
    mask-image: linear-gradient(to bottom, #000, transparent 82%);
  }

  &::after {
    position: absolute;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 19% 12% at 6% 10%, rgb(255 255 255 / 82%) 0%, transparent 74%),
      radial-gradient(ellipse 23% 14% at 22% 4%, rgb(255 255 255 / 86%) 0%, transparent 76%),
      radial-gradient(ellipse 18% 12% at 39% 12%, rgb(255 255 255 / 78%) 0%, transparent 76%),
      radial-gradient(ellipse 25% 15% at 62% 7%, rgb(255 255 255 / 84%) 0%, transparent 78%),
      radial-gradient(ellipse 22% 13% at 85% 12%, rgb(255 255 255 / 80%) 0%, transparent 76%),
      linear-gradient(157deg, transparent 0 57%, rgb(116 170 231 / 27%) 57% 68%, transparent 68%),
      linear-gradient(202deg, transparent 0 64%, rgb(132 183 237 / 30%) 64% 77%, transparent 77%);
    content: '';
    inset: 0;
    filter: blur(3px);
    mask-image: linear-gradient(to bottom, #000 0 92%, transparent 100%);
  }

  &.is-dark {
    --background: #091b31;
    --grid-color: rgb(84 174 255 / 4%);
    --glow-a: rgb(46 116 210 / 26%);
    --glow-b: rgb(0 190 190 / 12%);
    --text-primary: #e9f4ff;
    --text-secondary: #87a1bb;
    --panel: rgb(11 34 58 / 92%);
    --panel-border: rgb(128 185 230 / 22%);
    --card: linear-gradient(180deg, #173b5d 0%, #102d4b 100%);
    --card-border: rgb(128 185 230 / 18%);
    --card-shadow: rgb(0 0 0 / 26%);
    --accent: #4da9ff;
    --bas-color: #22b7f2;
    --card-stripe: linear-gradient(#4da9ff, #2d79c7);
    --clock-gradient: linear-gradient(180deg, #8bd5ff 0%, #4aafff 26%, #2f8df7 62%, #1b65d8 100%);
    --clock-glow: rgb(59 157 255 / 26%);
    --success: #51dfcf;

    background:
      radial-gradient(ellipse 52% 48% at 100% 0%, var(--glow-a), transparent 72%),
      radial-gradient(ellipse 38% 34% at 0% 100%, var(--glow-b), transparent 70%), var(--background);

    &::after {
      display: block;
      background:
        radial-gradient(ellipse 48% 34% at 88% 0%, rgb(53 137 235 / 28%), transparent 74%),
        radial-gradient(ellipse 40% 28% at 0% 100%, rgb(0 178 190 / 16%), transparent 76%),
        linear-gradient(148deg, transparent 0 70%, rgb(52 125 198 / 12%) 70% 78%, transparent 78%);
      opacity: 0.85;
    }
  }
}

.screen-header,
.screen-panel {
  position: relative;
  z-index: 1;
}

.screen-header {
  display: flex;
  min-height: clamp(126px, 19vh, 280px);
  align-items: stretch;
  justify-content: space-between;
  padding: 0 0 18px;
  box-sizing: border-box;
}

.screen-path {
  display: flex;
  font-size: 14px;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  align-items: center;
  gap: 10px;

  i {
    width: 22px;
    height: 1px;
    background: var(--accent);
  }
}

.title-block h1 {
  margin: clamp(6px, 1vh, 10px) 0 6px;
  font-size: clamp(36px, 3.3vw, 84px);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-primary);
  white-space: nowrap;

  span + span {
    margin-left: 0.16em;
  }
}

.title-block {
  align-self: center;
}

.title-block p {
  margin: 0;
  font-size: clamp(13px, 1vw, 16px);
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  min-width: 0;
  align-self: stretch;
  align-items: stretch;
  gap: 14px;
}

.time-card,
.theme-toggle {
  border: 1px solid var(--panel-border);
  box-shadow: 0 14px 32px var(--card-shadow);
}

.sample-loan-screen.is-dark .time-card {
  background: rgb(8 31 59 / 88%);
  border-color: rgb(87 169 255 / 27%);
  box-shadow: 0 14px 32px rgb(0 0 0 / 28%);
}

.time-card {
  display: flex;
  width: fit-content;
  max-width: calc(100vw - 340px);
  min-width: 0;
  min-height: 0;
  padding: 0 18px;
  background: var(--panel);
  border-radius: 8px;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;

  span {
    font-size: 13px;
    color: var(--text-secondary);
  }

  strong {
    margin-top: 5px;
    font-family: 'DIN Alternate', Bahnschrift, sans-serif;
    font-size: clamp(48px, min(7.2vw, calc(9.26vw - 39px)), 250px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'zero' 0;
    color: var(--accent);
    text-align: right;
    white-space: nowrap;
    background: var(--clock-gradient);
    filter: drop-shadow(0 6px 13px var(--clock-glow));
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.theme-toggle {
  position: fixed;
  right: clamp(14px, 1.4vw, 26px);
  bottom: clamp(14px, 2vh, 30px);
  z-index: 5;
  display: inline-flex;
  width: 42px;
  height: 42px;
  padding: 0;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  background: var(--panel);
  border-radius: 8px;
  opacity: 0.9;
  align-self: center;
  align-items: center;
  justify-content: center;

  :deep(svg) {
    font-size: 18px;
    color: var(--accent);
  }
}

.screen-panel {
  display: flex;
  min-height: 0;
  padding: 0 clamp(58px, 4vw, 76px) 8px 26px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 24px 56px var(--card-shadow);
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  backdrop-filter: blur(18px);
}

.screen-panel::before {
  position: absolute;
  top: 0;
  left: 30px;
  width: 120px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), transparent);
  content: '';
}

.grid-head {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(4px, 0.55vw, 8px);
  height: clamp(22px, 2.5vh, 30px);
  padding: 0 clamp(10px, 1vw, 18px);

  > div {
    display: grid;
    padding: 0 clamp(10px, 0.9vw, 16px);
    font-size: clamp(13px, 0.9vw, 16px);
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--panel-border);
    grid-template-columns: minmax(0, 1.65fr) minmax(90px, 1fr);
    gap: 12px;
    align-items: center;
  }
}

.loan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  align-content: start;
  gap: clamp(3px, 0.35vw, 6px);
  min-height: 0;
  animation: page-enter 420ms ease both;
  flex: 1;
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(9px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loan-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(90px, 1fr);
  align-items: center;
  gap: clamp(7px, 0.7vw, 12px);
  padding: clamp(4px, 0.6vh, 7px) clamp(10px, 0.9vw, 14px) clamp(4px, 0.6vh, 7px)
    clamp(12px, 1.1vw, 18px);
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 7px;
  box-shadow: 0 7px 18px var(--card-shadow);

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background: var(--card-stripe);
    content: '';
  }
}

.sample-loan-screen.is-dark .loan-card::before {
  width: 2px;
  opacity: 0.78;
}

.bas-value,
.requester-value {
  overflow: hidden;
  font-size: clamp(18px, 1.35vw, 30px);
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bas-value {
  font-family: 'DIN Alternate', Bahnschrift, sans-serif;
  font-size: clamp(22px, 1.7vw, 36px);
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--bas-color);
}

.empty-state {
  display: flex;
  font-size: 18px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  border: 1px dashed var(--panel-border);
  border-radius: 8px;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
}

.panel-footer {
  position: absolute;
  top: 50%;
  right: clamp(12px, 1.1vw, 20px);
  display: flex;
  height: auto;
  padding: 0;
  margin: 0;
  font-size: clamp(12px, 0.8vw, 14px);
  color: var(--text-secondary);
  align-items: center;
  justify-content: center;
  gap: 10px;
  transform: translateY(-50%);
  flex-direction: column;

  span:first-child {
    writing-mode: vertical-rl;
  }
}

.page-dots {
  display: flex;
  gap: 7px;
  flex-direction: column;

  button {
    width: 7px;
    height: 7px;
    padding: 0;
    cursor: pointer;
    background: color-mix(in srgb, var(--text-secondary) 28%, transparent);
    border: 0;
    border-radius: 50%;

    &.active {
      height: 24px;
      background: var(--accent);
      border-radius: 8px;
      box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
    }
  }
}
</style>
