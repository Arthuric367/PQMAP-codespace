import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useChannelStore = defineStore('channel', () => {
  // 状态
  const channels = ref([])
  const loading = ref(false)
  const error = ref(null)
  const defaultParamMappings = ref([])

  // 模拟的通知渠道数据
  const mockChannels = [
    { 
      id: 1, 
      name: 'In-system', 
      type: 'internal', 
      status: 'enabled',
      config: {
        messageBoxSize: 100,
        notificationEnabled: true
      },
      priority: 1,
      retryTimes: 3,
      retryInterval: 30,
      rateLimit: 1000,
      vendor: 'Internal System',
      tags: ['System', 'Internal'],
      paramMapping: {
        recipient: 'user_id',
        subject: 'title',
        content: 'content',
        url: 'link'
      },
      availableTime: {
        workDays: [1, 2, 3, 4, 5, 6, 7],
        timeRanges: [{ start: '00:00', end: '23:59' }]
      },
      monitorMetrics: {
        availability: 99.9,
        successRate: 99.8,
        avgResponseTime: 50
      }
    },
    { 
      id: 2, 
      name: 'Email', 
      type: 'email', 
      status: 'enabled',
      config: {
        host: 'smtp.example.com',
        port: 465,
        username: 'notification@example.com',
        password: '******',
        ssl: true,
        from: 'notification@example.com'
      },
      priority: 2,
      retryTimes: 3,
      retryInterval: 60,
      rateLimit: 50,
      vendor: 'Corporate Email',
      tags: ['Email', 'Official'],
      paramMapping: {
        recipient: 'to_email',
        subject: 'subject',
        content: 'html_body',
        attachment: 'attachments'
      },
      availableTime: {
        workDays: [1, 2, 3, 4, 5],
        timeRanges: [{ start: '08:30', end: '22:00' }]
      },
      monitorMetrics: {
        availability: 98.5,
        successRate: 97.2,
        avgResponseTime: 1200
      }
    },
    { 
      id: 3, 
      name: 'SMS', 
      type: 'sms', 
      status: 'enabled',
      config: {
        accessKey: 'ALI*****',
        secretKey: '******',
        signName: 'xxx',
        region: 'HK'
      },
      priority: 3,
      retryTimes: 2,
      retryInterval: 30,
      rateLimit: 20,
      vendor: 'xx',
      tags: ['SMS', 'Marketing'],
      paramMapping: {
        recipient: 'phone_number',
        content: 'content',
        template_id: 'template_code'
      },
      availableTime: {
        workDays: [1, 2, 3, 4, 5, 6, 7],
        timeRanges: [{ start: '08:00', end: '20:00' }]
      },
      monitorMetrics: {
        availability: 99.1,
        successRate: 98.5,
        avgResponseTime: 800
      }
    },
    { 
      id: 4, 
      name: 'System webhook', 
      type: 'webhook', 
      status: 'enabled',
      config: {
        url: 'https://api.example.com/notifications',
        method: 'POST',
        headers: '{"Content-Type": "application/json", "X-API-Key": "abc123"}',
        timeout: 5
      },
      priority: 6,
      retryTimes: 5,
      retryInterval: 120,
      rateLimit: 100,
      vendor: 'Internal System',
      tags: ['webhook', 'API'],
      paramMapping: {
        content: 'payload'
      },
      availableTime: {
        workDays: [1, 2, 3, 4, 5, 6, 7],
        timeRanges: [{ start: '00:00', end: '23:59' }]
      },
      monitorMetrics: {
        availability: 99.8,
        successRate: 99.5,
        avgResponseTime: 250
      }
    }
  ]

  // 加载通知渠道
  const loadChannels = () => {
    loading.value = true
    error.value = null
    
    // 模拟API调用
    setTimeout(() => {
      channels.value = mockChannels
      loading.value = false
    }, 300)
    
    // 实际项目中应使用axios请求
    // axios.get('/api/channels')
    //   .then(response => {
    //     channels.value = response.data
    //   })
    //   .catch(err => {
    //     error.value = err.message
    //   })
    //   .finally(() => {
    //     loading.value = false
    //   })
  }

  // 加载默认参数映射配置
  const loadDefaultParamMappings = () => {
    loading.value = true
    error.value = null
    
    // 实际项目中应从API获取
    // 这里使用模拟数据
    setTimeout(() => {
      // 先创建标准参数列表
      const standardParamsList = [
        {
          id: 'recipient',
          key: 'recipient',
          label: 'Recipient',
          description: 'Recipient identifier',
          required: true
        },
        {
          id: 'subject',
          key: 'subject',
          label: 'Subject',
          description: 'Message subject or title',
          required: true
        },
        {
          id: 'content',
          key: 'content',
          label: 'Content',
          description: 'Message content',
          required: true
        },
        {
          id: 'attachment',
          key: 'attachment',
          label: 'Attachment',
          description: 'Message attachment',
          required: false
        },
        {
          id: 'importance',
          key: 'importance',
          label: 'Importance',
          description: 'Message importance level',
          required: false
        },
        {
          id: 'template_id',
          key: 'template_id',
          label: 'Template ID',
          description: 'Message template identifier',
          required: false
        },
        {
          id: 'url',
          key: 'url',
          label: 'Url',
          description: 'Related link address',
          required: false
        }
      ];
      
      // 设置映射关系
      defaultParamMappings.value = [
        {
          standardParam: standardParamsList[0],
          mappings: {
            email: {
              paramKey: 'to_email',
              description: 'Email address',
              isRequired: true
            },
            sms: {
              paramKey: 'phone_number',
              description: 'Phone number',
              isRequired: true
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: 'user_id',
              description: 'User ID',
              isRequired: true
            }
          }
        },
        {
          standardParam: standardParamsList[1],
          mappings: {
            email: {
              paramKey: 'subject',
              description: 'Email subject',
              isRequired: true
            },
            sms: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: 'title',
              description: 'Title',
              isRequired: true
            }
          }
        },
        {
          standardParam: standardParamsList[2],
          mappings: {
            email: {
              paramKey: 'html_body',
              description: 'HTML body content',
              isRequired: true
            },
            sms: {
              paramKey: 'content',
              description: 'SMS content',
              isRequired: true
            },
            webhook: {
              paramKey: 'payload',
              description: 'Request data',
              isRequired: true
            },
            internal: {
              paramKey: 'content',
              description: 'Content',
              isRequired: true
            }
          }
        },
        {
          standardParam: standardParamsList[3],
          mappings: {
            email: {
              paramKey: 'attachments',
              description: 'Attachment list',
              isRequired: false
            },
            sms: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: '',
              description: '',
              isRequired: false
            }
          }
        },
        {
          standardParam: standardParamsList[4],
          mappings: {
            email: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            sms: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: 'type',
              description: 'Im-system notification type',
              isRequired: false
            }
          }
        },
        {
          standardParam: standardParamsList[5],
          mappings: {
            email: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            sms: {
              paramKey: 'template_code',
              description: 'Template code',
              isRequired: false
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: '',
              description: '',
              isRequired: false
            }
          }
        },
        {
          standardParam: standardParamsList[6],
          mappings: {
            email: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            sms: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            webhook: {
              paramKey: '',
              description: '',
              isRequired: false
            },
            internal: {
              paramKey: 'link',
              description: 'Link address',
              isRequired: false
            }
          }
        }
      ]
      loading.value = false
    }, 300)
  }

  // 更新默认参数映射配置
  const updateDefaultParamMappings = (mappings) => {
    defaultParamMappings.value = mappings
    
    // 实际项目中应调用API保存到后端
    ElMessage.success('Default parameter mappings updated successfully')
    return true
  }

  // 根据ID获取渠道
  const getChannelById = (id) => {
    return channels.value.find(channel => channel.id === id)
  }

  // 根据类型获取渠道
  const getChannelsByType = (type) => {
    return channels.value.filter(channel => channel.type === type)
  }

  // 获取启用的渠道
  const getEnabledChannels = () => {
    return channels.value.filter(channel => channel.status === 'enabled')
  }

  // 添加渠道
  const addChannel = (channel) => {
    // 生成新ID（实际项目中应由后端生成）
    const newId = Math.max(...channels.value.map(c => c.id)) + 1
    
    const newChannel = {
      ...channel,
      id: newId
    }
    
    channels.value.push(newChannel)
    ElMessage.success('Channel added successfully')
    return newChannel
  }

  // 更新渠道
  const updateChannel = (id, updatedChannel) => {
    const index = channels.value.findIndex(channel => channel.id === id)
    
    if (index !== -1) {
      channels.value[index] = {
        ...channels.value[index],
        ...updatedChannel
      }
      ElMessage.success('Channel updated successfully')
      return true
    }
    
    ElMessage.error('Cannot find the channel to update')
    return false
  }

  // 删除渠道
  const deleteChannel = (id) => {
    const index = channels.value.findIndex(channel => channel.id === id)
    
    if (index !== -1) {
      channels.value.splice(index, 1)
      ElMessage.success('Channel deleted successfully')
      return true
    }
    
    ElMessage.error('Cannot find the channel to delete')
    return false
  }

  // 启用渠道
  const enableChannel = (id) => {
    const channel = getChannelById(id)
    
    if (channel) {
      channel.status = 'enabled'
      ElMessage.success(`${channel.name} activated`)
      return true
    }

    ElMessage.error('Cannot find the channel to activate')
    return false
  }

  // 禁用渠道
  const disableChannel = (id) => {
    const channel = getChannelById(id)
    
    if (channel) {
      channel.status = 'disabled'
      ElMessage.success(`${channel.name} disabled`)
      return true
    }

    ElMessage.error('Cannot find the channel to disable')
    return false
  }

  // 测试渠道连接
  const testChannel = (id) => {
    const channel = getChannelById(id)
    
    if (!channel) {
      ElMessage.error('Cannot find the channel to test')
      return Promise.reject('Cannot find the channel to test')
    }
    
    // 模拟API调用
    return new Promise((resolve) => {
      ElMessage.info('Testing channel connection...')
      
      setTimeout(() => {
        // 模拟80%成功率
        const success = Math.random() > 0.2
        
        if (success) {
          ElMessage.success(`${channel.name} connection test successful`)
          resolve({
            success: true,
            message: 'Connection test successful',
            data: {
              responseTime: Math.floor(Math.random() * 500 + 100),
              timestamp: new Date().toISOString()
            }
          })
        } else {
          const errorMsg = `${channel.name} connection test failed`
          ElMessage.error(errorMsg)
          resolve({
            success: false,
            message: errorMsg,
            error: 'Connection timeout or service unavailable'
          })
        }
      }, 1500)
    })
  }

  return {
    channels,
    loading,
    error,
    defaultParamMappings,
    loadChannels,
    loadDefaultParamMappings,
    updateDefaultParamMappings,
    getChannelById,
    getChannelsByType,
    getEnabledChannels,
    addChannel,
    updateChannel,
    deleteChannel,
    enableChannel,
    disableChannel,
    testChannel
  }
}) 