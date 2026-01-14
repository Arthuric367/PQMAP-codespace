import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useTriggerRuleStore = defineStore('triggerRule', () => {
  // 状态
  const triggerRules = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 模拟的触发规则数据
  const mockTriggerRules = [
    {
      id: 1,
      name: 'System Disconnection Alert',
      code: 'SYS_DISCONNECT',
      description: 'Trigger notification when system disconnection is detected',
      conditions: [
        {
          type: 'system_disconnected',
          threshold: null,
          operator: 'equals',
          value: true
        }
      ],
      associatedTemplates: [1], // Template IDs
      channels: [2, 3], // Channel IDs (Email, SMS)
      status: 'active',
      createdBy: 'admin',
      createdTime: '2023-06-15 14:30:25',
      updatedTime: '2023-06-16 09:15:30'
    },
    {
      id: 2,
      name: 'Voltage Dip Alert',
      code: 'VOLTAGE_DIP',
      description: 'Trigger notification when voltage dip affects more than 50 customers',
      conditions: [
        {
          type: 'voltage_dip_detected',
          threshold: 50,
          operator: 'greater_than',
          value: null
        }
      ],
      associatedTemplates: [3], // Template IDs
      channels: [2, 1], // Channel IDs (Email, Internal)
      status: 'active',
      createdBy: 'admin',
      createdTime: '2023-06-16 10:00:00',
      updatedTime: '2023-06-16 10:00:00'
    },
    {
      id: 3,
      name: 'Server Overload Alert',
      code: 'SERVER_OVERLOAD',
      description: 'Trigger notification when server CPU usage exceeds 90%',
      conditions: [
        {
          type: 'cpu_usage',
          threshold: 90,
          operator: 'greater_than',
          value: null
        }
      ],
      associatedTemplates: [3],
      channels: [2, 3, 4], // Channel IDs (Email, SMS, WeChat)
      status: 'inactive',
      createdBy: 'admin',
      createdTime: '2023-06-17 11:00:00',
      updatedTime: '2023-06-17 11:00:00'
    }
  ]

  // 加载触发规则
  const loadTriggerRules = () => {
    loading.value = true
    error.value = null

    // 模拟异步加载
    setTimeout(() => {
      try {
        triggerRules.value = [...mockTriggerRules]
        loading.value = false
      } catch (err) {
        error.value = err.message
        loading.value = false
        ElMessage.error('Failed to load trigger rules')
      }
    }, 500)
  }

  // 添加触发规则
  const addTriggerRule = (rule) => {
    const newRule = {
      ...rule,
      id: Date.now(), // 简单ID生成
      createdTime: new Date().toISOString().replace('T', ' ').substr(0, 19),
      updatedTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
    }
    triggerRules.value.push(newRule)
    ElMessage.success('Trigger rule added successfully')
  }

  // 更新触发规则
  const updateTriggerRule = (id, updatedRule) => {
    const index = triggerRules.value.findIndex(rule => rule.id === id)
    if (index !== -1) {
      triggerRules.value[index] = {
        ...triggerRules.value[index],
        ...updatedRule,
        updatedTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }
      ElMessage.success('Trigger rule updated successfully')
    }
  }

  // 删除触发规则
  const deleteTriggerRule = (id) => {
    const index = triggerRules.value.findIndex(rule => rule.id === id)
    if (index !== -1) {
      triggerRules.value.splice(index, 1)
      ElMessage.success('Trigger rule deleted successfully')
    }
  }

  // 发布/激活触发规则
  const activateTriggerRule = (id) => {
    const rule = triggerRules.value.find(r => r.id === id)
    if (rule) {
      rule.status = 'active'
      rule.updatedTime = new Date().toISOString().replace('T', ' ').substr(0, 19)
      ElMessage.success('Trigger rule activated')
    }
  }

  // 停用触发规则
  const deactivateTriggerRule = (id) => {
    const rule = triggerRules.value.find(r => r.id === id)
    if (rule) {
      rule.status = 'inactive'
      rule.updatedTime = new Date().toISOString().replace('T', ' ').substr(0, 19)
      ElMessage.success('Trigger rule deactivated')
    }
  }

  // 获取触发规则通过ID
  const getTriggerRuleById = (id) => {
    return triggerRules.value.find(rule => rule.id === id)
  }

  return {
    triggerRules,
    loading,
    error,
    loadTriggerRules,
    addTriggerRule,
    updateTriggerRule,
    deleteTriggerRule,
    activateTriggerRule,
    deactivateTriggerRule,
    getTriggerRuleById
  }
})