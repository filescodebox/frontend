<template>
  <div class="requests-page">
    <div class="page-header">
      <h2>寄件码 · 反向收件</h2>
      <p>创建投递链接发给他人，对方无需注册即可向你投递文件（文件成为你的普通分享）。</p>
    </div>

    <!-- 创建表单 -->
    <el-card class="create-card" shadow="never">
      <template #header>创建投递链接</template>
      <el-form :inline="true" class="create-form">
        <el-form-item label="说明">
          <el-input v-model="form.title" placeholder="如：会议材料收集" maxlength="100" style="width: 220px" />
        </el-form-item>
        <el-form-item label="文件数上限">
          <el-input-number v-model="form.max_files" :min="0" :max="100" controls-position="right" />
          <span class="hint">（0=不限）</span>
        </el-form-item>
        <el-form-item label="大小上限">
          <el-select v-model="form.max_bytes_mb" style="width: 130px">
            <el-option label="不限" :value="0" />
            <el-option label="100 MB" :value="100" />
            <el-option label="500 MB" :value="500" />
            <el-option label="1 GB" :value="1024" />
            <el-option label="5 GB" :value="5120" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="creating" @click="create">生成链接</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 链接列表 -->
    <el-card shadow="never" style="margin-top: 16px">
      <template #header>我的投递链接</template>
      <el-table :data="list" v-loading="loadingList" style="width: 100%">
        <el-table-column label="说明" prop="Title" min-width="160">
          <template #default="{ row }">{{ row.Title || '（无说明）' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="isExpired(row)" type="danger" size="small">已过期</el-tag>
            <el-tag v-else type="success" size="small">有效</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="累计投递" width="140">
          <template #default="{ row }">{{ row.UsedCount }} 次 / {{ formatSize(row.RecvBytes) }}</template>
        </el-table-column>
        <el-table-column label="过期时间" width="170">
          <template #default="{ row }">{{ row.ExpiredAt ? new Date(row.ExpiredAt).toLocaleString() : '永久' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="copyLink(row.Token)">
              <el-icon><CopyDocument /></el-icon> 复制链接
            </el-button>
            <el-popconfirm title="撤销后访客将无法再投递，确认？" @confirm="remove(row.Token)">
              <template #reference>
                <el-button size="small" type="danger" text>撤销</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { requestApi, type FileRequestItem } from '@/api/request'

const list = ref<FileRequestItem[]>([])
const loadingList = ref(false)
const creating = ref(false)

const form = reactive({
  title: '',
  max_files: 0,
  max_bytes_mb: 0,
  expire_value: 7,
  expire_style: 'day',
})

const isExpired = (row: FileRequestItem) =>
  !!row.ExpiredAt && new Date(row.ExpiredAt).getTime() < Date.now()

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const buildLink = (token: string) => `${window.location.origin}/#/request/${token}`

const load = async () => {
  loadingList.value = true
  try {
    const res = await requestApi.listMine()
    if (res.code === 200 || res.code === 0) list.value = res.data || []
  } finally {
    loadingList.value = false
  }
}

const create = async () => {
  creating.value = true
  try {
    const res = await requestApi.create({
      title: form.title,
      max_files: form.max_files,
      max_bytes: form.max_bytes_mb * 1024 * 1024,
      expire_value: form.expire_value,
      expire_style: form.expire_style,
    })
    if (res.code === 200 || res.code === 0) {
      ElMessage.success('链接已创建')
      await load()
      const last = list.value[0]
      if (last) await copyLink(last.Token)
    } else {
      throw new Error(res.message || '创建失败')
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

const copyLink = async (token: string) => {
  try {
    await navigator.clipboard.writeText(buildLink(token))
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error(buildLink(token))
  }
}

const remove = async (token: string) => {
  const res = await requestApi.remove(token)
  if (res.code === 200 || res.code === 0) {
    ElMessage.success('已撤销')
    await load()
  } else {
    ElMessage.error(res.message || '撤销失败')
  }
}

onMounted(load)
</script>

<style scoped>
.requests-page {
  max-width: 1000px;
}
.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: var(--color-text-primary);
}
.page-header p {
  margin: 0 0 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.create-card :deep(.el-card__header) {
  font-weight: 600;
}
.create-form .hint {
  margin-left: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
