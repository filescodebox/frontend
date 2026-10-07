<template>
  <div class="home-container">
    <!-- 主容器 -->
    <div class="main-wrapper">
      <!-- 顶部导航 —— TopNav home 变体（站名/语言/主题/铃铛/用户菜单内聚于组件） -->
      <TopNav variant="home" @command="handleUserCommand">
        <template #nav-extra>
          <el-button v-if="configStore.config?.apiDocsEnabled !== false" text @click="$router.push('/api-docs')">
            <el-icon><Document /></el-icon>
            {{ t('home.apiDocs') }}
          </el-button>
          <el-button text @click="$router.push('/retrieve')">
            <el-icon><Postcard /></el-icon>
            {{ t('home.retrieve') }}
          </el-button>
          <el-button v-if="!userStore.isLoggedIn" type="primary" @click="$router.push('/user/login')">
            {{ t('home.login') }}
          </el-button>
        </template>
      </TopNav>


      <!-- 主内容区 -->
      <main class="content-area">
        <!-- Hero —— 左对齐大标题,Linear 风 -->
        <div class="intro-section">
          <h2>{{ t('home.slogan') }}</h2>
          <p>{{ t('home.description') }}</p>
        </div>

        <!-- 场景选择 Tab：自己用 / 给他人 -->
        <div class="scenario-tabs">
          <el-radio-group v-model="scenario" class="scenario-radio">
            <el-radio-button value="others">
              <el-icon><Promotion /></el-icon>
              {{ t('home.scenario.others') }}
            </el-radio-button>
            <el-radio-button value="self">
              <el-icon><Folder /></el-icon>
              {{ t('home.scenario.self') }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 给他人场景：极简横向时间线 -->
        <div v-if="scenario === 'others'" class="workflow-section">
          <h3 class="workflow-title">{{ t('home.workflow.title') }}</h3>
          <div class="workflow-steps">
            <div class="workflow-step">
              <div class="step-marker">
                <span class="step-num">1</span>
                <el-icon size="20"><UploadFilled /></el-icon>
              </div>
              <div class="step-title">{{ t('home.workflow.step1Title') }}</div>
              <div class="step-desc">{{ t('home.workflow.step1Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-marker">
                <span class="step-num">2</span>
                <el-icon size="20"><Postcard /></el-icon>
              </div>
              <div class="step-title">{{ t('home.workflow.step2Title') }}</div>
              <div class="step-desc">{{ t('home.workflow.step2Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-marker">
                <span class="step-num">3</span>
                <el-icon size="20"><Share /></el-icon>
              </div>
              <div class="step-title">{{ t('home.workflow.step3Title') }}</div>
              <div class="step-desc">{{ t('home.workflow.step3Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-marker">
                <span class="step-num">4</span>
                <el-icon size="20"><Download /></el-icon>
              </div>
              <div class="step-title">{{ t('home.workflow.step4Title') }}</div>
              <div class="step-desc">{{ t('home.workflow.step4Desc') }}</div>
            </div>
          </div>
        </div>

        <!-- 功能标签页（对标上游取件优先模式：取件为第一 Tab，2026-10-07） -->
        <el-tabs v-model="activeTab" class="function-tabs">
          <el-tab-pane name="get">
            <template #label>
              <span class="tab-label">
                <el-icon><Download /></el-icon>
                {{ t('home.tabs.get') }}
              </span>
            </template>
            <GetShare />
          </el-tab-pane>

          <el-tab-pane name="file">
            <template #label>
              <span class="tab-label">
                <el-icon><Upload /></el-icon>
                {{ t('home.tabs.file') }}
              </span>
            </template>
            <FileUpload @success="handleShareSuccess" />
          </el-tab-pane>

          <el-tab-pane name="text">
            <template #label>
              <span class="tab-label">
                <el-icon><Document /></el-icon>
                {{ t('home.tabs.text') }}
              </span>
            </template>
            <TextShare @success="handleShareSuccess" />
          </el-tab-pane>
        </el-tabs>
      </main>

      <!-- 页脚 -->
      <footer class="footer-section">
        <p class="footer-notice">{{ t('home.notice') }}</p>
        <div class="footer-links">
          <a href="https://github.com/pigeonbox/pigeonbox" target="_blank">
            <el-icon><Link /></el-icon>
            GitHub
          </a>
          <!-- 管理入口（ui.show_admin_addr 控制；/admin 路由始终可达，仅控制此入口展示） -->
          <a v-if="configStore.config?.showAdminAddr" href="#/admin/login">
            <el-icon><Setting /></el-icon>
            {{ t('admin.title') }}
          </a>
        </div>
      </footer>
    </div>

    <!-- 分享成功弹窗（收敛为共享组件：取件码/URL/二维码三选一 + E2E 提示） -->
    <ShareResultDialog ref="shareResultDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Upload, Document,
  Download, Link, Postcard, UploadFilled, Share,
  Promotion, Folder, Setting
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { useLocaleStore } from '@/stores/locale'
import type { ShareResult } from '@/types/share'
import FileUpload from '@/components/upload/FileUpload.vue'
import TextShare from '@/components/upload/TextShare.vue'
import GetShare from '@/components/upload/GetShare.vue'
import TopNav from '@/components/layout/TopNav.vue'
import ShareResultDialog from '@/components/share/ShareResultDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const configStore = useConfigStore()
const localeStore = useLocaleStore()
const { t, locale } = useI18n()

// 对标上游"取件优先"（2026-10-07）：首页默认落在取件 Tab
const activeTab = ref('get')
// 场景：自己用 / 给他人（默认给他人）
const scenario = ref<'self' | 'others'>('others')

const shareResultDialog = ref<InstanceType<typeof ShareResultDialog> | null>(null)

const handleShareSuccess = (result: ShareResult) => {
  shareResultDialog.value?.open(result)
}

const handleUserCommand = (command: string) => {
  switch (command) {
    case 'dashboard':
      router.push('/user/dashboard')
      break
    case 'logout':
      userStore.logout()
      ElMessage.success(t('home.loggedOut'))
      break
  }
}

onMounted(async () => {
  // 同步 i18n 和 store
  locale.value = localeStore.locale
  document.documentElement.lang = localeStore.locale
  // 加载配置
  await configStore.fetchConfig()
  // 安全版主题：背景图（后端已白名单校验 http(s)）。
  // 主题色（accent）统一在 App.vue 全局应用，此处不再重复设置。
  const cfg = configStore.config
  if (cfg?.background) {
    const dark = document.documentElement.classList.contains('dark')
    const overlay = dark ? 'rgba(17, 17, 17, 0.78)' : 'rgba(255, 255, 255, 0.82)'
    const body = document.body
    body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), url("${cfg.background}")`
    body.style.backgroundSize = 'cover'
    body.style.backgroundAttachment = 'fixed'
    body.style.backgroundPosition = 'center'
  }
})
</script>

<style scoped>
/* 主容器 —— 纯净背景 */
.home-container {
  min-height: 100vh;
  background: var(--color-bg);
}

.main-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-2xl);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航样式内聚于 TopNav 组件（variant="home"） */

/* 主内容区 */
.content-area {
  flex: 1;
}

/* Hero —— 左对齐 */
.intro-section {
  margin-bottom: var(--spacing-2xl);
  padding-top: var(--spacing-lg);
}

.intro-section h2 {
  margin: 0 0 var(--spacing-md);
  font-size: 40px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.intro-section p {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-text-regular);
  max-width: 600px;
  line-height: 1.5;
}

/* 场景选择 Tab */
.scenario-tabs {
  margin-bottom: var(--spacing-xl);
}

.scenario-radio :deep(.el-radio-button__inner) {
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 极简横向时间线 */
.workflow-section {
  margin-bottom: var(--spacing-2xl);
}

.workflow-title {
  margin: 0 0 var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: var(--color-muted);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.workflow-step {
  padding: var(--spacing-xl) var(--spacing-lg);
  border-right: 1px solid var(--color-border-light);
  position: relative;

  &:last-child {
    border-right: none;
  }
}

.step-marker {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  color: var(--primary-color);
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 600;
  color: #fff;
  background: var(--primary-color);
}

.step-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.step-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 功能标签页 */
.function-tabs {
  margin-top: var(--spacing-xl);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
}

:deep(.el-tabs__header) {
  margin-bottom: var(--spacing-xl);
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--color-border);
}

:deep(.el-tabs__item) {
  padding: 0 var(--spacing-xl);
  height: 44px;
  line-height: 44px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

:deep(.el-tabs__item:hover) {
  color: var(--color-text-primary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--color-text-primary);
}

:deep(.el-tabs__active-bar) {
  background: var(--primary-color);
  height: 2px;
}

/* 分享结果弹窗样式内聚于 ShareResultDialog 组件 */

/* 页脚 */
.footer-section {
  margin-top: var(--spacing-2xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.footer-notice {
  margin: 0;
  line-height: 1.6;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.footer-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  transition: color 0.15s ease;

  &:hover {
    color: var(--color-text-primary);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .main-wrapper {
    padding: var(--spacing-md);
  }

  .intro-section h2 {
    font-size: var(--text-2xl);
  }

  .workflow-steps {
    grid-template-columns: 1fr 1fr;
  }

  .workflow-step {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  :deep(.el-tabs__item) {
    padding: 0 var(--spacing-md);
  }
}
</style>
