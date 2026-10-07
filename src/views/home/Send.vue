<template>
  <div class="home-container">
    <div class="main-wrapper">
      <!-- 顶部导航 -->
      <TopNav variant="home">
        <template #nav-extra>
          <!-- 回取件（首页=取件专属页） -->
          <el-button text class="nav-extra-desktop" @click="router.push('/')">
            <el-icon><Postcard /></el-icon>
            {{ t('home.retrieve') }}
          </el-button>
          <el-button v-if="configStore.config?.apiDocsEnabled !== false" text class="nav-extra-desktop" @click="router.push('/api-docs')">
            <el-icon><Document /></el-icon>
            {{ t('home.apiDocs') }}
          </el-button>
          <el-button v-if="!userStore.isLoggedIn" type="primary" @click="router.push('/user/login')">
            {{ t('home.login') }}
          </el-button>
        </template>
      </TopNav>

      <!-- 发送页：文件/文本 双 tab（取件已拆分至首页专属卡片,互不挤占） -->
      <main class="content-area">
        <div class="function-card">
          <div class="card-head">
            <div class="card-head-icon">
              <el-icon size="26"><Upload v-if="activeTab === 'file'" /><Document v-else /></el-icon>
            </div>
            <h2 class="card-head-title">{{ t('home.cardTitle.' + activeTab) }}</h2>
          </div>
          <div class="seg" role="tablist">
            <button
              v-for="x in ([['file', t('home.tabs.file')], ['text', t('home.tabs.text')]] as const)"
              :key="x[0]"
              class="seg-item"
              :class="{ active: activeTab === x[0] }"
              role="tab"
              :aria-selected="activeTab === x[0]"
              @click="setTab(x[0])"
            >
              {{ x[1] }}
            </button>
          </div>
          <div v-show="activeTab === 'file'" class="card-pane"><FileUpload @success="handleShareSuccess" /></div>
          <div v-show="activeTab === 'text'" class="card-pane"><TextShare @success="handleShareSuccess" /></div>

          <!-- 卡内页脚：回取件 -->
          <div class="card-footer">
            <a class="footer-link" @click="router.push('/')">
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

    <!-- 分享成功弹窗 -->
    <ShareResultDialog ref="shareResultDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
import TopNav from '@/components/layout/TopNav.vue'
import ShareResultDialog from '@/components/share/ShareResultDialog.vue'

// vite define 注入的构建版本（package.json,对齐发布列车）
const appVersion = __APP_VERSION__

const router = useRouter()
const userStore = useUserStore()
const configStore = useConfigStore()
const localeStore = useLocaleStore()
const { t, locale } = useI18n()

// ?tab=file|text 深链直达,非法值回退 file
const activeTab = ref<'file' | 'text'>((() => {
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '').get('tab')
  return q === 'text' ? 'text' : 'file'
})())

const setTab = (tab: 'file' | 'text') => {
  activeTab.value = tab
  router.replace({ query: { tab: tab === 'text' ? 'text' : undefined } })
}

const shareResultDialog = ref<InstanceType<typeof ShareResultDialog> | null>(null)

const handleShareSuccess = (result: ShareResult) => {
  shareResultDialog.value?.open(result)
}

onMounted(async () => {
  locale.value = localeStore.locale
  document.documentElement.lang = localeStore.locale
  await configStore.fetchConfig()
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
/* 与首页同构的卡片体系（拆页复制,scoped 隔离;改动需两处同步） */
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

.content-area {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.function-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-sm);
}

.card-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
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

.card-pane {
  padding: var(--spacing-md) var(--spacing-sm) 0;
  min-height: 380px;
}

.card-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
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

@media (max-width: 768px) {
  .nav-extra-desktop {
    display: none;
  }

  .main-wrapper {
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  }

  .function-card {
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-lg);
  }

  .footer-section {
    margin-top: var(--spacing-xl);
    gap: var(--spacing-sm);
  }
}
</style>
