<template>
  <div class="share-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>{{ t('share.fileShare') }}</h3>
          <el-radio-group v-model="activeTab">
            <el-radio-button label="upload">{{ t('share.tabUpload') }}</el-radio-button>
            <el-radio-button label="text">{{ t('share.tabText') }}</el-radio-button>
            <el-radio-button label="get">{{ t('share.tabGet') }}</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <div class="tab-content">
        <!-- 文件上传 -->
        <FileUpload v-if="activeTab === 'upload'" @success="handleSuccess" />
        
        <!-- 文本分享 -->
        <TextShare v-if="activeTab === 'text'" @success="handleSuccess" />
        
        <!-- 获取分享 -->
        <GetShare v-if="activeTab === 'get'" :initial-code="initialCode" />
      </div>
    </el-card>
    
    <!-- 分享成功对话框 -->
    <el-dialog v-model="showSuccessDialog" :title="t('share.successTitle')" width="500px">
      <div class="success-content">
        <el-result icon="success" :title="t('share.successTitle')">
          <template #sub-title>
            {{ t('share.successDesc') }}
          </template>
        </el-result>
        
        <el-input
          v-model="shareUrl"
          readonly
          :suffix-icon="CopyDocument"
          @click="copyUrl"
        />
      </div>
      
      <template #footer>
        <el-button @click="showSuccessDialog = false">{{ t('share.close') }}</el-button>
        <el-button type="primary" @click="copyUrl">{{ t('share.copyLink') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { copyToClipboard } from '@/utils/clipboard'
import FileUpload from '@/components/upload/FileUpload.vue'
import TextShare from '@/components/upload/TextShare.vue'
import GetShare from '@/components/upload/GetShare.vue'

const route = useRoute()
const { t } = useI18n()
const activeTab = ref('upload')
const showSuccessDialog = ref(false)
const shareUrl = ref('')
const initialCode = ref('')

interface ShareResult {
  code: string
  share_url: string
  full_share_url: string
  qr_code_data: string
}

const handleSuccess = (result: ShareResult) => {
  shareUrl.value = result.full_share_url || result.share_url
  showSuccessDialog.value = true
}

const copyUrl = async () => {
  const ok = await copyToClipboard(shareUrl.value)
  if (ok) ElMessage.success(t('share.linkCopied'))
  else ElMessage.error(t('share.copyFailedManual'))
}

// 检查 URL 中是否有分享码
onMounted(() => {
  const code = route.params.code as string
  if (code) {
    initialCode.value = code
    activeTab.value = 'get'
  }
})
</script>

<style scoped lang="scss">
.share-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
  }
  
  .tab-content {
    margin-top: 20px;
  }
  
  .success-content {
    text-align: center;
    
    .el-input {
      margin-top: 20px;
    }
  }
}
</style>
