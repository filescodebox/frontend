<template>
  <div class="files-container">
    <el-card shadow="never" class="files-card">
      <div class="card-header">
        <div class="header-title">
          <h2>文件管理</h2>
          <p>管理系统中的所有分享文件（支持按上传者 IP / 状态 / 类型定位滥用资源）</p>
        </div>
        <div class="header-actions">
          <el-button
            type="danger"
            plain
            :disabled="!selectedIds.length"
            @click="batchSetStatus('blocked')"
          >
            批量禁用{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
          </el-button>
          <el-button
            type="success"
            plain
            :disabled="!selectedIds.length"
            @click="batchSetStatus('normal')"
          >
            批量恢复
          </el-button>
          <el-button
            type="warning"
            plain
            :disabled="!selectedIds.length"
            @click="batchExtendVisible = true"
          >
            批量延期
          </el-button>
          <el-button
            type="danger"
            plain
            :disabled="!selectedIds.length"
            @click="batchDelete"
          >
            批量删除
          </el-button>
          <el-button @click="fetchFiles" :loading="loading" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>

      <el-divider />

      <!-- 治理筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.keyword"
          placeholder="取件码/文件名关键词"
          clearable
          style="width: 180px"
          @keyup.enter="applyFilters"
        />
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px">
          <el-option label="正常" value="normal" />
          <el-option label="已禁用" value="blocked" />
          <el-option label="待审核" value="pending_review" />
        </el-select>
        <el-select v-model="filters.upload_type" placeholder="上传类型" clearable style="width: 130px">
          <el-option label="匿名" value="anonymous" />
          <el-option label="登录用户" value="authenticated" />
        </el-select>
        <el-select v-model="filters.expired" placeholder="过期状态" clearable style="width: 120px">
          <el-option label="未过期" value="false" />
          <el-option label="已过期" value="true" />
        </el-select>
        <el-input
          v-model="filters.owner_ip"
          placeholder="上传者 IP"
          clearable
          style="width: 140px"
          @keyup.enter="applyFilters"
        />
        <el-input
          v-model="filters.user_id"
          placeholder="用户 ID"
          clearable
          style="width: 110px"
          @keyup.enter="applyFilters"
        />
        <el-button type="primary" @click="applyFilters">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table
        :data="filesList"
        v-loading="loading"
        class="files-table"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="文件信息" min-width="230">
          <template #default="{ row }">
            <div class="file-info">
              <div class="file-icon">
                <el-icon size="32" :color="getFileIconColor(row)">
                  <component :is="getFileIcon(row)" />
                </el-icon>
              </div>
              <div class="file-details">
                <div class="file-name">
                  {{ row.file_name || row.code }}
                  <el-tag v-if="row.is_text" size="small" type="success">文本</el-tag>
                </div>
                <div v-if="row.is_text && row.text_preview" class="text-preview">
                  {{ row.text_preview }}
                </div>
                <div class="file-code">
                  <el-tag size="small" type="info">
                    {{ row.code }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="size" label="大小" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ formatFileSize(row.size) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="上传者" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.user_id" type="info">
              ID: {{ row.user_id }}
            </el-tag>
            <span v-else class="anonymous">匿名</span>
          </template>
        </el-table-column>

        <el-table-column prop="owner_ip" label="上传 IP" width="130" align="center">
          <template #default="{ row }">
            <span class="owner-ip">{{ row.owner_ip || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="used_count" label="下载次数" width="96" align="center">
          <template #default="{ row }">
            <div class="download-count">
              <el-icon><Download /></el-icon>
              {{ row.used_count || 0 }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="expired_at" label="过期时间" width="170">
          <template #default="{ row }">
            <div :class="['expire-time', { expired: isExpired(row.expired_at) }]">
              {{ formatDate(row.expired_at) }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'blocked'"
              type="warning"
              size="small"
              round
              @click="setStatus(row, 'blocked')"
            >
              禁用
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              round
              @click="setStatus(row, 'normal')"
            >
              恢复
            </el-button>
            <el-button
              v-if="!row.is_text"
              size="small"
              round
              @click="downloadFile(row)"
            >
              下载
            </el-button>
            <el-button size="small" round @click="openEdit(row)">编辑</el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteFile(row)"
              round
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
        />
      </div>
    </el-card>

    <!-- 编辑（延期/次数） -->
    <el-dialog v-model="editVisible" title="编辑分享" width="420px">
      <el-form label-width="100px">
        <el-form-item label="文件">
          <span>{{ editTarget?.file_name || editTarget?.code }}</span>
        </el-form-item>
        <el-form-item label="延长有效期">
          <el-select v-model="editForm.expireValue" style="width: 100%">
            <el-option label="1 天" :value="1" />
            <el-option label="7 天" :value="7" />
            <el-option label="30 天" :value="30" />
            <el-option label="90 天" :value="90" />
            <el-option label="1 年" :value="365" />
          </el-select>
        </el-form-item>
        <el-form-item label="剩余次数">
          <el-input-number v-model="editForm.expiredCount" :min="-1" :max="999999" />
          <div class="form-hint">-1 表示不限次数</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量延期 -->
    <el-dialog v-model="batchExtendVisible" title="批量延期" width="420px">
      <p class="form-hint">将选中的 {{ selectedIds.length }} 个分享的过期时间重置为：</p>
      <el-select v-model="batchExtendValue" style="width: 100%">
        <el-option label="1 天" :value="1" />
        <el-option label="7 天" :value="7" />
        <el-option label="30 天" :value="30" />
        <el-option label="90 天" :value="90" />
        <el-option label="1 年" :value="365" />
      </el-select>
      <template #footer>
        <el-button @click="batchExtendVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitBatchExtend">确认延期</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, Document, Picture, Download, Delete,
  VideoPlay, Headset, Reading
} from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

type FileStatus = 'normal' | 'blocked' | 'pending_review'

const loading = ref(false)
const filesList = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 治理筛选条件（对应 GET /admin/files/filter）
const filters = reactive({
  keyword: '',
  status: '',
  upload_type: '',
  expired: '',
  owner_ip: '',
  user_id: ''
})

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  try {
    // 后端为 "2006-01-02 15:04:05" 格式，Safari 不认空格分隔——归一为 T
    return new Date(dateStr.replace(' ', 'T')).toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}

const isExpired = (dateStr: string): boolean => {
  if (!dateStr) return false
  try {
    return new Date(dateStr.replace(' ', 'T')) < new Date()
  } catch {
    return false
  }
}

const statusLabel = (status: string): string => {
  switch (status) {
    case 'blocked': return '已禁用'
    case 'pending_review': return '待审核'
    default: return '正常'
  }
}

const statusTagType = (status: string): 'success' | 'danger' | 'warning' => {
  switch (status) {
    case 'blocked': return 'danger'
    case 'pending_review': return 'warning'
    default: return 'success'
  }
}

const getFileIcon = (row: any) => {
  const filename = row.file_name || ''
  const ext = filename.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, any> = {
    'jpg': Picture,
    'jpeg': Picture,
    'png': Picture,
    'gif': Picture,
    'mp4': VideoPlay,
    'mp3': Headset,
    'txt': Reading,
    'pdf': Document
  }

  return iconMap[ext || ''] || Document
}

const getFileIconColor = (row: any) => {
  const filename = row.file_name || ''
  const ext = filename.split('.').pop()?.toLowerCase()

  const colorMap: Record<string, string> = {
    'jpg': '#409eff',
    'jpeg': '#409eff',
    'png': '#409eff',
    'gif': '#409eff',
    'mp4': '#67c23a',
    'mp3': '#e6a23c',
    'txt': '#909399',
    'pdf': '#f56c6c'
  }

  return colorMap[ext || ''] || '#606266'
}

const fetchFiles = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      page_size: pagination.pageSize
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status
    if (filters.upload_type) params.upload_type = filters.upload_type
    if (filters.expired) params.expired = filters.expired
    if (filters.owner_ip) params.owner_ip = filters.owner_ip
    if (filters.user_id) {
      const uid = Number(filters.user_id)
      if (Number.isFinite(uid) && uid > 0) params.user_id = uid
    }

    const res = await adminApi.getFilesFiltered(params)
    if (res.code === 200 && res.data) {
      filesList.value = res.data.items || []
      pagination.total = res.data.total || 0
    } else {
      filesList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取文件列表失败:', error)
    ElMessage.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  pagination.page = 1
  fetchFiles()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.status = ''
  filters.upload_type = ''
  filters.expired = ''
  filters.owner_ip = ''
  filters.user_id = ''
  pagination.page = 1
  fetchFiles()
}

// ==================== 管控状态机 ====================
const setStatus = async (row: any, status: FileStatus) => {
  const action = status === 'blocked' ? '禁用' : '恢复'
  try {
    await ElMessageBox.confirm(
      `确定要${action}分享 ${row.file_name || row.code} 吗？` +
        (status === 'blocked' ? '禁用后任何人无法取件，记录保留可恢复。' : ''),
      `确认${action}`,
      { type: status === 'blocked' ? 'warning' : 'info' }
    )
  } catch {
    return
  }
  try {
    const res = await adminApi.setFileStatus(row.id, status)
    if (res.code === 0 || res.code === 200) {
      ElMessage.success(`${action}成功`)
      await fetchFiles()
    } else {
      ElMessage.error(res.message || `${action}失败`)
    }
  } catch (e: any) {
    ElMessage.error(e.message || `${action}失败`)
  }
}

const batchSetStatus = async (status: FileStatus) => {
  const action = status === 'blocked' ? '禁用' : '恢复'
  try {
    await ElMessageBox.confirm(
      `确定要批量${action}选中的 ${selectedIds.value.length} 个分享吗？`,
      `批量${action}`,
      { type: status === 'blocked' ? 'warning' : 'info' }
    )
  } catch {
    return
  }
  try {
    const res = await adminApi.batchSetFileStatus(selectedIds.value, status)
    if (res.code === 0 || res.code === 200) {
      ElMessage.success(`已${action} ${res.data?.affected ?? selectedIds.value.length} 个`)
      await fetchFiles()
    } else {
      ElMessage.error(res.message || `批量${action}失败`)
    }
  } catch (e: any) {
    ElMessage.error(e.message || `批量${action}失败`)
  }
}

const deleteFile = async (file: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件 ${file.file_name || file.code} 吗？`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    // 使用 code 而不是 ID
    const res = await adminApi.deleteFileByCode(file.code)
    if (res.code === 200 || res.code === 0) {
      ElMessage.success('删除成功')
      await fetchFiles()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ==================== 批量操作 / 编辑 / 下载 ====================
const saving = ref(false)
const selectedRows = ref<any[]>([])
const selectedIds = computed(() => selectedRows.value.map((r) => r.id).filter(Boolean))

const onSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个分享吗？`,
      '批量删除',
      { type: 'warning' }
    )
  } catch {
    return
  }
  saving.value = true
  try {
    const res = await adminApi.batchDeleteFilesByIds(selectedIds.value)
    if (res.code === 0 || res.code === 200) {
      ElMessage.success(`已删除 ${res.data?.deleted ?? selectedIds.value.length} 个`)
      await fetchFiles()
    } else {
      ElMessage.error(res.message || '批量删除失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '批量删除失败')
  } finally {
    saving.value = false
  }
}

const batchExtendVisible = ref(false)
const batchExtendValue = ref(7)
const submitBatchExtend = async () => {
  saving.value = true
  try {
    const res = await adminApi.batchExtendFiles(selectedIds.value, batchExtendValue.value, 'day')
    if (res.code === 0 || res.code === 200) {
      ElMessage.success(`已延期 ${res.data?.extended ?? selectedIds.value.length} 个`)
      batchExtendVisible.value = false
      await fetchFiles()
    } else {
      ElMessage.error(res.message || '批量延期失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '批量延期失败')
  } finally {
    saving.value = false
  }
}

const editVisible = ref(false)
const editTarget = ref<any>(null)
const editForm = reactive({ expireValue: 7, expiredCount: -1 })

const openEdit = (row: any) => {
  editTarget.value = row
  editForm.expireValue = 7
  editForm.expiredCount = typeof row.expired_count === 'number' ? row.expired_count : -1
  editVisible.value = true
}

const submitEdit = async () => {
  if (!editTarget.value) return
  saving.value = true
  try {
    const res = await adminApi.updateFile(editTarget.value.id, {
      expire_value: editForm.expireValue,
      expire_style: 'day',
      expired_count: editForm.expiredCount
    })
    if (res.code === 0 || res.code === 200) {
      ElMessage.success('已保存')
      editVisible.value = false
      await fetchFiles()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const downloadFile = async (row: any) => {
  // 管理端下载：/admin/files/:id 受 AdminMiddleware 保护，window.open 带不上
  // Authorization 头必然 401——改为带令牌的 fetch → blob → 触发保存
  try {
    const { default: axios } = await import('axios')
    const token = localStorage.getItem('token') || ''
    const res = await axios.get(adminApi.fileDownloadUrl(row.id), {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = row.file_name || `${row.code}.bin`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ElMessage.error(e?.response?.status === 401 ? '登录已过期，请重新登录' : '下载失败')
  }
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchFiles()
}

const handleCurrentChange = () => {
  fetchFiles()
}

onMounted(() => {
  fetchFiles()
})
</script>

<style scoped>
.files-container {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.files-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h2 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-title p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.refresh-btn {
  border-radius: var(--radius-md);
  background: var(--primary-color);
  border: none;
  color: white;
  transition: all 0.3s;
}

.refresh-btn:hover {
  box-shadow: var(--shadow-xs);
}

.files-table {
  margin-top: 20px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.file-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-preview {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-code {
  display: flex;
  gap: 8px;
}

.anonymous {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.owner-ip {
  font-family: monospace;
  font-size: 13px;
  color: var(--color-text-regular);
}

.download-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 600;
  color: var(--primary-color);
}

.expire-time {
  color: var(--color-text-regular);
}

.expire-time.expired {
  color: var(--color-danger);
  font-weight: 600;
}

.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

:deep(.el-table) {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

:deep(.el-table th) {
  background: var(--color-muted) !important;
  font-weight: 600;
  color: var(--color-text-primary);
}

:deep(.el-table td) {
  padding: 16px 0;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: var(--color-muted);
}
</style>
