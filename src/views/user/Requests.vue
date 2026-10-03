<template>
  <div class="requests-page">
    <div class="page-header">
      <h2>{{ t('request.pageTitle') }}</h2>
      <p>{{ t('request.pageDesc') }}</p>
    </div>

    <!-- 创建表单 -->
    <el-card class="create-card" shadow="never">
      <template #header>{{ t('request.createTitle') }}</template>
      <el-form :inline="true" class="create-form">
        <el-form-item :label="t('request.formTitle')">
          <el-input v-model="form.title" :placeholder="t('request.formTitlePh')" maxlength="100" style="width: 220px" />
        </el-form-item>
        <el-form-item :label="t('request.formMaxFiles')">
          <el-input-number v-model="form.max_files" :min="0" :max="100" controls-position="right" />
          <span class="hint">{{ t('request.unlimitedHint') }}</span>
        </el-form-item>
        <el-form-item :label="t('request.formMaxBytes')">
          <el-select v-model="form.max_bytes_mb" style="width: 130px">
            <el-option :label="t('request.unlimited')" :value="0" />
            <el-option label="100 MB" :value="100" />
            <el-option label="500 MB" :value="500" />
            <el-option label="1 GB" :value="1024" />
            <el-option label="5 GB" :value="5120" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="creating" @click="create">{{ t('request.createBtn') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 链接列表 -->
    <el-card shadow="never" style="margin-top: 16px">
      <template #header>{{ t('request.listTitle') }}</template>
      <el-table :data="list" v-loading="loadingList" style="width: 100%">
        <el-table-column :label="t('request.formTitle')" prop="Title" min-width="160">
          <template #default="{ row }">{{ row.Title || t('request.noTitle') }}</template>
        </el-table-column>
        <el-table-column :label="t('request.statusCol')" width="100">
          <template #default="{ row }">
            <el-tag v-if="isExpired(row)" type="danger" size="small">{{ t('request.expired') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('request.active') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('request.usageCol')" width="140">
          <template #default="{ row }">{{ t('request.usedTimes', { n: row.UsedCount }) }} / {{ formatSize(row.RecvBytes) }}</template>
        </el-table-column>
        <el-table-column :label="t('request.expireCol')" width="170">
          <template #default="{ row }">{{ row.ExpiredAt ? new Date(row.ExpiredAt).toLocaleString() : t('request.forever') }}</template>
        </el-table-column>
        <el-table-column :label="t('request.actionsCol')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="copyLink(row.Token)">
              <el-icon><CopyDocument /></el-icon> {{ t('request.copyLink') }}
            </el-button>
            <el-popconfirm :title="t('request.revokeConfirm')" @confirm="remove(row.Token)">
              <template #reference>
                <el-button size="small" type="danger" text>{{ t('request.revoke') }}</el-button>
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
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import { requestApi, type FileRequestItem } from '@/api/request'

const { t } = useI18n()

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
      ElMessage.success(t('request.created'))
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
    ElMessage.success(t('request.copied'))
  } catch {
    ElMessage.error(buildLink(token))
  }
}

const remove = async (token: string) => {
  const res = await requestApi.remove(token)
  if (res.code === 200 || res.code === 0) {
    ElMessage.success(t('request.revoked'))
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
