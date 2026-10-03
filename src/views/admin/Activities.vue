<template>
  <div class="activities-container">
    <el-card shadow="never" class="activities-card">
      <div class="card-header">
        <div class="header-title">
          <h2>审计日志</h2>
          <p>后台管理操作全程留痕（配置变更/用户管理/文件管理/维护操作）</p>
        </div>
        <div class="header-actions">
          <el-select v-model="filterAction" placeholder="操作类型" clearable style="width: 200px" @change="fetchActivities">
            <el-option label="配置变更" value="config.update" />
            <el-option label="用户操作" value="user." />
            <el-option label="文件操作" value="file." />
            <el-option label="维护操作" value="maintenance." />
          </el-select>
          <el-button @click="fetchActivities" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <el-divider />

      <el-table :data="logs" v-loading="loading" class="activities-table">
        <el-table-column prop="CreatedAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.CreatedAt || row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="actor_name" label="操作者" width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="row.actor_name === 'system' ? 'info' : 'primary'" effect="plain">
              {{ row.actor_name || 'system' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="240">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="对象" min-width="260" show-overflow-tooltip />
        <el-table-column prop="ip" label="来源 IP" width="150" />
        <el-table-column label="结果" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchActivities"
          @current-change="fetchActivities"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const logs = ref<any[]>([])
const filterAction = ref('')

const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}

const fetchActivities = async () => {
  loading.value = true
  try {
    const res = await adminApi.getActivities({
      page: pagination.page,
      page_size: pagination.pageSize,
      action: filterAction.value || undefined
    })
    if (res.code === 0 || res.code === 200) {
      const data: any = res.data
      logs.value = Array.isArray(data) ? data : data?.list || []
      pagination.total = Array.isArray(data) ? data.length : data?.total ?? 0
    } else {
      ElMessage.error(res.message || '获取审计日志失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取审计日志失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchActivities)
</script>

<style scoped>
.activities-container { animation: fadeIn 0.5s ease-in; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.activities-card { border-radius: var(--radius-xl); border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title h2 { margin: 0 0 4px; font-size: 24px; font-weight: 600; color: var(--color-text-primary); }
.header-title p { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
.header-actions { display: flex; gap: 8px; align-items: center; }
.pagination-wrapper { margin-top: 24px; display: flex; justify-content: center; }
:deep(.el-table th) { background: var(--color-muted) !important; font-weight: 600; }
</style>
