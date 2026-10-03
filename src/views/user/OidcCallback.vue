<template>
  <div class="oidc-callback-container">
    <div class="callback-card">
      <template v-if="error">
        <el-result icon="error" title="OIDC 登录失败" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="$router.push('/user/login')">返回登录</el-button>
          </template>
        </el-result>
      </template>
      <template v-else>
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <p>登录成功，正在跳转...</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const router = useRouter()
const error = ref('')

onMounted(() => {
  const token = route_token()
  if (!token) {
    error.value = '回调缺少 token 参数'
    return
  }
  localStorage.setItem('token', token)
  ElMessage.success('登录成功')
  router.push('/user/dashboard')
})

// hash 路由 query 中取 token（#/oidc/callback?token=xxx）
function route_token(): string {
  const hash = window.location.hash || ''
  const qIndex = hash.indexOf('?')
  if (qIndex < 0) return ''
  const params = new URLSearchParams(hash.slice(qIndex + 1))
  return params.get('token') || ''
}
</script>

<style scoped>
.oidc-callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}
.callback-card {
  text-align: center;
  color: var(--color-text-secondary);
}
.loading-icon {
  animation: spin 1s linear infinite;
  color: var(--primary-color);
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
