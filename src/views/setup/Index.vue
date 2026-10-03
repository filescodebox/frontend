<template>
  <div class="setup-container">
    <div class="setup-card">
      <!-- Logo 区 -->
      <div class="setup-header">
        <div class="logo-icon">
          <el-icon size="22"><Box /></el-icon>
        </div>
        <h1>{{ t('setup.title') }}</h1>
        <p class="setup-desc">{{ t('setup.description') }}</p>
      </div>

      <el-alert
        v-if="alreadyInitialized"
        :title="t('setup.alreadyInitialized')"
        type="info"
        show-icon
        :closable="false"
        class="setup-alert"
      />

      <el-form
        ref="setupFormRef"
        :model="setupForm"
        :rules="rules"
        label-position="top"
        :disabled="alreadyInitialized"
        @submit.prevent="handleSetup"
      >
        <el-form-item :label="t('setup.adminUsername')" prop="adminUsername">
          <el-input
            v-model="setupForm.adminUsername"
            :placeholder="t('setup.adminUsername')"
            prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item :label="t('setup.adminEmail')" prop="adminEmail">
          <el-input
            v-model="setupForm.adminEmail"
            type="email"
            :placeholder="t('setup.adminEmail')"
            prefix-icon="Message"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item :label="t('setup.adminPassword')" prop="adminPassword">
          <el-input
            v-model="setupForm.adminPassword"
            type="password"
            :placeholder="t('setup.adminPassword')"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item :label="t('setup.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="setupForm.confirmPassword"
            type="password"
            :placeholder="t('setup.confirmPassword')"
            prefix-icon="Lock"
            size="large"
            show-password
            clearable
            @keyup.enter="handleSetup"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleSetup"
          >
            {{ t('setup.submit') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="setup-footer">
        <el-link type="primary" underline="never" @click="$router.push('/user/login')">
          {{ t('setup.goLogin') }}
        </el-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Box } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { publicApi } from '@/api/public'

const router = useRouter()
const { t } = useI18n()

const setupFormRef = ref<FormInstance>()
const loading = ref(false)
const alreadyInitialized = ref(false)

const setupForm = reactive({
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (value !== setupForm.adminPassword) {
    callback(new Error(t('setup.passwordMismatch')))
  } else {
    callback()
  }
}

// 校验规则与后端 validateInitializeRequest 对齐（用户名≥3 / 密码≥6 / 邮箱含@）
const rules: FormRules = {
  adminUsername: [
    { required: true, message: () => t('setup.adminUsername'), trigger: 'blur' },
    { min: 3, max: 32, message: t('setup.usernameRule'), trigger: 'blur' }
  ],
  adminEmail: [
    { required: true, message: () => t('setup.adminEmail'), trigger: 'blur' },
    { type: 'email', message: t('setup.emailRule'), trigger: 'blur' }
  ],
  adminPassword: [
    { required: true, message: () => t('setup.adminPassword'), trigger: 'blur' },
    { min: 6, max: 64, message: t('setup.passwordRule'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: () => t('setup.confirmPassword'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 已初始化则直接回首页（不做全局守卫强跳，避免路由里发请求）
onMounted(async () => {
  try {
    const res = await publicApi.checkInitialization()
    if (res.initialized) {
      alreadyInitialized.value = true
      router.replace('/')
    }
  } catch {
    // 检查失败不阻断页面（后端不可达时用户可看到表单）
  }
})

const handleSetup = async () => {
  if (!setupFormRef.value || alreadyInitialized.value) return

  try {
    await setupFormRef.value.validate()
    loading.value = true

    // 成功：HTTP 200 + {message, username}；失败：拦截器抛错（HTTP 400/403/500）
    const res = await publicApi.initializeSystem({
      admin_username: setupForm.adminUsername,
      admin_password: setupForm.adminPassword,
      admin_email: setupForm.adminEmail
    })
    ElMessage.success(res.message || t('setup.success'))
    router.push('/user/login')
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    ElMessage.error(msg || t('setup.failed'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.setup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-bg);
  padding: var(--spacing-xl);
}

.setup-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-2xl);
}

.setup-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: var(--spacing-md);
}

.setup-header h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.setup-desc {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.setup-alert {
  margin-bottom: var(--spacing-lg);
}

.submit-btn {
  width: 100%;
}

.setup-footer {
  text-align: center;
  margin-top: var(--spacing-sm);
}
</style>
