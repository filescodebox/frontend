<template>
  <div class="text-share-container">
    <div class="text-input-area">
      <el-input
        v-model="textContent"
        type="textarea"
        :rows="8"
        placeholder="请输入要分享的文本内容..."
        resize="none"
        class="text-area"
        maxlength="10000"
        show-word-limit
      />
    </div>

    <div class="text-settings">
      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Clock /></el-icon>
          过期时间
        </label>
        <div class="expire-inputs">
          <el-input-number 
            v-model="form.expire_value" 
            :min="1"
            :max="999"
            controls-position="right"
          />
          <el-select v-model="form.expire_style" class="expire-select">
            <el-option label="分钟" value="minute" />
            <el-option label="小时" value="hour" />
            <el-option label="天" value="day" />
            <el-option label="周" value="week" />
            <el-option label="月" value="month" />
            <el-option label="年" value="year" />
            <el-option label="永久" value="forever" />
          </el-select>
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Lock /></el-icon>
          访问保护
        </label>
        <el-switch
          v-model="form.require_auth"
          active-text="需要密码"
          inactive-text="公开访问"
        />
        <el-input
          v-if="form.require_auth"
          v-model="form.password"
          type="password"
          placeholder="请输入访问密码"
          show-password
          maxlength="64"
          style="margin-top: 8px"
        />
      </div>

      <div v-if="userStore.isLoggedIn" class="setting-group">
        <label class="setting-label">
          <el-icon><EditPen /></el-icon>
          自定义取件码
        </label>
        <el-input v-model="form.custom_code" placeholder="3-32 位字母、数字、- 或 _" maxlength="32" style="max-width: 280px" />
      </div>

      <div class="setting-group">
        <label class="setting-label">
          <el-icon><Key /></el-icon>
          端到端加密
        </label>
        <el-switch v-model="form.e2e" active-text="加密（零知识）" inactive-text="不加密" />
        <div class="e2e-hint">密钥生成于本浏览器并嵌入分享链接，服务器只存密文无法解密；请勿丢失链接中的 key 参数。</div>
      </div>
    </div>

    <el-button
      type="primary"
      size="large"
      class="share-btn"
      :loading="sharing"
      :disabled="!textContent.trim()"
      @click="handleShare"
    >
      <template #icon>
        <el-icon v-if="!sharing"><Promotion /></el-icon>
      </template>
      {{ sharing ? '分享中...' : '立即分享' }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { shareApi } from '@/api/share'
import { ElMessage } from 'element-plus'
import { Clock, EditPen, Key, Lock, Promotion } from '@element-plus/icons-vue'
import { encryptText, generateKeyB64 } from '@/utils/e2e'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const emit = defineEmits<{
  success: [result: { code: string; share_url: string; full_share_url: string; qr_code_data: string; e2e_key?: string }]
}>()

const textContent = ref('')
const sharing = ref(false)

const form = ref({
  expire_value: 1,
  expire_style: 'day',
  require_auth: false,
  password: '',
  e2e: false,
  custom_code: '',
})

const handleShare = async () => {
  if (!textContent.value.trim()) {
    ElMessage.warning('请输入文本内容')
    return
  }
  if (form.value.require_auth && !form.value.password) {
    ElMessage.warning('开启密码保护时必须填写访问密码')
    return
  }

  sharing.value = true

  try {
    // E2E：生成密钥并加密文本（密文 base64 作为分享内容；密钥随链接传递）
    let e2eKey = ''
    let payloadText = textContent.value
    if (form.value.e2e) {
      e2eKey = await generateKeyB64()
      payloadText = await encryptText(e2eKey, textContent.value)
    }

    const res = await shareApi.shareText({
      text: payloadText,
      ...form.value,
      encrypted: form.value.e2e,
      custom_code: userStore.isLoggedIn ? form.value.custom_code : '',
    })

    if (res.code === 200) {
      ElMessage.success('分享成功')

      const fullUrl = res.data.full_share_url || res.data.share_url || res.data.url || ''
      emit('success', {
        code: res.data.code,
        share_url: res.data.share_url || res.data.url || '',
        full_share_url: fullUrl,
        qr_code_data: res.data.qr_code_data || fullUrl,
        e2e_key: e2eKey || undefined,
      })

      // 重置
      textContent.value = ''
    } else {
      throw new Error(res.message || '分享失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '分享失败')
  } finally {
    sharing.value = false
  }
}
</script>

<style scoped>
.text-share-container {
  padding: 20px 0;
}

.text-input-area {
  margin-bottom: 24px;
}

.text-area :deep(.el-textarea__inner) {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  font-size: 15px;
  line-height: 1.6;
  transition: border-color 0.2s ease;
}

.text-area :deep(.el-textarea__inner:focus) {
  border-color: var(--primary-color);
}

.text-settings {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--color-muted);
  border-radius: var(--radius-lg);
}

.e2e-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group:last-child {
  margin-bottom: 0;
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

.share-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: var(--primary-color);
  border: none;
  transition: opacity 0.2s ease;
}

.share-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.share-btn:disabled {
  opacity: 0.5;
}

.icon-primary {
  color: var(--primary-color);
}
</style>
