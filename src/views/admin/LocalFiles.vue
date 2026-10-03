<template>
  <div class="local-files">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>本地文件（NAS 白名单目录）</span>
          <div class="header-actions">
            <el-select v-model="rootIdx" class="root-select" placeholder="根目录" @change="onRootChange">
              <el-option v-for="(r, i) in roots" :key="i" :label="r" :value="i" />
            </el-select>
            <el-button :icon="'Refresh'" circle @click="load" />
          </div>
        </div>
      </template>

      <div class="breadcrumb-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-link type="primary" @click="goto('')">根目录</el-link>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="seg in dirSegments" :key="seg.path">
            <el-link type="primary" @click="goto(seg.path)">{{ seg.name }}</el-link>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <span v-if="!roots.length" class="empty-hint">
          功能未启用：配置 upload.local_import.enabled 与 roots 后可用
        </span>
      </div>

      <el-table v-loading="loading" :data="entries" style="width: 100%">
        <el-table-column label="名称" min-width="280">
          <template #default="{ row }">
            <el-icon class="file-icon"><Document v-if="!row.is_dir" /><Folder v-else /></el-icon>
            <el-link v-if="row.is_dir" type="primary" @click="goto(row.path)">{{ row.name }}</el-link>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            {{ row.is_dir ? '—' : formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">{{ formatTime(row.mod_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="!row.is_dir">
              <el-button size="small" type="primary" @click="openImport(row)">生成提取码</el-button>
              <el-button size="small" type="danger" plain @click="onDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty>目录为空</template>
      </el-table>
    </el-card>

    <!-- 生成提取码对话框 -->
    <el-dialog v-model="importVisible" title="本地文件生成提取码" width="480px">
      <el-form label-width="90px">
        <el-form-item label="文件">
          <span class="mono">{{ importForm.path }}</span>
        </el-form-item>
        <el-form-item label="有效期">
          <el-input-number v-model="importForm.expire_value" :min="1" :max="3650" />
          <el-select v-model="importForm.expire_style" class="style-select">
            <el-option label="天" value="day" />
            <el-option label="周" value="week" />
            <el-option label="月" value="month" />
            <el-option label="年" value="year" />
            <el-option label="永久" value="forever" />
          </el-select>
        </el-form-item>
        <el-form-item label="取件密码">
          <el-switch v-model="importForm.require_auth" />
          <el-input
            v-if="importForm.require_auth"
            v-model="importForm.password"
            class="pwd-input"
            placeholder="取件密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="自定义码">
          <el-input v-model="importForm.custom_code" placeholder="留空则随机生成（登录态生效）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="doImport">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Folder } from '@element-plus/icons-vue'
import { localFilesApi, type LocalFileEntry } from '@/api/localFiles'

const roots = ref<string[]>([])
const rootIdx = ref(0)
const dir = ref('')
const entries = ref<LocalFileEntry[]>([])
const loading = ref(false)

const dirSegments = computed(() => {
  const parts = dir.value.split('/').filter(Boolean)
  let acc = ''
  return parts.map((p) => {
    acc = acc ? `${acc}/${p}` : p
    return { name: p, path: acc }
  })
})

const load = async () => {
  loading.value = true
  try {
    const resp = await localFilesApi.list(rootIdx.value, dir.value)
    if (resp.code === 0 || resp.code === 200) {
      roots.value = resp.data.roots || []
      entries.value = resp.data.entries || []
    } else {
      ElMessage.error(resp.message || '加载本地文件失败')
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载本地文件失败')
  } finally {
    loading.value = false
  }
}

const onRootChange = () => {
  dir.value = ''
  load()
}

const goto = (path: string) => {
  dir.value = path
  load()
}

const onDelete = async (row: LocalFileEntry) => {
  try {
    await ElMessageBox.confirm(`确定删除本地文件「${row.name}」？此操作不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await localFilesApi.remove(rootIdx.value, row.path)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

const importVisible = ref(false)
const importing = ref(false)
const importForm = ref({
  path: '',
  expire_value: 7,
  expire_style: 'day',
  require_auth: false,
  password: '',
  custom_code: '',
})

const openImport = (row: LocalFileEntry) => {
  importForm.value = {
    path: row.path,
    expire_value: 7,
    expire_style: 'day',
    require_auth: false,
    password: '',
    custom_code: '',
  }
  importVisible.value = true
}

const doImport = async () => {
  const f = importForm.value
  if (f.require_auth && !f.password) {
    ElMessage.warning('开启密码保护时必须填写密码')
    return
  }
  importing.value = true
  try {
    const resp = await localFilesApi.importShare({
      root: rootIdx.value,
      path: f.path,
      expire_value: f.expire_value,
      expire_style: f.expire_style,
      require_auth: f.require_auth,
      password: f.password || undefined,
      custom_code: f.custom_code || undefined,
    })
    if (!(resp.code === 0 || resp.code === 200)) {
      ElMessage.error(resp.message || '导入失败')
      return
    }
    const data = resp.data
    importVisible.value = false
    const codeText = data?.code ? `提取码：${data.code}` : '导入成功'
    ElMessage.success(codeText)
    if (data?.share_url) {
      await navigator.clipboard?.writeText(data.share_url).catch(() => undefined)
      ElMessage({ message: `分享链接已复制：${data.share_url}`, type: 'success', duration: 5000 })
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    importing.value = false
  }
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

const formatTime = (s: string): string => {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

onMounted(load)
</script>

<style scoped>
.local-files {
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.root-select {
  width: 280px;
}
.breadcrumb-bar {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.empty-hint {
  color: var(--el-color-warning);
  font-size: 13px;
}
.file-icon {
  margin-right: 6px;
  vertical-align: -2px;
}
.mono {
  font-family: monospace;
  word-break: break-all;
}
.style-select {
  width: 100px;
  margin-left: 12px;
}
.pwd-input {
  width: 180px;
  margin-left: 12px;
}
</style>
