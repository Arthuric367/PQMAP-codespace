import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

export const useMessageStore = defineStore('message', () => {
  // 状态
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const unreadCount = ref(0)

  // 模拟数据 - 实际项目中应从API获取
  const mockMessages = [
    {
      id: 1,
      title: 'System Maintenance Notification',
      content: 'The system will undergo maintenance and upgrade from 22:00 to 02:00 on October 15, 2023. Please prepare in advance.',
      type: { id: 1, name: 'System Notification', color: '#409EFF' },
      sendTime: '2023-10-10 10:00:00',
      read: false,
      important: true,
      sender: 'System Administrator'
    },
    {
      id: 2,
      title: 'Order Review Reminder',
      content: 'Order #98765 requires your review, please process it as soon as possible.',
      type: { id: 2, name: 'Work Reminder', color: '#67C23A' },
      sendTime: '2023-10-11 09:30:00',
      read: true,
      important: false,
      sender: 'Order System'
    },
    {
      id: 3,
      title: 'Server CPU Usage Alert',
      content: 'Database server CPU usage exceeds 90%, please check promptly.',
      type: { id: 3, name: 'Alert Information', color: '#F56C6C' },
      sendTime: '2023-10-11 15:45:00',
      read: false,
      important: true,
      sender: 'Monitoring System'
    },
    {
      id: 4,
      title: 'New Feature Launch Notification',
      content: 'The message center has added a batch processing function, welcome to experience it.',
      type: { id: 1, name: 'System Notification', color: '#409EFF' },
      sendTime: '2023-10-12 14:00:00',
      read: false,
      important: false,
      sender: 'System Administrator'
    },
    {
      id: 5,
      title: 'Meeting Reminder',
      content: 'Project weekly meeting will be held tomorrow at 10:00 AM in Conference Room 3, please attend on time.',
      type: { id: 4, name: 'Meeting Notification', color: '#E6A23C' },
      sendTime: '2023-10-12 16:30:00',
      read: true,
      important: false,
      sender: 'Administration Department'
    }
  ]

  // 加载消息列表
  const loadMessages = () => {
    loading.value = true
    error.value = null
    
    // 模拟API调用
    setTimeout(() => {
      messages.value = mockMessages
      updateUnreadCount()
      loading.value = false
    }, 500)
    
    // 实际项目中应使用axios请求
    // axios.get('/api/messages')
    //   .then(response => {
    //     messages.value = response.data
    //     updateUnreadCount()
    //   })
    //   .catch(err => {
    //     error.value = err.message
    //   })
    //   .finally(() => {
    //     loading.value = false
    //   })
  }

  // 标记消息为已读
  const markAsRead = (messageId) => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (message && !message.read) {
      message.read = true
      updateUnreadCount()
    }
  }

  // 标记所有消息为已读
  const markAllAsRead = () => {
    messages.value.forEach(message => {
      message.read = true
    })
    updateUnreadCount()
  }

  // 更新未读消息数量
  const updateUnreadCount = () => {
    unreadCount.value = messages.value.filter(message => !message.read).length
  }

  // 获取分类消息
  const getMessagesByType = (typeId) => {
    return computed(() => {
      return messages.value.filter(message => message.type.id === typeId)
    })
  }

  return {
    messages,
    loading,
    error,
    unreadCount,
    loadMessages,
    markAsRead,
    markAllAsRead,
    updateUnreadCount,
    getMessagesByType
  }
}) 