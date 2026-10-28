<template>
  <main class="sample-loan-screen" :class="{ 'is-dark': isDark }">
    <header class="screen-header">
      <div class="title-block">
        <h1>可领用列表</h1>
      </div>
      <div class="header-actions">
        <div class="time-card">
          <strong>{{ nowText }}</strong>
        </div>
      </div>
    </header>
    <section class="screen-panel">
      <div :key="pageNo" class="loan-grid">
        <article v-for="row in pageList" :key="row.id" class="loan-card">
          <strong :ref="setBasValueRef" class="bas-value">{{ row.basNo }}</strong>
          <strong class="requester-value">{{ row.requester }}</strong>
        </article>
        <div v-if="!loading && pageList.length === 0" class="empty-state">
          {{ dataUnavailable ? '数据暂不可用，正在重试…' : '当前 24 小时内没有可领用记录' }}
        </div>
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
    <div class="screen-controls">
      <div class="location-toggle" role="group" aria-label="楼层切换">
        <button
          v-for="location in locations"
          :key="location.value"
          type="button"
          :class="{ active: activeLocation === location.value }"
          @click="selectLocation(location.value)"
        >
          {{ location.label }}
        </button>
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
  </main>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import * as ReagentApi from '@/api/reagent'

defineOptions({ name: 'ReagentSampleLoanScreen' })

const PAGE_SIZE = 18
const loading = ref(false)
const dataUnavailable = ref(false)
const isDark = ref(false)
const list = ref<ReagentApi.SampleLoanVO[]>([])
const nowText = ref('')
const pageNo = ref(0)
const locations = ref<ReagentApi.SampleLoanOption[]>([])
type Location = string
const route = useRoute()
const router = useRouter()
const queryToLocation = (value: unknown): Location | undefined => {
  const queryValue = Array.isArray(value) ? value[0] : value
  if (typeof queryValue !== 'string') return undefined
  return /^\d+F$/i.test(queryValue) ? `${queryValue.slice(0, -1)}楼` : queryValue
}
const locationToQuery = (location: Location) => location
const activeLocation = ref<Location>(queryToLocation(route.query.location) ?? '4楼')
const materialTypeRank = { SAMPLE: 0, REAGENT: 1 } as const
const sortedList = computed(() =>
  [...list.value]
    .sort((a, b) => {
      const typeDiff =
        (materialTypeRank[a.materialType] ?? 99) - (materialTypeRank[b.materialType] ?? 99)
      if (typeDiff !== 0) return typeDiff
      const timeDiff = dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf()
      return timeDiff || b.id - a.id
    })
)
const pageCount = computed(() => Math.max(Math.ceil(sortedList.value.length / PAGE_SIZE), 1))
const pageList = computed(() =>
  sortedList.value.slice(pageNo.value * PAGE_SIZE, (pageNo.value + 1) * PAGE_SIZE)
)

const basValueRefs = new Set<HTMLElement>()
const setBasValueRef = (element: Element | null) => {
  if (element instanceof HTMLElement) basValueRefs.add(element)
}
const fitBasValues = () => {
  basValueRefs.forEach((element) => {
    const availableWidth = element.clientWidth
    if (!availableWidth) return

    // 用同样式的隐藏副本测量完整文本，避免 text-overflow: ellipsis 干扰 scrollWidth。
    const probe = element.cloneNode(true) as HTMLElement
    Object.assign(probe.style, {
      position: 'absolute',
      left: '-100000px',
      top: '0',
      display: 'inline-block',
      width: 'max-content',
      maxWidth: 'none',
      height: 'auto',
      overflow: 'visible',
      textOverflow: 'clip',
      visibility: 'hidden',
      pointerEvents: 'none'
    })
    document.body.appendChild(probe)

    let fontSize = 72
    probe.style.fontSize = `${fontSize}px`
    while (probe.getBoundingClientRect().width > availableWidth && fontSize > 26) {
      fontSize -= 1
      probe.style.fontSize = `${fontSize}px`
    }
    element.style.fontSize = `${fontSize}px`
    probe.remove()
  })
}

let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setTimeout> | undefined
let pageTimer: ReturnType<typeof setInterval> | undefined
let requestVersion = 0

const refreshClock = () => {
  nowText.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}
const scheduleClock = () => {
  refreshClock()
  clockTimer = setTimeout(scheduleClock, 1000 - (Date.now() % 1000))
}
const getList = async () => {
  const version = ++requestVersion
  loading.value = true
  try {
    const data = await ReagentApi.getBorrowingSampleLoanList(activeLocation.value)
    if (version !== requestVersion) return
    list.value = [...data]
    if (pageNo.value >= pageCount.value) pageNo.value = 0
    dataUnavailable.value = false
  } catch {
    if (version !== requestVersion) return
    // 大屏只读接口异常时保留最后一次成功数据，不打断时钟和翻页。
    dataUnavailable.value = list.value.length === 0
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
const selectLocation = (location: Location) => {
  if (activeLocation.value === location) return
  void router.replace({
    query: { location: locationToQuery(location) }
  })
}
const nextPage = () => {
  if (pageCount.value > 1) pageNo.value = (pageNo.value + 1) % pageCount.value
}

watch(
  () => route.query.location,
  (locationValue) => {
    const location = queryToLocation(locationValue) ?? '4楼'
    if (location !== activeLocation.value) {
      activeLocation.value = location
      list.value = []
      pageNo.value = 0
      getList()
    }
  }
)

onMounted(() => {
  scheduleClock()
  void (async () => {
    locations.value = await ReagentApi.getSampleLoanLocations('NINGBO')
    const location = locations.value.some((item) => item.value === activeLocation.value)
      ? activeLocation.value : locations.value[0]?.value
    if (!location) {
      dataUnavailable.value = true
      return
    }
    activeLocation.value = location
    if (route.query.site || route.query.location !== locationToQuery(location)) {
      await router.replace({ query: { location: locationToQuery(location) } })
    }
    await getList()
  })().catch(() => { dataUnavailable.value = list.value.length === 0 })
  window.addEventListener('resize', fitBasValues)
  requestAnimationFrame(fitBasValues)
  refreshTimer = setInterval(() => {
    if (locations.value.length) void getList()
  }, 10_000)
  pageTimer = setInterval(nextPage, 10_000)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearTimeout(clockTimer)
  if (pageTimer) clearInterval(pageTimer)
  window.removeEventListener('resize', fitBasValues)
})
onBeforeUpdate(() => basValueRefs.clear())
onUpdated(fitBasValues)
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
  display: grid;
  width: 100%;
  height: 100dvh;
  min-width: 100%;
  min-height: 100vh;
  padding: clamp(14px, 1.8vh, 26px) clamp(12px, 1.6vw, 28px) clamp(10px, 1.2vh, 20px);
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
  grid-template-rows: auto minmax(0, 1fr);
  isolation: isolate;

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
  display: grid;
  min-width: 0;
  min-height: clamp(150px, 25vh, 340px);
  padding: 0 0 clamp(8px, 1vh, 14px);
  box-sizing: border-box;
  grid-template-columns: minmax(220px, 0.24fr) minmax(0, 1fr);
  gap: clamp(12px, 1.4vw, 24px);
  align-items: stretch;
}

.title-block h1 {
  margin: 0;
  font-size: clamp(34px, 3.2vw, 76px);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-primary);
  white-space: nowrap;

  span + span {
    margin-left: 0.16em;
  }
}

.title-block {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 16px);
}

.header-actions {
  display: flex;
  min-width: 0;
  align-items: stretch;
  justify-content: flex-end;
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
  width: 100%;
  max-width: none;
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
    font-size: clamp(48px, min(8.2vw, calc(9.7vw - 30px)), 260px);
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
  display: grid;
  min-width: 0;
  min-height: 0;
  padding: clamp(8px, 1vh, 14px) clamp(42px, 2.8vw, 58px) clamp(8px, 1vh, 14px)
    clamp(12px, 1vw, 20px);
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 24px 56px var(--card-shadow);
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) 26px;
  grid-template-rows: minmax(0, 1fr);
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

.loan-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  align-content: start;
  gap: clamp(3px, 0.35vw, 6px);
  min-height: 0;
  grid-column: 1;
  grid-row: 1;
  animation: page-enter 420ms ease both;
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
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 2fr) minmax(160px, 0.9fr);
  align-items: center;
  gap: clamp(3px, 0.35vw, 5px);
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
  width: 100%;
  overflow: hidden;
  font-size: clamp(24px, 3.8vw, 55px);
  line-height: 1;
  color: var(--text-primary);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bas-value {
  font-family: 'DIN Alternate', Bahnschrift, sans-serif;
  font-size: clamp(26px, 4.5vw, 72px);
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--bas-color);
  text-align: left;
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

.screen-controls {
  position: fixed;
  right: clamp(4px, 0.5vw, 10px);
  bottom: clamp(14px, 2vh, 30px);
  z-index: 5;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-direction: column;
}

.location-toggle {
  display: flex;
  flex-direction: column;
  padding: 3px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  box-shadow: 0 14px 32px var(--card-shadow);
  gap: 3px;

  button {
    height: 28px;
    min-width: 42px;
    padding: 0 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 5px;

    &.active {
      color: #fff;
      background: var(--accent);
      box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 36%, transparent);
    }
  }
}

.panel-footer {
  display: flex;
  width: 26px;
  min-height: 0;
  padding: 0;
  margin: 0;
  font-size: clamp(12px, 0.8vw, 14px);
  color: var(--text-secondary);
  align-items: center;
  justify-content: center;
  gap: 10px;
  grid-column: 2;
  grid-row: 1;
  place-self: center center;
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
