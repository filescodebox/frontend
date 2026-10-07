<template>
  <div class="home-container">
    <!-- 主容器 -->
    <div class="main-wrapper">
      <!-- 顶部导航 —— TopNav home 变体（站名/语言/主题/铃铛/用户菜单内聚于组件） -->
      <TopNav variant="home" @command="handleUserCommand">
        <template #nav-extra>
          <!-- nav-extra-desktop:手机端隐藏(首页本身即取件优先,API 文档 PC 端入口保留) -->
          <el-button v-if="configStore.config?.apiDocsEnabled !== false" text class="nav-extra-desktop" @click="$router.push('/api-docs')">
            <el-icon><Document /></el-icon>
            {{ t('home.apiDocs') }}
          </el-button>
          <el-button text class="nav-extra-desktop" @click="$router.push('/retrieve')">
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
        <!-- 功能卡片：取件为第一 Tab（对标上游取件优先模式） -->
        <div class="function-card">
          <div class="card-head">
            <div class="card-head-icon">
              <el-icon size="26"><Postcard v-if="activeTab === 'get'" /><Upload v-else-if="activeTab === 'file'" /><Document v-else /></el-icon>
            </div>
            <h2 class="card-head-title">{{ t('home.cardTitle.' + activeTab) }}</h2>
            <p class="card-head-sub">{{ t('home.cardSub.' + activeTab) }}</p>
          </div>
          <!-- 分段切换器（对标上游 发送文件/发送文本 圆角轨道+活动白块） -->
          <div class="seg" role="tablist">
            <button
              v-for="t in ([['get', '获取分享'], ['file', '文件分享'], ['text', '文本分享']] as const)"
              :key="t[0]"
              class="seg-item"
              :class="{ active: activeTab === t[0] }"
              role="tab"
              :aria-selected="activeTab === t[0]"
              @click="activeTab = t[0]"
            >
              {{ t[1] }}
            </button>
          </div>
          <div v-show="activeTab === 'get'"><GetShare /></div>
          <div v-show="activeTab === 'file'"><FileUpload @success="handleShareSuccess" /></div>
          <div v-show="activeTab === 'text'"><TextShare @success="handleShareSuccess" /></div>

          <!-- 卡内页脚（发送类 tab）：对标上游 需要取件? 链接 -->
          <div v-if="activeTab !== 'get'" class="card-footer">
            <a class="footer-link" @click="activeTab = 'get'">
              <el-icon><Download /></el-icon>
              {{ t('home.needRetrieve') }}
            </a>
          </div>
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
  Download, Link, Postcard, Setting
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
// 支持 ?tab=file|text 直达（可分享深链；取件码/分享码分发复用同一参数语义）
const activeTab = ref((() => {
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '').get('tab')
  return q === 'file' || q === 'text' ? q : 'get'
})())
// 场景：自己用 / 给他人（默认给他人）

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

/* 功能卡卡头（对标上游：软垫图标+标题+一行副题） */
.card-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--spacing-xl) var(--spacing-lg) 0;
  text-align: center;
}

.card-head-icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  background: var(--color-muted);
  color: var(--color-text-primary);
  border-radius: var(--radius-lg);
}

.card-head-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-head-sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 功能卡片 —— 视觉焦点 */
.function-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-sm);
}

/* 卡内页脚（发送类 tab）：需要取件? */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-xl) 0;
  border-top: 1px solid var(--color-border-light);
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: var(--primary-color);
}

/* 分段切换器：圆角轨道 + 活动白块（对标上游 发送文件/发送文本） */
.seg {
  display: flex;
  gap: 4px;
  margin: 0 var(--spacing-xl) var(--spacing-lg);
  padding: 4px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
}

.seg-item {
  flex: 1;
  height: 38px;
  border: none;
  border-radius: calc(var(--radius-lg) - 4px);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.seg-item:hover {
  color: var(--color-text-primary);
}

.seg-item.active {
  background: var(--color-card-bg);
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
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
  /* 顶栏文字按钮窄屏隐藏,防单行溢出(登录按钮保留) */
  .nav-extra-desktop {
    display: none;
  }

  .main-wrapper {
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  }




  .function-card {
    padding: var(--spacing-xs) var(--spacing-md);
    /* 圆角大卡片贴边留 2px 呼吸,避免"框中框"的局促 */
    border-radius: var(--radius-lg);
  }

  /* 手机上卡片就是主战场,页脚收紧 */
  .footer-section {
    margin-top: var(--spacing-xl);
    gap: var(--spacing-sm);
  }
}
</style>
