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
      ref="uploadRef"
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
      <div
        v-for="(item, idx) in fileList"
        :key="item.uid"
        class="file-item"
        :class="{
          uploading: item.status === 'uploading',
          success: item.status === 'success',
          error: item.status === 'error',
        }"
      >
        <div class="file-icon">
          <el-icon size="32"><Document /></el-icon>
        </div>
        <div class="file-info">
          <div class="file-name">{{ item.file.name }}</div>
          <div class="file-meta">
            <span>{{ formatFileSize(item.file.size) }}</span>
            <span class="file-type">{{ getFileType(item.file.name) }}</span>
            <span v-if="item.status === 'uploading'" class="status uploading">
              {{ item.statusText || t('upload.uploading') }}
            </span>
            <span v-else-if="item.status === 'success'" class="status success">
              <el-icon><CircleCheckFilled /></el-icon> {{ t('common.success') }}
            </span>
            <span v-else-if="item.status === 'error'" class="status error">
              <el-icon><CircleCloseFilled /></el-icon> {{ item.error || t('common.failed') }}
            </span>
            <span v-else class="status pending">
              {{ t('common.optional') }}
            </span>
          </div>
          <el-progress
            v-if="item.status === 'uploading' || item.status === 'success'"
            :percentage="item.progress"
            :stroke-width="4"
            :show-text="false"
            :status="item.status === 'success' ? 'success' : ''"
            class="file-progress"
          />
        </div>
        <el-button
          v-if="item.status === 'uploading'"
          type="danger"
          circle
          size="small"
          @click="cancelFile(idx)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
        <el-button
          v-else
          type="info"
          circle
          size="small"
          @click="removeFile(idx)"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </transition-group>

    <!-- 共享设置（对所有文件生效） -->
    <div v-if="fileList.length > 0" class="upload-settings">
      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Clock /></el-icon>
          {{ t('upload.expire') }}
        </label>
        <div class="expire-inputs">
          <el-input-number
            v-model="form.expire_value"
            :min="1"
            :max="999"
            controls-position="right"
          />
          <el-select v-model="form.expire_style" class="expire-select">
            <el-option :label="t('common.minutes')" value="minute" />
            <el-option :label="t('common.hours')" value="hour" />
            <el-option :label="t('common.days')" value="day" />
            <el-option :label="t('common.weeks')" value="week" />
            <el-option :label="t('common.months')" value="month" />
            <el-option :label="t('common.years')" value="year" />
            <el-option :label="t('common.forever')" value="forever" />
          </el-select>
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Lock /></el-icon>
          {{ t('upload.requirePassword') }}
        </label>
        <el-switch
          v-model="form.require_auth"
          :active-text="t('upload.needPassword')"
          :inactive-text="t('upload.publicAccess')"
        />
        <el-input
          v-if="form.require_auth"
          v-model="form.password"
          type="password"
          :placeholder="t('upload.passwordPlaceholder')"
          show-password
          maxlength="64"
          style="margin-top: 8px"
        />
      </div>

      <div v-if="userStore.isLoggedIn" class="setting-group">
        <label class="setting-label">
          <el-icon><EditPen /></el-icon>
          {{ t('upload.customCode') }}
        </label>
        <el-input
          v-model="form.custom_code"
          :placeholder="t('upload.customCodePlaceholder')"
          maxlength="32"
          style="max-width: 280px"
        />
      </div>

      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Key /></el-icon>
          {{ t('upload.e2e.title') }}
        </label>
        <el-switch v-model="form.e2e" :active-text="t('upload.e2e.on')" :inactive-text="t('upload.e2e.off')" />
        <div class="e2e-hint">{{ t('upload.e2e.hint') }}</div>
      </div>
    </div>

    <!-- 上传按钮 -->
    <el-button
      v-if="fileList.length > 0"
      type="primary"
      size="large"
      class="upload-btn"
      :loading="anyUploading"
      :disabled="!canStart"
      @click="handleUploadAll"
    >
      <template #icon>
        <el-icon v-if="!anyUploading"><Upload /></el-icon>
      </template>
      {{ anyUploading ? t('upload.uploading') : t('upload.startUpload') }}
    </el-button>

    <!-- 预签名上传对话框（>100MB 时使用） -->
    <PresignUploadDialog
      v-if="presignTarget"
      v-model="presignVisible"
      :file="presignTarget.file"
      :options="form"
      @success="onPresignSuccess"
      @failed="onPresignFailed"
    />
  </div>
</template>

<script setup lang="ts">
import { formatFileSize } from '@/utils/format'
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  UploadFilled, Document, InfoFilled, Close, Clock,
  Lock, Upload, CircleCheckFilled, CircleCloseFilled, Key, EditPen
} from '@element-plus/icons-vue'
import { type PresignCompleteData } from '@/api/presign'
import { multiDirect, chunkUploadFile, multiBind, type MultiShareOptions, type MultiShareResult } from '@/api/multifile'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'
import { generateKeyB64, encryptFile } from '@/utils/e2e'
import PresignUploadDialog from './PresignUploadDialog.vue'

const { t } = useI18n()
const configStore = useConfigStore()
const userStore = useUserStore()

const emit = defineEmits<{
  success: [result: { code: string; share_url: string; full_share_url: string; qr_code_data: string; e2e_key?: string }]
}>()

interface FileItem {
  uid: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  statusText: string
  error: string
  xhr?: XMLHttpRequest | null
  // E2E 加密后的密文文件（上传用；file 保留原文件供列表展示）
  uploadFile?: File
}

const fileList = ref<FileItem[]>([])
const isDragging = ref(false)

const form = reactive({
  expire_value: 1,
  expire_style: 'day',
  require_auth: false,
  password: '',
  e2e: false,
  custom_code: '',
})

// E2E 密钥（本次上传生成；随成功事件交给分享对话框拼进链接）
const e2eKey = ref('')

const PRESIGN_THRESHOLD = 100 * 1024 * 1024 // 100MB
const E2E_MAX_BYTES = 100 * 1024 * 1024 // E2E 整文件内存加密上限

const presignVisible = ref(false)
const presignTarget = ref<FileItem | null>(null)

const anyUploading = computed(() => fileList.value.some((f) => f.status === 'uploading'))
// 多文件合并上传的中断控制器（多文件模式无逐项 xhr，用 signal 统一取消）
const multiAbort = ref<AbortController | null>(null)
const canStart = computed(
  () => fileList.value.length > 0 && fileList.value.some((f) => f.status === 'pending' || f.status === 'error')
)


const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image',
    pdf: 'PDF', doc: 'Word', docx: 'Word',
    xls: 'Excel', xlsx: 'Excel',
    zip: 'Zip', rar: 'Zip',
    mp4: 'Video', mp3: 'Audio',
  }
  return typeMap[ext] || 'File'
}

const addFiles = (files: FileList | File[]) => {
  const arr = Array.from(files)
  for (const f of arr) {
    fileList.value.push({
      uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      status: 'pending',
      progress: 0,
      statusText: '',
      error: '',
      xhr: null,
    })
  }
}

const handleFileChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    addFiles([uploadFile.raw])
  }
}

const removeFile = (idx: number) => {
  const item = fileList.value[idx]
  if (item?.xhr) {
    try { item.xhr.abort() } catch { /* noop */ }
  }
  fileList.value.splice(idx, 1)
}

const cancelFile = (idx: number) => {
  const item = fileList.value[idx]
  if (!item) return
  if (item.xhr) {
    try { item.xhr.abort() } catch { /* noop */ }
  }
  item.status = 'error'
  item.error = t('upload.presign.abort')
  item.statusText = ''
}

const uploadOne = (item: FileItem) => {
  return new Promise<{ code: string; share_url: string; full_share_url: string; qr_code_data: string }>((resolve, reject) => {
    item.status = 'uploading'
    item.progress = 0
    item.error = ''
    item.statusText = t('upload.prepare')

    // 决定走哪条路径
    if (item.file.size > PRESIGN_THRESHOLD) {
      if (form.e2e) {
        throw new Error(t('upload.e2e.tooLarge'))
      }
      // 大文件走预签名
      item.statusText = t('upload.largeFileHint')
      presignTarget.value = item
      presignVisible.value = true
      // 等 dialog complete → 走 onPresignSuccess → resolve
      const stop = setInterval(() => {
        if (item.status === 'success') {
          clearInterval(stop)
          const r = (item as FileItem & { _result?: PresignCompleteData })._result
          resolve({
            code: r?.code || '',
            share_url: r?.url || '',
            full_share_url: r?.url || '',
            qr_code_data: r?.url || '',
          })
        } else if (item.status === 'error') {
          clearInterval(stop)
          reject(new Error(item.error || 'Failed'))
        }
      }, 200)
      return
    }

    // 小文件走传统 /share/file/
    const formData = new FormData()
    formData.append('file', item.uploadFile || item.file)
    formData.append('expire_value', String(form.expire_value))
    formData.append('expire_style', form.expire_style)
    if (form.require_auth) {
      formData.append('require_auth', 'true')
      if (form.password) formData.append('password', form.password)
    }
    if (form.e2e && item.uploadFile) formData.append('encrypted', 'true')
    if (userStore.isLoggedIn && form.custom_code) formData.append('custom_code', form.custom_code)

    const xhr = new XMLHttpRequest()
    item.xhr = xhr
    xhr.open('POST', '/share/file/')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded / e.total) * 100)
        item.statusText = t('upload.uploading')
      }
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { code: number; data?: { code: string; url: string; share_url?: string; full_share_url?: string; qr_code_data?: string }; message?: string }
        if (xhr.status >= 200 && xhr.status < 300 && data.code === 200 && data.data) {
          item.status = 'success'
          item.progress = 100
          item.statusText = t('common.success')
          // 后端返回 { code, url }，补齐首页 handleShareSuccess 期望的字段
          const d = data.data
          const fullUrl = d.full_share_url || d.share_url || d.url || ''
          resolve({
            code: d.code,
            share_url: d.share_url || d.url || '',
            full_share_url: fullUrl,
            qr_code_data: d.qr_code_data || fullUrl,
          })
        } else {
          item.status = 'error'
          item.error = data.message || `HTTP ${xhr.status}`
          reject(new Error(item.error))
        }
      } catch (e: unknown) {
        item.status = 'error'
        item.error = e instanceof Error ? e.message : 'Parse error'
        reject(e)
      }
    }
    xhr.onerror = () => {
      item.status = 'error'
      item.error = 'Network error'
      reject(new Error('Network error'))
    }
    xhr.onabort = () => {
      item.status = 'error'
      item.error = 'Cancelled'
      reject(new Error('Cancelled'))
    }
    xhr.send(formData)
  })
}

const handleUploadAll = async () => {
  if (form.require_auth && !form.password) {
    ElMessage.warning(t('upload.passwordRequired'))
    return
  }
  const pending = fileList.value.filter((f) => f.status === 'pending' || f.status === 'error')
  for (const item of pending) {
    if (item.status === 'error' && item.xhr === null) {
      // 重置
      item.status = 'pending'
      item.error = ''
    }
  }

  // E2E：生成密钥并加密全部待传文件（仅支持 ≤100MB；密文作为实际上传内容）
  e2eKey.value = ''
  if (form.e2e && pending.length > 0) {
    const tooBig = pending.filter((i) => i.file.size > E2E_MAX_BYTES)
    if (tooBig.length > 0) {
      ElMessage.error(t('upload.e2e.tooLarge'))
      return
    }
    try {
      e2eKey.value = await generateKeyB64()
      for (const item of pending) {
        item.status = 'uploading'
        item.statusText = t('upload.e2e.encrypting')
        item.uploadFile = await encryptFile(e2eKey.value, item.file)
        item.status = 'pending'
        item.statusText = ''
      }
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : t('upload.e2e.failed'))
      return
    }
  }

  // 多文件：合并为一个分享（一个取件码 ↔ N 个文件）
  const multiItems = pending.filter((f) => f.status === 'pending')
  if (multiItems.length > 1) {
    await uploadAllAsMultiShare(multiItems)
    return
  }

  for (const item of pending) {
    try {
      const result = await uploadOne(item)
      // 触发成功事件（仅第一个文件弹分享对话框；多文件只 emit 给 home 处理）
      emit('success', { ...result, e2e_key: form.e2e ? e2eKey.value : undefined })
      ElMessage.success(`${item.file.name}: ${t('upload.success')}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      ElMessage.error(`${item.file.name}: ${msg}`)
    }
  }
}

// ===== 多文件合并上传（一个分享） =====

const CHUNK_SIZE = 5 * 1024 * 1024 // 分片通道单片 5MB

const uploadAllAsMultiShare = async (items: FileItem[]) => {
  const opts: MultiShareOptions = {
    expire_value: form.expire_value,
    expire_style: form.expire_style,
    require_auth: form.require_auth,
    password: form.password,
    encrypted: form.e2e,
    custom_code: form.custom_code || undefined,
  }
  items.forEach((i) => {
    i.status = 'uploading'
    i.progress = 0
    i.error = ''
    i.statusText = t('upload.prepare')
  })
  multiAbort.value = new AbortController()

  // 单请求体上限：后端 Hertz max body = upload_size（未知时保守取 8MB），
  // 留 1MB 表单开销余量；超限或单文件超限整体走分片通道
  const bodyCap = Math.max((configStore.config?.uploadSize || 0) - 1024 * 1024, 0) || 8 * 1024 * 1024
  const totalBytes = items.reduce((s, i) => s + i.file.size, 0)
  const useDirect = totalBytes <= bodyCap && items.every((i) => i.file.size <= bodyCap)

  try {
    let result: MultiShareResult
    if (useDirect) {
      // 聚合进度按字节均摊到各文件行（上传的是密文（若启用 E2E）或原文件）
      const uploadFiles = items.map((i) => i.uploadFile || i.file)
      const capBytes = uploadFiles.map((f) => f.size)
      result = await multiDirect(
        uploadFiles,
        opts,
        (loaded, total) => {
          let acc = 0
          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx]
            if (!item) continue
            const cap = Math.max(capBytes[idx] ?? item.file.size, 1)
            const done = Math.min(Math.max(loaded - acc, 0), cap)
            item.progress = Math.round((done / cap) * 100)
            item.statusText = t('upload.uploading')
            acc += cap
          }
          void total
        },
        multiAbort.value.signal
      )
    } else {
      // 大文件/大批量：逐文件分片上传（复用 chunk 通道任意大小能力），最后一次性绑定
      const entries: Array<{ upload_id: string }> = []
      for (const item of items) {
        if (multiAbort.value.signal.aborted) throw new Error('Cancelled')
        item.statusText = t('upload.uploading')
        const uploadId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
        await chunkUploadFile(item.uploadFile || item.file, uploadId, CHUNK_SIZE, (loaded, total) => {
          item.progress = Math.round((loaded / Math.max(total, 1)) * 100)
        }, multiAbort.value.signal)
        entries.push({ upload_id: uploadId })
      }
      itemStatusBind(items)
      result = await multiBind(entries, opts)
    }

    items.forEach((i) => {
      i.status = 'success'
      i.progress = 100
      i.statusText = t('common.success')
    })
    emit('success', {
      code: result.code,
      share_url: result.share_url || result.url,
      full_share_url: result.url,
      qr_code_data: result.url,
      e2e_key: form.e2e ? e2eKey.value : undefined,
    })
    ElMessage.success(t('upload.success'))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed'
    items.forEach((i) => {
      if (i.status !== 'success') {
        i.status = 'error'
        i.error = msg
      }
    })
    ElMessage.error(msg)
  } finally {
    multiAbort.value = null
  }
}

// 绑定阶段提示（分片已传完、等待服务端合并）
const itemStatusBind = (items: FileItem[]) => {
  items.forEach((i) => {
    i.progress = 100
    i.statusText = t('upload.prepare')
  })
}

const onPresignSuccess = (result: PresignCompleteData) => {
  if (presignTarget.value) {
    const item = presignTarget.value
    item.status = 'success'
    item.progress = 100
    item.statusText = t('common.success')
    ;(item as FileItem & { _result?: PresignCompleteData })._result = result
  }
  presignVisible.value = false
  presignTarget.value = null
}

const onPresignFailed = (e: unknown) => {
  if (presignTarget.value) {
    presignTarget.value.status = 'error'
    presignTarget.value.error = e instanceof Error ? e.message : 'Presign failed'
  }
  presignVisible.value = false
  presignTarget.value = null
}

// 全局拖拽
const onWindowDragOver = (e: DragEvent) => {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault()
    isDragging.value = true
  }
}

const onWindowDragLeave = (e: DragEvent) => {
  if (e.relatedTarget === null) {
    isDragging.value = false
  }
}

const onWindowDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    e.preventDefault()
    isDragging.value = false
    addFiles(e.dataTransfer.files)
  }
}

// 全局粘贴
const onWindowPaste = (e: ClipboardEvent) => {
  if (!e.clipboardData) return
  const clipItems = e.clipboardData.items
  const files: File[] = []
  for (let i = 0; i < clipItems.length; i++) {
    const it = clipItems[i]
    if (!it) continue
    if (it.kind === 'file') {
      const f = it.getAsFile()
      if (f) files.push(f)
    }
  }
  if (files.length > 0) {
    e.preventDefault()
    addFiles(files)
    ElMessage.success(`Pasted ${files.length} file(s)`)
  }
}

onMounted(() => {
  window.addEventListener('dragover', onWindowDragOver)
  window.addEventListener('dragleave', onWindowDragLeave)
  window.addEventListener('drop', onWindowDrop)
  window.addEventListener('paste', onWindowPaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragover', onWindowDragOver)
  window.removeEventListener('dragleave', onWindowDragLeave)
  window.removeEventListener('drop', onWindowDrop)
  window.removeEventListener('paste', onWindowPaste)
  // 中断所有在传 xhr
  fileList.value.forEach((f) => {
    if (f.xhr) {
      try { f.xhr.abort() } catch { /* noop */ }
    }
  })
  multiAbort.value?.abort()
})
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

/* 文件列表 */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.file-item.uploading {
  border-color: var(--primary-color);
  background: var(--color-alert-bg);
}

.file-item.success {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.file-item.error {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
}

.file-icon {
  width: 48px;
  height: 48px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 14px;
  word-break: break-all;
  margin-bottom: 4px;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
  align-items: center;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.status.success { color: var(--color-success); }
.status.error { color: var(--color-danger); }
.status.uploading { color: var(--primary-color); }
.status.pending { color: var(--color-text-secondary); }

.file-progress {
  margin-top: 8px;
}

/* 设置 */
.upload-settings {
  margin-bottom: 16px;
  padding: 20px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.e2e-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--color-text-regular);
  font-size: 14px;
}

.expire-inputs {
  display: flex;
  gap: 12px;
}

.expire-select {
  width: 120px;
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
