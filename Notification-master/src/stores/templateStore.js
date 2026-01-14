import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useTemplateStore = defineStore('template', () => {
  // 状态
  const templates = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 模拟的模板数据
  const mockTemplates = [
    { 
      id: 1, 
      name: 'System Maintenance Notification', 
      code: 'SYS_MAINTENANCE', 
      type: 1, 
      status: 'published',
      content: {
        email: 'Dear user, we plan to perform system maintenance from {date} to {duration}. During this time, the system will be unavailable. We will try to minimize the maintenance time and apologize for any inconvenience caused.',
        sms: '【System Notification】Dear user, we will perform system maintenance on {date}, estimated to resume in {duration} hours. We apologize for any inconvenience caused.',
        internal: 'System will be maintained on {date}, during which the system will be suspended for {duration} hours.',
        wechat: 'System maintenance notification: We will perform system maintenance on {date}, estimated to resume in {duration} hours.'
      },
      variables: ['date', 'duration']
    },
    { 
      id: 2, 
      name: 'Order Review Reminder', 
      code: 'ORDER_REVIEW', 
      type: 2, 
      status: 'published',
      content: {
        email: 'Dear user, order #{orderId} requires your review, please process it as soon as possible.<br><br>Order details: {orderDetail}',
        sms: '【Work Reminder】Order #{orderId} requires your review, please process it as soon as possible.',
        internal: 'Order #{orderId} requires your review, please process it as soon as possible. Order details: {orderDetail}',
        wechat: 'Order review reminder: Order #{orderId} requires your review, please process it as soon as possible.'
      },
      variables: ['orderId', 'orderDetail']
    },
    { 
      id: 3, 
      name: 'Server Alert Notification', 
      code: 'SERVER_ALERT', 
      type: 3, 
      status: 'published',
      content: {
        email: 'Warning:<br><br>Server {serverName} has an exception, exception information: {alertInfo}.<br><br>Please handle it promptly!',
        sms: '【Alert】Server {serverName} exception: {alertInfo}, please handle it promptly!',
        internal: 'Server {serverName} has an exception, exception information: {alertInfo}. Please handle it promptly!',
        wechat: 'Server alert: {serverName} exception, {alertInfo}, please handle it promptly!'
      },
      variables: ['serverName', 'alertInfo']
    },
    { 
      id: 4, 
      name: 'Meeting Reminder', 
      code: 'MEETING_REMINDER', 
      type: 4, 
      status: 'published',
      content: {
        email: 'Meeting notification：<br><br>Subject：{subject}<br>Time：{time}<br>Location：{location}<br>Participants：{participants}<br><br>Please attend on time!',
        sms: '【Meeting Notification】{subject}，Time：{time}，Location：{location}，Please attend on time!',
        internal: 'Meeting notification：{subject}，Time：{time}，Location：{location}，Participants：{participants}，Please attend on time!',
        wechat: 'Meeting reminder：{subject}，{time}，{location}，Please attend on time!'
      },
      variables: ['subject', 'time', 'location', 'participants']
    },
  ]

  // 更详细的模板数据（用于模板详情页面）
  const detailedTemplates = [
    {
      id: 'TPL202306006',
      templateName: 'System Maintenance Notification',
      templateCode: 'SYSTEM_MAINTENANCE',
      templateType: 'system',
      supportChannels: ['email', 'web_notification', 'app_push'],
      description: 'System maintenance notification to users',
      createdBy: 'system_admin',
      createdTime: '2023-06-21 11:20:35',
      updatedTime: '2023-06-21 11:20:35',
      status: 'draft',
      version: '1.0.0',
      content: {
        email: 'Dear user, we plan to perform system maintenance from {startTime} to {endTime}. During this time, {affectedServices} will be unavailable. We will try to minimize the maintenance time and apologize for any inconvenience caused.',
        web_notification: 'System maintenance notification: {startTime} to {endTime} system maintenance, {affectedServices} suspended.',
        app_push: 'System maintenance: Maintenance starts at {startTime}, estimated duration is {duration} hours. Please prepare in advance.'
      },
      variableConfig: [
        {
          name: "startTime",
          dataType: "date",
          required: true,
          description: "Start time",
          example: "2023-06-25 22:00:00"
        },
        {
          name: "endTime",
          dataType: "date",
          required: true,
          description: "End time",
          example: "2023-06-26 02:00:00"
        },
        {
          name: "duration",
          dataType: "number",
          required: true,
          description: "Duration (hours)",
          example: "4"
        },
        {
          name: "affectedServices",
          dataType: "string",
          required: true,
          description: "Affected services",
          example: "User Center, Order System"
        }
      ]
    },
    {
      id: 'TPL202306007',
      templateName: 'Password Reset Notification',
      templateCode: 'PASSWORD_RESET',
      templateType: 'notification',
      supportChannels: ['email', 'sms'],
      description: 'User applies to reset password and receives verification code notification',
      createdBy: 'security_admin',
      createdTime: '2023-06-22 09:15:40',
      updatedTime: '2023-06-22 09:15:40',
      status: 'published',
      version: '1.0.0',
      content: {
        email: 'You are resetting your password, the verification code is: {verificationCode}, it is valid for {validPeriod} minutes. If this is not your operation, please ignore this email.',
        sms: 'You are resetting your password, the verification code is: {verificationCode}, it is valid for {validPeriod} minutes. Please do not disclose the verification code to others.'
      },
      variableConfig: [
        {
          name: "verificationCode",
          dataType: "string",
          required: true,
          description: "Verification code",
          example: "123456"
        },
        {
          name: "validPeriod",
          dataType: "number",
          required: true,
          description: "Valid period (minutes)",
          example: "15"
        }
      ]
    }
  ]

  // 加载消息模板
  const loadTemplates = () => {
    loading.value = true
    error.value = null
    
    // 模拟API调用 - 加载详细版本的模板数据
    setTimeout(() => {
      templates.value = detailedTemplates
      loading.value = false
    }, 300)
    
    // 实际项目中应使用axios请求
    // axios.get('/api/templates')
    //   .then(response => {
    //     templates.value = response.data
    //   })
    //   .catch(err => {
    //     error.value = err.message
    //   })
    //   .finally(() => {
    //     loading.value = false
    //   })
  }

  // 加载详细模板数据
  const loadDetailedTemplates = () => {
    loading.value = true
    error.value = null
    
    // 模拟API调用 - 详细版本的模板数据
    setTimeout(() => {
      templates.value = detailedTemplates
      loading.value = false
    }, 300)
  }

  // 根据ID获取模板
  const getTemplateById = (id) => {
    // 先在简易版本中查找
    let template = templates.value.find(t => t.id === id)
    
    // 如果找不到，在详细版本中查找
    if (!template) {
      template = detailedTemplates.find(t => t.id === id)
    }
    
    return template
  }

  // 根据代码获取模板
  const getTemplateByCode = (code) => {
    // 先在简易版本中查找
    let template = templates.value.find(t => t.code === code)
    
    // 如果找不到，在详细版本中查找
    if (!template) {
      template = detailedTemplates.find(t => t.templateCode === code)
    }
    
    return template
  }

  // 添加模板
  const addTemplate = (template) => {
    // 实际项目中应通过API提交到后端
    // 这里使用模拟逻辑
    
    // 检查代码是否已存在
    const existingTemplate = templates.value.find(t => 
      t.code === template.code || 
      (t.templateCode && t.templateCode === template.code)
    )
    
    if (existingTemplate) {
      ElMessage.error(`Template code ${template.code} already exists`)
      return false
    }
    
    // 生成新ID（实际项目中应由后端生成）
    const newId = Math.max(...templates.value.map(t => typeof t.id === 'number' ? t.id : 0)) + 1
    
    const newTemplate = {
      ...template,
      id: newId,
      status: template.status || 'draft',
      createdTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
    }
    
    templates.value.push(newTemplate)
    ElMessage.success('Template added successfully')
    return newTemplate
  }

  // 更新模板
  const updateTemplate = (id, updatedTemplate) => {
    const index = templates.value.findIndex(t => t.id === id)
    
    if (index !== -1) {
      templates.value[index] = {
        ...templates.value[index],
        ...updatedTemplate,
        updatedTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }

      ElMessage.success('Template updated successfully')
      return true
    }

    ElMessage.error('Cannot find the template to update')
    return false
  }

  // 删除模板
  const deleteTemplate = (id) => {
    const index = templates.value.findIndex(t => t.id === id)
    
    if (index !== -1) {
      templates.value.splice(index, 1)
      ElMessage.success('Template deleted successfully')
      return true
    }

    ElMessage.error('Cannot find the template to delete')
    return false
  }

  // 发布模板
  const publishTemplate = (id) => {
    const template = templates.value.find(t => t.id === id)
    
    if (template) {
      template.status = 'published'
      template.updatedTime = new Date().toISOString().replace('T', ' ').substr(0, 19)
      ElMessage.success('Template published successfully')
      return true
    }
    
    ElMessage.error('Cannot find the template to publish')
    return false
  }

  // 模板预览
  const previewTemplate = (id, data = {}) => {
    const template = getTemplateById(id)
    
    if (!template) {
      ElMessage.error('Cannot find the template to preview')
      return null
    }
    
    // 根据提供的数据替换变量
    const previewContent = {}
    
    for (const channel in template.content) {
      let content = template.content[channel]
      
      // 替换变量
      for (const variable in data) {
        const regex = new RegExp(`{${variable}}`, 'g')
        content = content.replace(regex, data[variable] || `{${variable}}`)
      }
      
      previewContent[channel] = content
    }
    
    return {
      ...template,
      previewContent
    }
  }

  return {
    templates,
    loading,
    error,
    loadTemplates,
    loadDetailedTemplates,
    getTemplateById,
    getTemplateByCode,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    publishTemplate,
    previewTemplate
  }
}) 