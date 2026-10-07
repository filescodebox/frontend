<template>
  <div class="get-share-container">
    <!-- 取件码模式：6 格分格输入，填满自动取件（对标上游 OTP 输入模式） -->
    <template v-if="mode === 'pickup'">
      <div class="pickup-section">
        <CodeBoxes
          ref="codeBoxesRef"
          v-model="pickupCode"
          :length="6"
          :disabled="routing"
          :aria-label="t('home.getShare.pickupTitle')"
          @complete="onPickupComplete"
          @paste-code="onPasteCode"
        />
        <p class="pickup-hint">{{ t('home.getShare.autoHint') }}</p>
        <el-button
          type="primary"
          size="large"
          class="get-btn"
          :disabled="!pickupCode || routing"
          @click="goPickup"
        >
          <template #icon>
            <el-icon><Download /></el-icon>
          </template>
          {{ t('anonymous.submit') }}
        </el-button>
      </div>
    </template>

    <!-- 分享码模式：单输入框（8 位分享码 / 任意口令） -->
    <template v-else>
      <div class="input-section">
        <div class="input-icon">
          <el-icon size="40" class="icon-primary"><Search /></el-icon>
        </div>
        <el-input
          v-model="shareCode"
          size="large"
          placeholder="请输入分享码"
          class="code-input"
          clearable
          @keyup.enter="handleGetShare"
        >
          <template #prefix>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          size="large"
          class="get-btn"
          @click="handleGetShare"
        >
          <template #icon>
            <el-icon><Download /></el-icon>
          </template>
          获取分享
        </el-button>
      </div>

      <div class="tips-section">
        <el-alert
          type="info"
          :closable="false"
        >
          <template #title>
            <div class="tips-content">
              <p><strong>💡 使用提示：</strong></p>
              <p>• 输入分享码可获取他人分享的文件或文本</p>
              <p>• 分享码由 8 位字符组成（如：ABC12345）</p>
              <p>• 部分分享可能需要密码访问</p>
            </div>
          </template>
        </el-alert>
      </div>
    </template>

    <!-- 模式切换 + 本机记录入口 -->
    <div class="mode-links">
      <a class="mode-link" @click="toggleMode">{{ mode === 'pickup' ? t('home.getShare.useShareCode') : t('home.getShare.usePickupCode') }}</a>
      <span class="link-sep">·</span>
      <a class="mode-link" @click="historyDialog?.open('pickup')">{{ t('home.getShare.history') }}</a>
    </div>

    <LocalHistoryDialog ref="historyDialog" @pickup="onHistoryPickup" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Search, Key, Download } from '@element-plus/icons-vue'
import CodeBoxes from '@/components/retrieve/CodeBoxes.vue'
import LocalHistoryDialog from '@/components/history/LocalHistoryDialog.vue'

interface Props {
  initialCode?: string
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

// 分享码模式提交（沿用旧的按长度分派）
const handleGetShare = () => dispatchCode(shareCode.value)

// 对标上游"取件优先"：默认 6 位取件码分格输入
const mode = ref<'pickup' | 'share'>('pickup')
const pickupCode = ref('')
const shareCode = ref('')
const routing = ref(false)
const codeBoxesRef = ref<InstanceType<typeof CodeBoxes>>()
const historyDialog = ref<InstanceType<typeof LocalHistoryDialog>>()

// 按码长度分派：6 位取件码 → 匿名取件页（带码直填）；
// 其余（8 位分享码）→ 分享详情页（/share/select 查库，无需取件码）
const dispatchCode = (raw: string) => {
  const code = raw.trim()
  if (!code) {
    ElMessage.warning('请输入分享码')
    return
  }
  if (/^[A-Za-z0-9]{6}$/.test(code)) {
    router.push({ path: '/retrieve', query: { code } })
  } else {
    router.push(`/share/${code}`)
  }
}

// 填满 6 位自动取件：auto=1 让取件页做密码预检（无密码直接取，有密码聚焦密码框）
const onPickupComplete = (value: string) => {
  routing.value = true
  router.push({ path: '/retrieve', query: { code: value, auto: '1' } })
}

const goPickup = () => {
  const code = pickupCode.value.trim()
  if (!code) return
  routing.value = true
  if (code.length === 6) {
    router.push({ path: '/retrieve', query: { code, auto: '1' } })
  } else {
    router.push({ path: '/retrieve', query: { code } })
  }
}

// 粘贴 8 位分享码 → 直接走分享码流程（避免截断前 6 位误触发匿名取件）
const onPasteCode = (text: string) => {
  if (/^[A-Za-z0-9]{8}$/.test(text)) {
    router.push(`/share/${text}`)
    return
  }
  // 其余长文本：截取前 6 位留在分格内
  pickupCode.value = text.slice(0, 6)
}

const toggleMode = () => {
  mode.value = mode.value === 'pickup' ? 'share' : 'pickup'
}

const onHistoryPickup = (code: string) => {
  if (/^[A-Za-z0-9]{6}$/.test(code)) {
    router.push({ path: '/retrieve', query: { code, auto: '1' } })
  } else {
    router.push(`/share/${code}`)
  }
}

// 监听 initialCode 变化（外部预填：切到分享码模式并按旧逻辑分派）
watch(() => props.initialCode, (newCode) => {
  if (newCode) {
    mode.value = 'share'
    shareCode.value = newCode
    dispatchCode(newCode)
  }
}, { immediate: true })

// 组件挂载时检查
onMounted(() => {
  if (props.initialCode) {
    mode.value = 'share'
    shareCode.value = props.initialCode
    dispatchCode(props.initialCode)
    return
  }
  codeBoxesRef.value?.focus()
})
</script>

<style scoped>
.get-share-container {
  padding: 20px 0;
}

.pickup-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: var(--spacing-xl) 0 var(--spacing-md);
}

.pickup-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.input-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-bottom: 40px;
}

.input-icon {
  color: var(--primary-color);
}

.code-input {
  width: 100%;
  max-width: 500px;
}

.code-input :deep(.el-input__wrapper) {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  transition: box-shadow 0.2s ease;
}

.code-input :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-xs);
}

.code-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--primary-color) inset;
}

.get-btn {
  width: 100%;
  max-width: 500px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 999px;
  background: var(--primary-color);
  border: none;
  transition: opacity 0.2s ease;
}

.get-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.tips-section {
  padding: 20px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
}

.tips-content p {
  margin: 8px 0;
  line-height: 1.6;
  font-size: 14px;
}

.tips-content p:first-child {
  margin-top: 0;
}

.tips-content p:last-child {
  margin-bottom: 0;
}

.icon-primary {
  color: var(--primary-color);
}

.mode-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: var(--spacing-lg);
}

.mode-link {
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.mode-link:hover {
  color: var(--primary-color);
}

.link-sep {
  color: var(--color-border);
}
</style>
