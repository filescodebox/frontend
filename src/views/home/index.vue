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

      <!-- 主内容区：单列聚焦(对标上游"居中一个柜子卡片"的取件优先布局) -->
      <main class="content-area">
        <!-- Hero —— 居中大标题 -->
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

        <!-- 给他人场景：轻量四步流程（无底无框,数字点承载顺序） -->
        <div v-if="scenario === 'others'" class="workflow-section">
          <div class="workflow-steps">
            <div class="workflow-step">
              <div class="step-head">
                <span class="step-num">1</span>
                <span class="step-title">{{ t('home.workflow.step1Title') }}</span>
              </div>
              <div class="step-desc">{{ t('home.workflow.step1Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-head">
                <span class="step-num">2</span>
                <span class="step-title">{{ t('home.workflow.step2Title') }}</span>
              </div>
              <div class="step-desc">{{ t('home.workflow.step2Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-head">
                <span class="step-num">3</span>
                <span class="step-title">{{ t('home.workflow.step3Title') }}</span>
              </div>
              <div class="step-desc">{{ t('home.workflow.step3Desc') }}</div>
            </div>
            <div class="workflow-step">
              <div class="step-head">
                <span class="step-num">4</span>
                <span class="step-title">{{ t('home.workflow.step4Title') }}</span>
              </div>
              <div class="step-desc">{{ t('home.workflow.step4Desc') }}</div>
            </div>
          </div>
        </div>

        <!-- 功能卡片：取件为第一 Tab（对标上游取件优先模式） -->
        <div class="function-card">
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
        </div>
      </main>

      <!-- 页脚：免责声明 / 链接 / 版本元信息 -->
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
        <div class="footer-meta">
          <span>{{ t('home.versionLabel') }} v{{ appVersion }}</span>
          <span class="meta-dot">·</span>
          <span>© 2026 PigeonBox</span>
          <span class="meta-dot">·</span>
          <span>Apache-2.0</span>
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
  Download, Link, Postcard,
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

// vite define 注入的构建版本（package.json,对齐发布列车）
const appVersion = __APP_VERSION__

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

/* 主内容区 —— 单列聚焦卡片布局（PC 720px 居中,与上游柜子卡片同构） */
.content-area {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

/* Hero —— 居中 */
.intro-section {
  margin-bottom: var(--spacing-xl);
  padding-top: var(--spacing-md);
  text-align: center;
}

.intro-section h2 {
  margin: 0 0 var(--spacing-sm);
  font-size: 40px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.intro-section p {
  margin: 0 auto;
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  max-width: 560px;
  line-height: 1.5;
}

/* 场景选择 Tab */
.scenario-tabs {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}

.scenario-radio :deep(.el-radio-button__inner) {
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 轻量四步流程：无底无框,数字点 + 标题 + 短描述 */
.workflow-section {
  margin-bottom: var(--spacing-xl);
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.workflow-step {
  min-width: 0;
}

.step-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 6px;
}

.step-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--primary-color);
  background: var(--primary-bg);
}

.step-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  /* 两端窄屏下步骤标题不撑破列 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

/* 功能卡片 —— 视觉焦点 */
.function-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-sm);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
}

:deep(.el-tabs__header) {
  margin-bottom: var(--spacing-lg);
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--color-border);
}

:deep(.el-tabs__item) {
  padding: 0 var(--spacing-lg);
  height: 46px;
  line-height: 46px;
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

/* 页脚：居中三行（免责/链接/版本元信息） */
.footer-section {
  margin-top: var(--spacing-2xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
}

.footer-notice {
  margin: 0;
  line-height: 1.6;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  max-width: 640px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.footer-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  transition: color 0.15s ease;
}

.footer-links a:hover {
  color: var(--color-text-primary);
}

.footer-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.meta-dot {
  color: var(--color-border);
}

/* ===== 响应式：手机端 (≤768px) ===== */
@media (max-width: 768px) {
  .main-wrapper {
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  }

  /* Hero 缩小并保持居中 */
  .intro-section {
    padding-top: 0;
    margin-bottom: var(--spacing-lg);
  }

  .intro-section h2 {
    font-size: var(--text-2xl);
  }

  .intro-section p {
    font-size: var(--text-base);
  }

  /* 流程改单行紧凑步进器:数字点在上、标题在下居中,描述隐去
     (四步标题各 4 字,390px 单行放得下;之前的竖排/两列列表会把主卡片顶出首屏) */
  .workflow-section {
    margin-bottom: var(--spacing-lg);
  }

  .workflow-steps {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-xs);
  }

  .step-head {
    flex-direction: column;
    gap: 5px;
    text-align: center;
  }

  .step-num {
    width: 20px;
    height: 20px;
    font-size: 11px;
    margin: 0 auto;
  }

  .step-title {
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .step-desc {
    display: none;
  }

  .function-card {
    padding: var(--spacing-xs) var(--spacing-md);
    /* 圆角大卡片贴边留 2px 呼吸,避免"框中框"的局促 */
    border-radius: var(--radius-lg);
  }

  :deep(.el-tabs__item) {
    padding: 0 var(--spacing-sm);
  }

  /* 手机上卡片就是主战场,页脚收紧 */
  .footer-section {
    margin-top: var(--spacing-xl);
    gap: var(--spacing-sm);
  }
}
</style>
