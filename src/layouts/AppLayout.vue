<template>
  <div class="app-layout">
    <!-- 顶部导航 -->
    <header class="app-header">
      <div class="header-left">
        <el-icon class="menu-toggle" @click="drawerVisible = true"><Fold /></el-icon>
        <div class="logo-section" @click="$router.push('/')">
          <div class="logo-icon">
            <img src="/favicon.svg" alt="FilesCodeBox" class="logo-img" />
          </div>
          <span class="logo-text">{{ configStore.siteName() }}</span>
        </div>
      </div>

      <div class="header-right">
        <LocaleSwitcher />
        <ThemeSwitcher />
        <NotifyBell />
        <UserMenu show-home @command="handleCommand" />
      </div>
    </header>

    <div class="app-body">
      <!-- 侧边栏 -->
      <aside class="app-sidebar">
        <el-menu
          :default-active="$route.path"
          class="sidebar-menu"
          router
        >
          <el-menu-item
            v-for="item in userNavItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ t(item.labelKey) }}</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 主内容 -->
      <main class="app-main">
        <router-view />
      </main>
    </div>

    <!-- 移动端抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="220px"
      :show-close="false"
      class="mobile-drawer"
    >
        <el-menu
          :default-active="$route.path"
          router
          @select="drawerVisible = false"
        >
          <el-menu-item
            v-for="item in userNavItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ t(item.labelKey) }}</span>
          </el-menu-item>
        </el-menu>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Fold
} from '@element-plus/icons-vue'
import { userNavItems } from '@/config/menu'
import UserMenu from '@/components/layout/UserMenu.vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import NotifyBell from '@/components/NotifyBell.vue'

const router = useRouter()
const userStore = useUserStore()
const configStore = useConfigStore()
// 站点名称来自 /api/config（管理后台可改），进布局即拉取（store 内已去重）
configStore.fetchConfig()
const { t } = useI18n()

const drawerVisible = ref(false)

const handleCommand = (command: string) => {
  switch (command) {
    case 'dashboard':
      router.push('/user/dashboard')
      break
    case 'home':
      router.push('/')
      break
    case 'logout':
      userStore.logout()
      ElMessage.success(t('home.loggedOut'))
      router.push('/')
      break
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--color-bg);
}

/* 顶部导航 —— 扁平 */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  padding: 0 var(--spacing-xl);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.logo-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.logo-text {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* 主体:侧边栏 + 内容 */
.app-body {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 56px);
}

.app-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-lg) var(--spacing-md);
}

.sidebar-menu {
  border-right: none !important;

  :deep(.el-menu-item) {
    height: 40px;
    line-height: 40px;
    border-radius: var(--radius-md);
    margin-bottom: 2px;
    color: var(--color-text-secondary);
    font-weight: 500;

    &:hover {
      background: var(--color-muted);
      color: var(--color-text-primary);
    }

    &.is-active {
      background: var(--primary-bg);
      color: var(--primary-color);
    }
  }
}

.app-main {
  flex: 1;
  padding: var(--spacing-2xl) var(--spacing-2xl);
  min-width: 0;
}

/* 汉堡菜单:仅移动端显示 */
.menu-toggle {
  display: none;
  font-size: 20px;
  color: var(--color-text-primary);
  cursor: pointer;
  margin-right: var(--spacing-sm);
}

/* 响应式:移动端隐藏侧边栏,显示汉堡菜单 */
@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex;
  }

  .app-header {
    padding: 0 var(--spacing-md);
  }

  .app-sidebar {
    display: none;
  }

  .app-main {
    padding: var(--spacing-lg) var(--spacing-md);
  }
}
</style>
