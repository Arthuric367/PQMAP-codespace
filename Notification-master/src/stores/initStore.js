import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMessageStore } from './messageStore'
import { useMessageTypeStore } from './messageTypeStore'
import { useTemplateStore } from './templateStore'
import { useChannelStore } from './channelStore'
import { useSystemStore } from './systemStore'
import { useStatisticsStore } from './statisticsStore'
import { useTriggerRuleStore } from './triggerRuleStore'
import { ElMessage } from 'element-plus'

export const useInitStore = defineStore('init', () => {
  // 状态
  const initialized = ref(false)
  const initializing = ref(false)
  const error = ref(null)
  
  // 初始化所有store
  const initializeAll = async () => {
    if (initializing.value) {
      ElMessage.info('Data is being initialized, please wait...')
      return
    }
    
    if (initialized.value) {
      ElMessage.info('Data has already been initialized')
      return
    }
    
    try {
      initializing.value = true
      error.value = null
      
      // 获取所有store实例
      const messageStore = useMessageStore()
      const messageTypeStore = useMessageTypeStore()
      const templateStore = useTemplateStore()
      const channelStore = useChannelStore()
      const systemStore = useSystemStore()
      const statisticsStore = useStatisticsStore()
      const triggerRuleStore = useTriggerRuleStore()
      
      console.log('Starting initialization of all data...')
      
      // 串行加载数据，确保顺序执行
      const initializeDataSequentially = async () => {
        try {
          // 消息类型数据
          console.log('Loading message types...')
          await new Promise(resolve => {
            messageTypeStore.loadMessageTypes()
            setTimeout(resolve, 300)
          })
          
          // 通知渠道数据
          console.log('Loading notification channels...')
          await new Promise(resolve => {
            channelStore.loadChannels()
            setTimeout(resolve, 300)
          })
          
          // 加载渠道参数映射
          console.log('Loading channel parameter mappings...')
          await new Promise(resolve => {
            channelStore.loadDefaultParamMappings()
            setTimeout(resolve, 300)
          })
          
          // 消息模板数据 - 提前加载
          console.log('Loading message templates...')
          await new Promise(resolve => {
            templateStore.loadTemplates()
            setTimeout(resolve, 300)
          })
          
          // 触发规则数据
          console.log('Loading trigger rules...')
          await new Promise(resolve => {
            triggerRuleStore.loadTriggerRules()
            setTimeout(resolve, 300)
          })
          
          // 系统对接数据
          console.log('Loading system connections...')
          await new Promise(resolve => {
            systemStore.loadSystems()
            setTimeout(resolve, 300)
          })
          
          // 统计数据
          console.log('Loading statistical data...')
          await new Promise(resolve => {
            statisticsStore.loadStatistics()
            setTimeout(resolve, 300)
          })
          
          // 消息列表数据
          console.log('Loading message list...')
          await new Promise(resolve => {
            messageStore.loadMessages()
            setTimeout(resolve, 300)
          })
          
          initialized.value = true
          initializing.value = false
          console.log('Data loading completed.')
          ElMessage.success('Data loading completed')
        } catch (err) {
          console.error('Data loading failed：', err)
          error.value = err.message || 'Data loading failed'
          initializing.value = false
          ElMessage.error(`Data loading failed: ${error.value}`)
        }
      }
      
      await initializeDataSequentially()
    } catch (err) {
      console.error('Initialization process error:', err)
      error.value = err.message || 'Initialization failed'
      initializing.value = false
      ElMessage.error(`Initialization failed: ${error.value}`)
    }
  }
  
  // 重置数据
  const resetAll = () => {
    initialized.value = false
    initializing.value = false
    error.value = null
  }
  
  return {
    initialized,
    initializing,
    error,
    initializeAll,
    resetAll
  }
}) 