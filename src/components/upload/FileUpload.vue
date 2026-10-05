<template>
  <div class="file-upload-container">
    <!-- 全局拖拽高亮 -->
    <transition name="fade">
      <div v-if="isDragging" class="global-drop-overlay">
        <div class="drop-hint">
          <el-icon size="64" class="icon-primary"><UploadFilled /></el-icon>
          <h2>{{ t('upload.dragHint') }}</h2>
        </div>
      </div>
    </transition>

    <!-- 选择区 -->
    <el-upload
      :auto-upload="false"
      :on-change="handleFileChange"
      :show-file-list="false"
      :multiple="true"
      drag
      class="upload-dragger"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <el-icon size="60" class="icon-primary"><UploadFilled /></el-icon>
        </div>
        <div class="upload-text">
          <h3>{{ t('upload.dragHint') }}</h3>
          <p>{{ t('upload.clickHint') }}</p>
        </div>
        <div class="upload-hint">
          <el-icon><InfoFilled /></el-icon>
          {{ t('upload.formatHint') }}
        </div>
      </div>
    </el-upload>

    <!-- 多文件列表 -->
    <transition-group name="file-list" tag="div" class="files-list">
      <FileItemRow
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @remove="remove"
        @cancel="cancel"
      />
    </transition-group>

    <!-- 共享设置（对所有文件生效） -->
    <ShareSettingsForm v-if="tasks.length > 0" :settings="settings" />

    <!-- 上传按钮 -->
    <el-button
      v-if="tasks.length > 0"
      type="primary"
      size="large"
      class="upload-btn"
      :loading="isUploading"
      :disabled="!canStart"
      @click="handleUploadAll"
    >
      <template #icon>
        <el-icon v-if="!isUploading"><Upload /></el-icon>
      </template>
      {{ isUploading ? t('upload.uploading') : t('upload.startUpload') }}
    </el-button>

    <!-- 预签名直传对话框（单文件 >100MB；Promise 化，由队列经 presign 回调驱动） -->
    <PresignUploadDialog ref="presignDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { UploadFilled, InfoFilled, Upload } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'
import { useShareSettings } from '@/composables/useShareSettings'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { useFileDrop } from '@/composables/useFileDrop'
import type { ShareResult } from '@/types/share'
import PresignUploadDialog from './PresignUploadDialog.vue'
import ShareSettingsForm from '@/components/share/ShareSettingsForm.vue'
import FileItemRow from './FileItemRow.vue'

/**
 * 文件上传入口（2026-10-06 W2 瘦身为装配层，原 909 行）：
 * 编排=useUploadQueue（E2E/通道决策/进度/中断），设置=useShareSettings，
 * 拖拽粘贴=useFileDrop，单行=FileItemRow，大文件弹窗=PresignUploadDialog（Promise）。
 * emit 契约不变：success: ShareResult（home 页零改动）。
 */
const { t } = useI18n()
const configStore = useConfigStore()
const userStore = useUserStore()

const emit = defineEmits<{ success: [result: ShareResult] }>()

const { settings, validate } = useShareSettings()
const presignDialog = ref<InstanceType<typeof PresignUploadDialog> | null>(null)

// 单请求体上限：后端 Hertz max body = upload_size（未知时保守取 8MB），留 1MB 表单开销余量
const queue = useUploadQueue({
  settings,
  t,
  bodyCap: () => Math.max((configStore.config?.uploadSize || 0) - 1024 * 1024, 0) || 8 * 1024 * 1024,
  isLoggedIn: () => userStore.isLoggedIn,
  presign: (file, s) =>
    presignDialog.value!.open(file, {
      expire_value: s.expire_value,
      expire_style: s.expire_style,
      require_auth: s.require_auth,
      password: s.password || undefined,
    }),
})
const { tasks, isUploading, canStart, addFiles, remove, cancel, start, dispose } = queue

const { isDragging } = useFileDrop({ onFiles: addFiles })

const handleFileChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    addFiles([uploadFile.raw])
  }
}

const handleUploadAll = async () => {
  if (!validate()) {
    ElMessage.warning(t('upload.passwordRequired'))
    return
  }
  const outcome = await start()
  if (outcome) {
    emit('success', outcome)
  }
}

onBeforeUnmount(() => dispose())
</script>

<style scoped>
.file-upload-container {
  padding: 20px 0;
  position: relative;
}

.global-drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(var(--primary-color-rgb), 0.08);
  backdrop-filter: blur(4px);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-hint {
  text-align: center;
  color: var(--primary-color);
  background: var(--color-elevated, white);
  padding: 48px 64px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
}

.drop-hint h2 {
  margin: 16px 0 0;
  font-size: 24px;
}

.upload-dragger {
  margin-bottom: 24px;
}

.upload-dragger :deep(.el-upload-dragger) {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-muted);
  transition: all 0.2s ease;
  padding: 40px 20px;
}

.upload-dragger :deep(.el-upload-dragger:hover) {
  border-color: var(--primary-color);
}

.upload-content {
  text-align: center;
}

.upload-icon {
  margin-bottom: 16px;
}

.upload-text h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text-regular);
}

.upload-text p {
  margin: 0;
  color: var(--color-text-secondary);
}

.upload-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.upload-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: var(--primary-color);
  border: none;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.upload-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.upload-btn:disabled {
  opacity: 0.5;
}

.icon-primary {
  color: var(--primary-color);
}

/* 过渡 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.file-list-enter-active, .file-list-leave-active {
  transition: all 0.3s;
}
.file-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.file-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
