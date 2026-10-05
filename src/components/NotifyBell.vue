<template>
  <div class="notify-bell" @click="goNotifications">
    <el-badge :value="unread" :hidden="unread === 0" :max="99" class="bell-badge">
      <el-icon :size="20" class="bell-icon"><Bell /></el-icon>
    </el-badge>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { userNotifyApi } from '@/api/userNotify'
import { usePolling } from '@/composables/usePolling'

const router = useRouter()
const userStore = useUserStore()
const unread = ref(0)

const refresh = async () => {
  if (!userStore.isLoggedIn) {
    unread.value = 0
    return
  }
  try {
    const res = await userNotifyApi.unreadCount()
    unread.value = res.data.unread
  } catch {
    /* silent */
  }
}

const goNotifications = () => {
  if (!userStore.isLoggedIn) {
    router.push('/user/login')
    return
  }
  router.push('/user/notifications')
}

// 首帧立即取一次 + 60s 轮询（页面隐藏自动暂停）
refresh()
usePolling(refresh, 60000)
</script>

<style scoped>
.notify-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}
.notify-bell:hover {
  background: rgba(255, 255, 255, 0.15);
}
.bell-icon {
  color: white;
}
:deep(.bell-badge sup) {
  transform: translate(2px, -2px);
}
</style>
