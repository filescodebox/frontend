<template>
  <el-dialog
    v-model="visible"
    :title="t('home.shareSuccess')"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="share-result">
      <el-result :icon="'success'" :title="t('home.shareSuccess')" :sub-title="t('home.shareSuccessSubtitle')" />

      <!-- E2E 提示：链接含解密密钥 -->
      <el-alert
        v-if="shareE2EKey"
        type="warning"
        :title="t('home.e2eLinkWarning')"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />

      <!-- 分享方式三选一 Tab -->
      <el-tabs v-model="shareMethod" class="share-method-tabs">
        <!-- 6 位码 -->
        <el-tab-pane name="code">
          <template #label>
            <span class="tab-label">
              <el-icon><Postcard /></el-icon>
              {{ t('home.shareMethod.code') }}
            </span>
          </template>
          <div class="code-display">
            <div class="code-big">{{ shareCode }}</div>
            <p class="code-hint">{{ t('home.shareMethod.codeHint') }}</p>
            <el-button type="primary" size="large" @click="copyShareCode">
              <el-icon><CopyDocument /></el-icon>
              {{ t('home.shareMethod.copyCode') }}
            </el-button>
          </div>
        </el-tab-pane>

        <!-- 完整 URL -->
        <el-tab-pane name="url">
          <template #label>
            <span class="tab-label">
              <el-icon><Link /></el-icon>
              {{ t('home.shareMethod.url') }}
            </span>
          </template>
          <div class="url-display">
            <el-input v-model="shareUrl" readonly size="large">
              <template #append>
                <el-button type="primary" @click="copyShareUrl">
                  <el-icon><CopyDocument /></el-icon>
                  {{ t('home.copyLink') }}
                </el-button>
              </template>
            </el-input>
            <p class="code-hint">{{ t('home.shareMethod.urlHint') }}</p>
          </div>
        </el-tab-pane>

        <!-- 二维码 -->
        <el-tab-pane name="qrcode">
          <template #label>
            <span class="tab-label">
              <el-icon><PictureFilled /></el-icon>
              {{ t('home.shareMethod.qrcode') }}
            </span>
          </template>
          <div v-if="qrCodeDataUrl" class="qrcode-display">
            <img :src="qrCodeDataUrl" :alt="t('home.qrCodeTip')" class="qrcode-image" />
            <p class="code-hint">{{ t('home.qrCodeTip') }}</p>
          </div>
          <div v-else class="qrcode-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>{{ t('common.loading') }}</span>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useI18n } from 'vue-i18n'
import { Postcard, Link, CopyDocument, PictureFilled, Loading } from '@element-plus/icons-vue'
import { copyToClipboard } from '@/utils/clipboard'
import type { ShareResult } from '@/types/share'

/**
 * 分享成功弹窗（2026-10-06 收敛自 home/index.vue 内联实现）：
 * 分享方式三选一（取件码 / URL / 二维码），含 hash 路由 URL 修正与 E2E 密钥并入 query。
 * 调用方在分享成功回调里 `ref.open(result)` 即可。
 */
const { t } = useI18n()

const visible = ref(false)
const shareUrl = ref('')
const shareCode = ref('')
const qrCodeDataUrl = ref('')
// E2E 密钥（有值时弹窗提示"链接含解密密钥"）
const shareE2EKey = ref('')
// 分享方式：6 位码 / URL / 二维码
const shareMethod = ref<'code' | 'url' | 'qrcode'>('code')

const open = async (result: ShareResult) => {
  // 6 位码（取件码）
  shareCode.value = result.code
  // E2E 密钥随链接传递（hash 路由 query，永不发往服务器）
  shareE2EKey.value = result.e2e_key || ''

  // 确保使用正确的 hash 路由格式
  let url = result.full_share_url || result.share_url

  // 如果 URL 不包含 #，则添加（适配 hash 路由模式）
  if (!url.includes('#')) {
    // 如果是相对路径 /share/xxx，转换为完整 URL
    if (url.startsWith('/')) {
      url = `${window.location.origin}/#${url}`
    } else {
      // 否则在路径前添加 #
      const pathIndex = url.indexOf('/share/')
      if (pathIndex > 0) {
        url = url.substring(0, pathIndex) + '/#' + url.substring(pathIndex)
      }
    }
  }

  // E2E：密钥并入 hash 内 query（#/share/CODE?key=xxx；客户端可见、服务端不可见）
  if (shareE2EKey.value) {
    url += (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(shareE2EKey.value)
  }

  shareUrl.value = url
  shareMethod.value = 'code' // 默认显示 6 位码
  visible.value = true

  // 生成二维码
  try {
    const qrData = url
    qrCodeDataUrl.value = await QRCode.toDataURL(qrData, {
      width: 220,
      margin: 2,
      color: {
        dark: '#303133',
        light: '#ffffff'
      }
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
    qrCodeDataUrl.value = ''
  }
}

const copyShareUrl = async () => {
  const ok = await copyToClipboard(shareUrl.value)
  if (ok) ElMessage.success(t('home.linkCopied'))
  else ElMessage.error(t('home.copyLinkFailed'))
}

const copyShareCode = async () => {
  const ok = await copyToClipboard(shareCode.value)
  if (ok) ElMessage.success(t('home.codeCopied') || t('home.linkCopied'))
  else ElMessage.error(t('home.copyLinkFailed'))
}

defineExpose({ open })
</script>

<style scoped>
.share-method-tabs {
  margin-top: var(--spacing-lg);
}

.share-method-tabs :deep(.el-tabs__item) {
  font-size: var(--text-sm);
  font-weight: 500;
  padding: 0 var(--spacing-lg);
}

.share-method-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
}

.code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.code-big {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 8px;
  color: var(--primary-color);
  background: var(--primary-bg);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  font-family: 'SF Mono', 'Courier New', monospace;
  margin-bottom: var(--spacing-md);
}

.code-hint {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin: var(--spacing-sm) 0 var(--spacing-md);
  text-align: center;
}

.url-display {
  padding: var(--spacing-lg) var(--spacing-sm);
}

.qrcode-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl) var(--spacing-md);
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.qrcode-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.share-result {
  padding: var(--spacing-lg) 0;
}
</style>
