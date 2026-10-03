<template>
  <div class="files-container">
    <el-card shadow="never" class="files-card">
      <div class="card-header">
        <div class="header-title">
          <h2>文件管理</h2>
          <p>管理系统中的所有分享文件</p>
        </div>
        <div class="header-actions">
          <el-button
            type="danger"
            plain
            :disabled="!selectedIds.length"
            @click="batchDelete"
          >
            批量删除{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
          </el-button>
          <el-button
            type="warning"
            plain
            :disabled="!selectedIds.length"
            @click="batchExtendVisible = true"
          >
            批量延期
          </el-button>
          <el-button @click="fetchFiles" :loading="loading" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>

      <el-divider />

      <el-table
        :data="filesList"
        v-loading="loading"
        class="files-table"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="文件信息" min-width="250">
          <template #default="{ row }">
            <div class="file-info">
              <div class="file-icon">
                <el-icon size="32" :color="getFileIconColor(row)">
                  <component :is="getFileIcon(row)" />
                </el-icon>
              </div>
              <div class="file-details">
                <div class="file-name">
                  {{ row.uuid_file_name || row.code }}
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

        <el-table-column prop="size" label="大小" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ formatFileSize(row.size) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="上传类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.text ? 'success' : 'primary'" effect="light">
              <el-icon><component :is="row.text ? 'Document' : 'Picture'" /></el-icon>
              {{ row.text ? '文本' : '文件' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="user_id" label="上传者" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.user_id" type="info">
              ID: {{ row.user_id }}
            </el-tag>
            <span v-else class="anonymous">匿名</span>
          </template>
        </el-table-column>

        <el-table-column prop="used_count" label="下载次数" width="100" align="center">
          <template #default="{ row }">
            <div class="download-count">
              <el-icon><Download /></el-icon>
              {{ row.used_count || 0 }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="CreatedAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.CreatedAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="expired_at" label="过期时间" width="180">
          <template #default="{ row }">
            <div :class="['expire-time', { expired: isExpired(row.expired_at) }]">
              {{ formatDate(row.expired_at) }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.text"
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
          <span>{{ editTarget?.uuid_file_name || editTarget?.code }}</span>
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

const loading = ref(false)
const filesList = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
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
    return new Date(dateStr).toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}

const isExpired = (dateStr: string): boolean => {
  if (!dateStr) return false
  try {
    return new Date(dateStr) < new Date()
  } catch {
    return false
  }
}

const getFileIcon = (row: any) => {
  const filename = row.uuid_file_name || ''
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
  const filename = row.uuid_file_name || ''
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
    const res = await adminApi.getFiles({
      page: pagination.page,
      page_size: pagination.pageSize
    })
    
    if (res.code === 200) {
      if (res.data && Array.isArray(res.data.items)) {
        filesList.value = res.data.items
        pagination.total = res.data.total || res.data.items.length
      } else if (res.data && Array.isArray((res.data as Record<string, unknown>).list)) {
        // 兼容历史响应结构
        const legacy = res.data as Record<string, unknown>
        filesList.value = legacy.list as typeof filesList.value
        pagination.total = (legacy.total as number) || (legacy.list as unknown[]).length
      } else if (Array.isArray(res.data)) {
        filesList.value = res.data
        pagination.total = res.data.length
      } else {
        filesList.value = []
        pagination.total = 0
      }
    }
  } catch (error) {
    console.error('获取文件列表失败:', error)
    ElMessage.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

const deleteFile = async (file: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件 ${file.uuid_file_name || file.code} 吗？`,
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

const downloadFile = (row: any) => {
  // 管理端下载：302 到带服务端签发下载令牌的公开下载端点
  window.open(adminApi.fileDownloadUrl(row.id), '_blank')
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
}

.file-name {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
  font-size: 15px;
}

.file-code {
  display: flex;
  gap: 8px;
}

.anonymous {
  color: var(--color-text-secondary);
  font-size: 14px;
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
