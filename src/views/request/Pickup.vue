<template>
  <div class="request-pickup-container">
    <div class="main-wrapper">
      <div class="glass-card">
        <!-- 加载中 -->
        <div v-if="loading" class="center-section">
          <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <!-- 链接无效 -->
        <el-result v-else-if="error" icon="error" :title="error">
          <template #extra>
            <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
          </template>
        </el-result>

        <!-- 投递表单 -->
        <template v-else-if="view">
          <div class="header">
            <img src="/favicon.svg" alt="" class="logo" />
            <div>
              <h1>文件投递</h1>
              <p v-if="view.title">{{ view.title }}</p>
            </div>
          </div>
          <el-divider />
          <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px"
            title="上传的文件将直接投递给链接主人，仅其可见" />

          <el-upload
            :auto-upload="false"
            :on-change="handleChange"
            :show-file-list="true"
            multiple
            drag
          >
            <el-icon size="48" class="icon-primary"><UploadFilled /></el-icon>
            <div class="upload-text">拖拽或点击选择要投递的文件</div>
            <template #tip>
              <div class="el-upload__tip">
                <span v-if="view.max_files > 0">最多 {{ view.max_files }} 个文件；</span>
                <span v-if="view.max_bytes > 0">总大小 ≤ {{ formatSize(view.max_bytes) }}</span>
              </div>
            </template>
          </el-upload>

          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="uploading"
            :disabled="files.length === 0"
            @click="submit"
          >
            {{ uploading ? `投递中 ${progress}%` : '立即投递' }}
          </el-button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type UploadFile } from 'element-plus'
import { Loading, UploadFilled } from '@element-plus/icons-vue'
import { requestApi, guestSubmit, type RequestPublicView } from '@/api/request'

const route = useRoute()
const token = ref('')
const view = ref<RequestPublicView | null>(null)
const loading = ref(true)
const error = ref('')
const uploading = ref(false)
const progress = ref(0)
const files = ref<File[]>([])

const formatSize = (bytes: number): string => {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const handleChange = (f: UploadFile) => {
  if (f.raw) files.value.push(f.raw)
}

const submit = async () => {
  if (files.value.length === 0) return
  uploading.value = true
  progress.value = 0
  try {
    await guestSubmit(token.value, files.value, (p) => (progress.value = p))
    ElMessage.success('投递成功！对方已收到通知')
    files.value = []
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '投递失败')
  } finally {
    uploading.value = false
  }
}

onMounted(async () => {
  token.value = (route.params.token as string) || ''
  try {
    const res = await requestApi.getPublic(token.value)
    if (res.code === 200 || res.code === 0) view.value = res.data
    else error.value = res.message || '链接无效'
  } catch (e: any) {
    error.value = e?.message || '链接无效或已过期'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.request-pickup-container {
  min-height: 100vh;
  background: var(--color-bg);
}
.main-wrapper {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  align-items: center;
}
.glass-card {
  width: 100%;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-xs);
}
.center-section {
  text-align: center;
  padding: 60px 20px;
}
.loading-icon {
  animation: spin 1s linear infinite;
  color: var(--primary-color);
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
}
.header h1 {
  margin: 0;
  font-size: 22px;
  color: var(--color-text-primary);
}
.header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.upload-text {
  margin-top: 8px;
  color: var(--color-text-secondary);
}
.icon-primary {
  color: var(--primary-color);
}
.submit-btn {
  width: 100%;
  margin-top: 20px;
  height: 48px;
  font-weight: 600;
}
</style>
