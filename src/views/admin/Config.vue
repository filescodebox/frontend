<template>
  <div class="system-config">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <h3>系统配置</h3>
          <el-button type="primary" @click="saveConfig" :loading="saving">
            保存配置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 基础配置 -->
        <el-tab-pane label="基础配置" name="basic">
          <el-form :model="configForm.base" label-width="140px" style="max-width: 600px">
            <el-form-item label="站点名称">
              <el-input v-model="configForm.base.name" />
            </el-form-item>

            <el-form-item label="站点描述">
              <el-input v-model="configForm.base.description" type="textarea" :rows="3" />
            </el-form-item>

            <el-form-item label="端口">
              <el-input-number v-model="configForm.base.port" :min="1" :max="65535" />
            </el-form-item>

            <el-form-item label="生产模式">
              <el-switch v-model="configForm.base.production" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 上传配置 -->
        <el-tab-pane label="上传配置" name="upload">
          <el-form :model="configForm.transfer.upload" label-width="140px" style="max-width: 600px">
            <el-form-item label="开放上传">
              <el-switch v-model="configForm.transfer.upload.openupload" :active-value="1" :inactive-value="0" />
            </el-form-item>

            <el-form-item label="上传大小限制">
              <el-input-number
                v-model="configForm.transfer.upload.uploadsize"
                :min="1048576"
                :step="1048576"
                controls-position="right"
              />
              <span style="margin-left: 10px; color: var(--color-text-secondary)">字节 (默认 10MB = 10485760)</span>
            </el-form-item>

            <el-form-item label="需要登录">
              <el-switch v-model="configForm.transfer.upload.requirelogin" :active-value="1" :inactive-value="0" />
            </el-form-item>

            <el-form-item label="启用分片上传">
              <el-switch v-model="configForm.transfer.upload.enablechunk" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 用户配置 -->
        <el-tab-pane label="用户配置" name="user">
          <div style="margin-bottom: 12px">
            <el-button type="primary" :loading="userSaving" @click="saveUserSettings">保存用户配置</el-button>
            <span style="margin-left: 10px; color: var(--color-text-secondary); font-size: 12px">保存后即时生效（注册开关/会话时长；配额与上传限制为系统默认，用户级覆盖优先）</span>
          </div>
          <el-form :model="configForm.user" label-width="140px" style="max-width: 600px">
            <el-form-item label="允许用户注册">
              <el-switch v-model="configForm.user.allowuserregistration" :active-value="1" :inactive-value="0" />
            </el-form-item>

            <el-form-item label="用户上传限制">
              <el-input-number
                v-model="configForm.user.useruploadsize"
                :min="1048576"
                :step="1048576"
                controls-position="right"
              />
              <span style="margin-left: 10px; color: var(--color-text-secondary)">字节 (默认 50MB)</span>
            </el-form-item>

            <el-form-item label="用户存储配额">
              <el-input-number
                v-model="configForm.user.userstoragequota"
                :min="1048576"
                :step="1048576"
                controls-position="right"
              />
              <span style="margin-left: 10px; color: var(--color-text-secondary)">字节 (默认 1GB)</span>
            </el-form-item>

            <el-form-item label="会话过期时间">
              <el-input-number
                v-model="configForm.user.sessionexpiryhours"
                :min="1"
                :max="720"
                controls-position="right"
              />
              <span style="margin-left: 10px; color: var(--color-text-secondary)">小时</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <!-- 安全与限流（读写 /admin/ratelimit/*，独立保存） -->
        <el-tab-pane label="安全与限流" name="ratelimit">
          <el-form :model="rlForm" label-width="160px" style="max-width: 640px">
            <el-form-item label="启用限流">
              <el-switch v-model="rlForm.enabled" />
            </el-form-item>
            <el-form-item label="全局 QPS">
              <el-input-number v-model="rlForm.global_qps" :min="1" :max="100000" controls-position="right" />
            </el-form-item>
            <el-form-item label="上传 QPS">
              <el-input-number v-model="rlForm.upload_qps" :min="1" :max="100000" controls-position="right" />
            </el-form-item>
            <el-form-item label="下载 QPS">
              <el-input-number v-model="rlForm.download_qps" :min="1" :max="100000" controls-position="right" />
            </el-form-item>
            <el-form-item label="登录 QPS">
              <el-input-number v-model="rlForm.login_qps" :min="1" :max="10000" controls-position="right" />
            </el-form-item>
            <el-form-item label="突发容量 Burst">
              <el-input-number v-model="rlForm.burst" :min="1" :max="100000" controls-position="right" />
            </el-form-item>
            <el-form-item label="触发封禁时长（秒）">
              <el-input-number v-model="rlForm.block_seconds" :min="0" :max="86400" controls-position="right" />
            </el-form-item>
            <el-form-item label="Redis 共享计数">
              <!-- 契约无 use_redis 字段（GET 不返回/PUT 不采纳），由部署配置
                   rate_limit.use_redis / FCB_RATE_LIMIT_USE_REDIS 决定 -->
              <span class="form-hint" style="color: var(--color-text-secondary)">
                由部署配置决定（rate_limit.use_redis / FCB_RATE_LIMIT_USE_REDIS），此处不可改
              </span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="rlSaving" @click="saveRateLimit">保存限流配置</el-button>
              <el-button :loading="rlStatusLoading" @click="fetchRateLimitStatus">查看运行状态</el-button>
            </el-form-item>
            <el-form-item v-if="rlStatus" label="运行状态">
              <pre class="rl-status">{{ rlStatusText }}</pre>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/admin'
import { useConfigStore } from '@/stores/config'

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const configStore = useConfigStore()

const configForm = reactive({
  base: {
    name: '',
    description: '',
    port: 12346,
    host: '0.0.0.0',
    production: false
  },
  transfer: {
    upload: {
      openupload: 1,
      uploadsize: 10485760,
      requirelogin: 1,
      enablechunk: 1,
      chunksize: 2097152
    }
  },
  user: {
    allowuserregistration: 0,
    useruploadsize: 52428800,
    userstoragequota: 1073741824,
    sessionexpiryhours: 168
  }
})

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await adminApi.getConfig()
    if (res.code === 200 && res.data) {
      // 映射配置数据
      if (res.data.base) {
        Object.assign(configForm.base, res.data.base)
      }
      if (res.data.transfer) {
        Object.assign(configForm.transfer, res.data.transfer)
      }
      // 用户配置走独立端点（此前随通用配置保存会被后端丢弃——假开关）
      await fetchUserSettings()
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    ElMessage.error('获取配置失败')
  } finally {
    loading.value = false
  }
}

// ==================== 用户配置（/admin/config/user，独立保存） ====================
const fetchUserSettings = async () => {
  try {
    const res = await adminApi.getUserSettings()
    if ((res.code === 0 || res.code === 200) && res.data) {
      const d = res.data as Record<string, unknown>
      configForm.user.allowuserregistration = Number(d.allowuserregistration === true || d.allowuserregistration === 1)
      if (typeof d.useruploadsize === 'number' && d.useruploadsize > 0) configForm.user.useruploadsize = d.useruploadsize
      if (typeof d.userstoragequota === 'number' && d.userstoragequota > 0) configForm.user.userstoragequota = d.userstoragequota
      if (typeof d.sessionexpiryhours === 'number' && d.sessionexpiryhours > 0) configForm.user.sessionexpiryhours = d.sessionexpiryhours
    }
  } catch (error) {
    console.error('获取用户配置失败:', error)
  }
}

const userSaving = ref(false)
const saveUserSettings = async () => {
  userSaving.value = true
  try {
    const res = await adminApi.updateUserSettings({
      allowuserregistration: Number(configForm.user.allowuserregistration) === 1,
      useruploadsize: configForm.user.useruploadsize,
      userstoragequota: configForm.user.userstoragequota,
      sessionexpiryhours: configForm.user.sessionexpiryhours
    })
    if (res.code === 0 || res.code === 200) {
      ElMessage.success('用户配置已保存并即时生效')
      await configStore.refreshConfig()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存用户配置失败:', error)
    ElMessage.error('保存失败')
  } finally {
    userSaving.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const res = await adminApi.updateConfig(configForm)
    if (res.code === 200) {
      ElMessage.success('配置保存成功')
      // 刷新全局配置
      await configStore.refreshConfig()
      await fetchConfig()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// ==================== 安全与限流（/admin/ratelimit/*，独立于通用配置保存） ====================
const rlSaving = ref(false)
const rlStatusLoading = ref(false)
const rlStatus = ref<Record<string, unknown> | null>(null)
// GET 快照：契约存在 required 字段（如 block_on_limit）且不在 rlForm 中，
// 保存时合并快照，避免缺 required 被 400
let rlSnapshot: Record<string, unknown> = {}
const rlForm = reactive({
  enabled: true,
  global_qps: 100,
  upload_qps: 10,
  download_qps: 50,
  login_qps: 5,
  burst: 20,
  block_seconds: 60
})

const fetchRateLimit = async () => {
  try {
    const res = await adminApi.getRateLimitConfig()
    if (res.code === 0 || res.code === 200) {
      const data = (res.data || {}) as Record<string, unknown>
      rlSnapshot = { ...data }
      for (const k of Object.keys(rlForm) as (keyof typeof rlForm)[]) {
        if (typeof data[k] === 'boolean' || typeof data[k] === 'number') {
          ;(rlForm as Record<string, unknown>)[k] = data[k]
        }
      }
    }
  } catch (error) {
    console.error('获取限流配置失败:', error)
  }
}

const saveRateLimit = async () => {
  rlSaving.value = true
  try {
    // 后端绑定结构为 {config: RateLimitConfig}，扁平体会因 required 缺失被 400
    const res = await adminApi.updateRateLimitConfig({
      config: { ...rlSnapshot, ...rlForm }
    })
    if (res.code === 0 || res.code === 200) {
      ElMessage.success('限流配置已保存并热更新')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    rlSaving.value = false
  }
}

const rlStatusText = computed(() => JSON.stringify(rlStatus.value, null, 2))

const fetchRateLimitStatus = async () => {
  rlStatusLoading.value = true
  try {
    const res = await adminApi.getRateLimitStatus()
    if (res.code === 0 || res.code === 200) {
      rlStatus.value = res.data || null
    } else {
      ElMessage.error(res.message || '获取运行状态失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取运行状态失败')
  } finally {
    rlStatusLoading.value = false
  }
}

onMounted(() => {
  fetchConfig()
  fetchRateLimit()
})
</script>

<style scoped>
.system-config {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.rl-status {
  background: var(--color-muted);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  max-height: 260px;
  overflow: auto;
  width: 100%;
  margin: 0;
}
</style>
