<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useChannelStore } from '@/stores'

const channelStore = useChannelStore()

// 渠道列表
const channels = computed(() => channelStore.channels)

// 表格加载状态
const loading = ref(false)
// 渠道对话框可见性
const channelDialogVisible = ref(false)
// 当前编辑的渠道
const currentChannel = ref({
  id: null,
  name: '',
  type: '',
  status: 'enabled',
  config: {},
  priority: 0,
  retryTimes: 3,
  retryInterval: 60,
  rateLimit: 100,
  vendor: '',
  tags: [],
  paramMapping: {},
  availableTime: {
    workDays: [1, 2, 3, 4, 5],
    timeRanges: [{ start: '00:00', end: '23:59' }]
  },
  monitorMetrics: {
    availability: 100,
    successRate: 100,
    avgResponseTime: 0
  }
})
// 对话框模式：新增/编辑
const dialogMode = ref('add')
// 测试对话框可见性
const testDialogVisible = ref(false)
// 测试表单
const testForm = ref({
  recipient: '',
  subject: '',
  content: ''
})
// 测试结果
const testResult = ref({
  success: false,
  message: '',
  time: 0
})
// 测试加载状态
const testLoading = ref(false)

// 搜索关键字
const searchKeyword = ref('')
// 类型筛选
const typeFilter = ref('all')
// 状态筛选
const statusFilter = ref('all')
// 标签筛选
const tagFilter = ref([])

// 分页相关变量
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 获取所有标签
const allTags = computed(() => {
  const tagSet = new Set()
  channels.value.forEach(channel => {
    if (channel.tags && channel.tags.length) {
      channel.tags.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet)
})

// 渠道类型选项
const channelTypeOptions = [
  { value: 'email', label: 'Email' },
 { value: 'sms', label: 'SMS' },
  { value: 'system_notification', label: 'In-system' },
  { value: 'xx', label: 'xx' },
  { value: 'xxx', label: 'xxx' }
]

// 筛选后的渠道列表
const filteredChannels = computed(() => {
  let result = [...channels.value]
  
  // 按关键字搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(channel => 
      channel.name.toLowerCase().includes(keyword) || 
      channel.vendor.toLowerCase().includes(keyword)
    )
  }
  
  // 按类型筛选
  if (typeFilter.value !== 'all') {
    result = result.filter(channel => channel.type === typeFilter.value)
  }
  
  // 按状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(channel => channel.status === statusFilter.value)
  }
  
  // 按标签筛选
  if (tagFilter.value.length > 0) {
    result = result.filter(channel => 
      channel.tags && 
      channel.tags.some(tag => tagFilter.value.includes(tag))
    )
  }
  
  // 更新总数
  pagination.value.total = result.length
  
  return result
})

// 分页后的渠道列表
const paginatedChannels = computed(() => {
  // 分页处理
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredChannels.value.slice(start, end)
})

// 处理分页变化
const handleCurrentChange = (val) => {
  pagination.value.currentPage = val
}

// 处理每页数量变化
const handleSizeChange = (val) => {
  pagination.value.pageSize = val
  pagination.value.currentPage = 1
}

// 加载渠道列表
const loadChannels = () => {
  loading.value = true
  
  // 实际项目中应从API获取
  setTimeout(() => {
    channelStore.loadChannels()
    loading.value = false
  }, 500)
}

// 打开新增渠道对话框
const openAddDialog = () => {
  dialogMode.value = 'add'
  currentChannel.value = {
    id: null,
    name: '',
    type: '',
    status: 'enabled',
    config: {},
    priority: 1,
    retryTimes: 3,
    retryInterval: 60,
    rateLimit: 100,
    vendor: '',
    tags: [],
    paramMapping: {},
    availableTime: {
      workDays: [1, 2, 3, 4, 5],
      timeRanges: [{ 
        start: convertTimeStringToDate('00:00'), 
        end: convertTimeStringToDate('23:59') 
      }]
    },
    monitorMetrics: {
      availability: 100,
      successRate: 100,
      avgResponseTime: 0
    }
  }
  channelDialogVisible.value = true
}

// 打开编辑渠道对话框
const openEditDialog = (channel) => {
  dialogMode.value = 'edit'
  // 深拷贝渠道数据
  const channelCopy = JSON.parse(JSON.stringify(channel))
  
  // 转换时间字符串为Date对象
  if (channelCopy.availableTime && channelCopy.availableTime.timeRanges) {
    channelCopy.availableTime.timeRanges = channelCopy.availableTime.timeRanges.map(range => ({
      start: convertTimeStringToDate(range.start),
      end: convertTimeStringToDate(range.end)
    }))
  }
  
  currentChannel.value = channelCopy
  channelDialogVisible.value = true
}

// 将时间字符串转换为Date对象
const convertTimeStringToDate = (timeString) => {
  if (!timeString) return new Date()
  
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0)
  date.setMinutes(minutes || 0)
  date.setSeconds(0)
  return date
}

// 将Date对象转换为时间字符串 (HH:mm)
const convertDateToTimeString = (date) => {
  if (!date) return '00:00'
  
  try {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } catch (error) {
    console.error('时间格式转换错误:', error)
    return '00:00'
  }
}

// 保存渠道
const saveChannel = () => {
  // 表单验证
  if (!currentChannel.value.name || !currentChannel.value.type) {
    ElMessage.warning('Please fill in the required fields')
    return
  }
  
  // 将时间选择器的Date对象转换回字符串格式
  if (currentChannel.value.availableTime && currentChannel.value.availableTime.timeRanges) {
    currentChannel.value.availableTime.timeRanges = currentChannel.value.availableTime.timeRanges.map(range => ({
      start: convertDateToTimeString(range.start),
      end: convertDateToTimeString(range.end)
    }))
  }
  
  if (dialogMode.value === 'add') {
    // 添加新渠道
    channelStore.addChannel(currentChannel.value)
    ElMessage.success('Channel added')
  } else {
    // 更新渠道
    channelStore.updateChannel(currentChannel.value.id, currentChannel.value)
    ElMessage.success('Channel updated')
  }
  
  channelDialogVisible.value = false
}

// 测试渠道连接
const testChannel = (channel) => {
  testDialogVisible.value = true
  testResult.value = { success: false, message: '', time: 0 }
  testLoading.value = false
  
  // 根据渠道类型设置不同的测试表单
  testForm.value = {
    recipient: '',
    subject: channel.type === 'email' || channel.type === 'internal' ? 'Testing message' : '',
    content: 'This is a test message used to verify whether the channel connection is normal.'
  }
  
  // 针对不同渠道类型设置不同的收件人格式提示
  if (channel.type === 'email') {
    testForm.value.recipient = 'test@example.com'
  } else if (channel.type === 'sms') {
    testForm.value.recipient = '13800138000'
  } else if (channel.type === 'wechat' || channel.type === 'dingtalk') {
    testForm.value.recipient = 'user123'
  } else {
    testForm.value.recipient = 'test_user'
  }
}

// 执行渠道测试
const executeChannelTest = (channelId) => {
  testLoading.value = true
  
  // 调用store的测试方法
  channelStore.testChannel(channelId)
    .then(result => {
      testResult.value = result
      testLoading.value = false
    })
    .catch(error => {
      testResult.value = {
        success: false,
        message: error.message || 'Testing failed',
        time: 0
      }
      testLoading.value = false
    })
}

// 切换渠道状态
const toggleChannelStatus = (channel) => {
  if (channel.status === 'enabled') {
    channelStore.disableChannel(channel.id)
  } else {
    channelStore.enableChannel(channel.id)
  }
}

// 删除渠道
const deleteChannel = (channel) => {
  ElMessageBox.confirm(
    `Confirm to delete channel "${channel.name}" ？`,
    'Confirm delete',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    channelStore.deleteChannel(channel.id)
  }).catch(() => {
    // 用户取消
  })
}

// 获取渠道类型显示名称
const getChannelTypeName = (type) => {
  const option = channelTypeOptions.find(opt => opt.value === type)
  return option ? option.label : type
}

// 获取渠道类型图标
const getChannelTypeIcon = (type) => {
  switch (type) {
    case 'email': return 'Message'
    case 'sms': return 'ChatDotRound'
    case 'wechat': return 'ChatLineRound'
    case 'dingtalk': return 'Bell'
    case 'webhook': return 'Link'
    case 'internal': return 'Notification'
    default: return 'More'
  }
}

// 获取成功率颜色
const getSuccessRateColor = (rate) => {
  if (rate >= 95) return '#67C23A' // 绿色
  if (rate >= 80) return '#E6A23C' // 黄色
  return '#F56C6C' // 红色
}

// 获取参数显示名称
const getParamLabel = (paramKey, paramType) => {
  if (!paramKey) return '-'
  
  if (paramType === 'standard') {
    const param = getParamMappingForm().standardParams.find(p => p.key === paramKey)
    return param ? param.label : paramKey
  }
  
  const channelParams = {
    email: getParamMappingForm().channelSpecificParams.email || [],
    sms: getParamMappingForm().channelSpecificParams.sms || [],
    wechat: getParamMappingForm().channelSpecificParams.wechat || [],
    dingtalk: getParamMappingForm().channelSpecificParams.dingtalk || [],
    webhook: getParamMappingForm().channelSpecificParams.webhook || [],
    internal: getParamMappingForm().channelSpecificParams.internal || []
  }
  
  const param = channelParams[paramType]?.find(p => p.key === paramKey)
  return param ? param.label : paramKey
}

// 获取参数值（用于测试对话框中的参数映射预览）
const getParamValue = (paramKey, formData) => {
  switch (paramKey) {
    case 'recipient': return formData.recipient
    case 'subject': return formData.subject
    case 'content': return formData.content
    default: return '-'
  }
}

// 获取渠道配置表单
const getChannelConfigForm = () => {
  switch (currentChannel.value.type) {
    case 'email':
      return [
        { key: 'host', label: 'SMTP Server', type: 'input', required: true },
        { key: 'port', label: 'Port', type: 'number', required: true },
        { key: 'username', label: 'User Name', type: 'input', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'ssl', label: 'SSL', type: 'switch', required: false },
        { key: 'from', label: 'Sender', type: 'input', required: true }
      ]
    case 'sms':
      return [
        { key: 'accessKey', label: 'AccessKey', type: 'input', required: true },
        { key: 'secretKey', label: 'SecretKey', type: 'password', required: true },
        { key: 'signName', label: 'Sign Name', type: 'input', required: true },
        { key: 'region', label: 'Region', type: 'input', required: false }
      ]
    case 'xx':
      return [
        { key: 'appId', label: 'AppID', type: 'input', required: true },
        { key: 'appSecret', label: 'AppSecret', type: 'password', required: true },
        { key: 'templateId', label: 'Template ID', type: 'input', required: true }
      ]
    case 'xxx':
      return [
        { key: 'accessToken', label: 'AccessToken', type: 'input', required: true },
        { key: 'secret', label: 'Encrypted Key', type: 'password', required: false }
      ]
    case 'webhook':
      return [
        { key: 'url', label: 'Webhook URL', type: 'input', required: true },
        { key: 'method', label: 'Method', type: 'select', options: ['POST', 'GET'], required: true },
        { key: 'headers', label: 'Header', type: 'textarea', required: false },
        { key: 'timeout', label: 'Timeout (s)', type: 'number', required: false }
      ]
    default:
      return []
  }
}

// 获取参数映射配置表单
const getParamMappingForm = () => {
  // 系统标准参数列表
  const standardParams = [
    { key: 'recipient', label: 'Recipient', description: 'Message recipient identifier' },
    { key: 'subject', label: 'Subject', description: 'Subject or title of the message' },
    { key: 'content', label: 'Content', description: 'Body of the message' },
    { key: 'attachment', label: 'Attachment', description: 'Message Attachment' },
    { key: 'importance', label: 'Importance', description: 'Importance level of the message' },
    { key: 'template_id', label: 'Template ID', description: 'Message template identifier' },
    { key: 'url', label: 'Url', description: 'Clickable links in the message' }
  ]
  
  // 各渠道的特定参数
  const channelSpecificParams = {
    email: [
  { key: 'to_email', label: 'Recipient Email', description: 'The email address of the recipient' },
  { key: 'cc', label: 'CC', description: 'List of CC email addresses' },
  { key: 'bcc', label: 'BCC', description: 'List of BCC email addresses' },
  { key: 'subject', label: 'Email Subject', description: 'The title of the email' },
  { key: 'html_body', label: 'HTML Body', description: 'The HTML formatted body of the email' },
  { key: 'text_body', label: 'Plain Text Body', description: 'The plain text formatted body of the email' },
  { key: 'attachments', label: 'Attachment List', description: 'List of email attachments' }
    ],
    sms: [
  { key: 'phone_number', label: 'Phone Number', description: 'The recipient’s phone number' },
  { key: 'content', label: 'SMS Content', description: 'The text content of the SMS' },
  { key: 'template_code', label: 'Template Code', description: 'The template code provided by the SMS service provider' },
  { key: 'template_param', label: 'Template Parameters', description: 'The parameters for the SMS template' }
    ],
   
    webhook: [
  { key: 'payload', label: 'Request Data', description: 'The body of the Webhook request' },
  { key: 'headers', label: 'Request Headers', description: 'The header information of the Webhook request' }
    ],
    internal: [
  { key: 'user_id', label: 'User ID', description: 'The unique identifier for an internal system user' },
  { key: 'title', label: 'Title', description: 'The title of the site message' },
  { key: 'content', label: 'Content', description: 'The content of the site message' },
  { key: 'type', label: 'Type', description: 'The type of the site message' },
  { key: 'link', label: 'Link', description: 'The related link address' }
    ]
  }
  
  return {
    standardParams,
    channelSpecificParams: channelSpecificParams[currentChannel.value.type] || []
  }
}

// 初始化参数映射
const initParamMapping = () => {
  // 如果当前渠道没有参数映射，则初始化默认映射
  if (!currentChannel.value.paramMapping) {
    currentChannel.value.paramMapping = {}
  }
  
  // 获取默认映射
  const defaultMapping = getDefaultParamMapping(currentChannel.value.type)
  
  // 在编辑模式下，保留现有映射，只添加缺失的默认映射
  if (dialogMode.value === 'edit') {
    // 合并默认映射和现有映射，保留用户设置的映射
    Object.keys(defaultMapping).forEach(key => {
      if (!currentChannel.value.paramMapping[key]) {
        currentChannel.value.paramMapping[key] = defaultMapping[key]
      }
    })
  } else {
    // 新增模式下，使用默认映射
    currentChannel.value.paramMapping = { ...defaultMapping }
  }
}

// 获取默认参数映射
const getDefaultParamMapping = (channelType) => {
  // 从 channelStore 中获取全局默认映射配置
  // 实际项目中应该从后端API获取
  const defaultMappings = channelStore.defaultParamMappings || []
  
  // 构建映射对象
  const mapping = {}
  
  // 遍历默认映射配置，找到对应渠道类型的映射
  defaultMappings.forEach(config => {
    const standardParam = config.standardParam
    const targetParam = config.mappings?.[channelType]
    
    // 只添加有效的映射（目标参数不为空）
    if (standardParam && targetParam) {
      mapping[standardParam] = targetParam
    }
  })
  
  // 如果没有找到配置或配置为空，使用硬编码的默认值作为备选
  if (Object.keys(mapping).length === 0) {
    switch (channelType) {
      case 'email':
        return {
          recipient: 'to_email',
          subject: 'subject',
          content: 'html_body',
          attachment: 'attachments'
        }
      case 'sms':
        return {
          recipient: 'phone_number',
          content: 'content',
          template_id: 'template_code'
        }
      case 'wechat':
        return {
          recipient: 'open_id',
          subject: 'first_data',
          content: 'remark',
          url: 'url'
        }
      case 'dingtalk':
        return {
          recipient: 'user_id',
          subject: 'title',
          content: 'text'
        }
      case 'webhook':
        return {
          content: 'payload'
        }
      case 'internal':
        return {
          recipient: 'user_id',
          subject: 'title',
          content: 'content',
          url: 'link'
        }
      default:
        return {}
    }
  }
  
  return mapping
}

// 初始化渠道配置
const initChannelConfig = () => {
  const configFields = getChannelConfigForm()
  const config = {}
  
  configFields.forEach(field => {
    if (!currentChannel.value.config[field.key]) {
      if (field.type === 'switch') {
        config[field.key] = false
      } else if (field.type === 'number') {
        config[field.key] = 0
      } else if (field.type === 'select' && field.options) {
        config[field.key] = field.options[0]
      } else {
        config[field.key] = ''
      }
    } else {
      config[field.key] = currentChannel.value.config[field.key]
    }
  })
  
  currentChannel.value.config = config
}

// 监听渠道类型变化
const handleChannelTypeChange = () => {
  initChannelConfig()
  
  // 保存当前的参数映射
  const oldMapping = { ...currentChannel.value.paramMapping }
  
  // 初始化新的参数映射
  initParamMapping()
  
  // 如果是编辑模式且渠道类型改变，尝试保留兼容的参数映射
  if (dialogMode.value === 'edit') {
    const newParams = getParamMappingForm().channelSpecificParams
    const newParamKeys = newParams.map(p => p.key)
    
    // 检查旧映射中的值是否在新渠道参数中存在
    Object.keys(oldMapping).forEach(standardKey => {
      const targetParam = oldMapping[standardKey]
      if (newParamKeys.includes(targetParam)) {
        // 如果目标参数在新渠道类型中也存在，则保留映射
        currentChannel.value.paramMapping[standardKey] = targetParam
      }
    })
  }
}

// 标签输入相关
const inputTagVisible = ref(false)
const inputTagValue = ref('')
const tagInputRef = ref(null)

// 显示标签输入框
const showTagInput = () => {
  inputTagVisible.value = true
  nextTick(() => {
    tagInputRef.value.focus()
  })
}

// 确认标签输入
const handleTagConfirm = () => {
  if (inputTagValue.value) {
    if (!currentChannel.value.tags) {
      currentChannel.value.tags = []
    }
    // 检查标签是否已存在
    if (!currentChannel.value.tags.includes(inputTagValue.value)) {
      currentChannel.value.tags.push(inputTagValue.value)
    }
  }
  inputTagVisible.value = false
  inputTagValue.value = ''
}

// 清除参数映射
const clearParamMapping = (key) => {
  if (currentChannel.value.paramMapping && key in currentChannel.value.paramMapping) {
    // 使用Vue的响应式API删除属性
    delete currentChannel.value.paramMapping[key]
    // 强制更新
    currentChannel.value = { ...currentChannel.value }
  }
}

// 重置所有参数映射为默认值
const resetAllParamMappings = () => {
  const defaultMapping = getDefaultParamMapping(currentChannel.value.type)
  currentChannel.value.paramMapping = { ...defaultMapping }
}

onMounted(() => {
  // 确保数据已加载
  if (channelStore.channels.length === 0) {
    loadChannels()
  }
  
  // 加载默认参数映射配置
  channelStore.loadDefaultParamMappings()
})
</script>

<template>
  <div class="channels-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Distribution Channels</h2>
      </el-col>
    </el-row>
    
    <!-- 筛选工具栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-input
            v-model="searchKeyword"
            placeholder="Channel name..."
            clearable
            prefix-icon="Search"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="4">
          <el-select v-model="typeFilter" placeholder="Type" class="filter-select">
            <el-option label="All Types" value="all" />
            <el-option
              v-for="option in channelTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="4">
          <el-select v-model="statusFilter" placeholder="Status" class="filter-select">
            <el-option label="All Statuses" value="all" />
            <el-option label="Active" value="enabled" />
            <el-option label="Disabled" value="disabled" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="4">
          <el-select 
            v-model="tagFilter" 
            placeholder="Tag Filter" 
            class="filter-select"
            multiple
            collapse-tags
            collapse-tags-tooltip
          >
            <el-option
              v-for="tag in allTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6" class="action-buttons">
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon>Add Channel
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 渠道列表 -->
    <el-card shadow="hover" class="channel-list-card">
      <el-table
        v-loading="loading"
        :data="paginatedChannels"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Channel Name" min-width="150">
          <template #default="{ row }">
            <div class="channel-name">
              <el-icon>
                <component :is="getChannelTypeIcon(row.type)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Type" width="120">
          <template #default="{ row }">
            {{ getChannelTypeName(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="vendor" label="Vendor" width="150" />
        <el-table-column label="Tag" width="150">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              type="info"
              effect="plain"
              size="small"
              class="channel-tag"
            >
              {{ tag }}
            </el-tag>
            <span v-if="!row.tags || row.tags.length === 0">-</span>
          </template>
        </el-table-column>
        <el-table-column label="Priority" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Retry Strategy" width="120" align="center">
          <template #default="{ row }">
            <el-tooltip :content="`Retry ${row.retryTimes} times，in ${row.retryInterval} s`" placement="top">
              <span>{{ row.retryTimes }} times/{{ row.retryInterval }} s</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="Monitor Metrics" width="150" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.monitorMetrics" placement="top">
              <template #content>
                <div>Availability: {{ row.monitorMetrics.availability }}%</div>
                <div>Success Rate: {{ row.monitorMetrics.successRate }}%</div>
                <div>Avg Response Time: {{ row.monitorMetrics.avgResponseTime }}ms</div>
              </template>
              <div class="metrics-indicator">
                <el-progress 
                  type="dashboard" 
                  :percentage="row.monitorMetrics?.successRate || 100" 
                  :color="getSuccessRateColor(row.monitorMetrics?.successRate || 100)"
                  :width="40"
                  :stroke-width="6"
                />
              </div>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" effect="light">
              {{ row.status === 'enabled' ? 'Active' : 'Disabled' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="250" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="openEditDialog(row)"
            >
              Edit
            </el-button>
            <el-button
              :type="row.status === 'enabled' ? 'danger' : 'success'"
              size="small"
              text
              @click="toggleChannelStatus(row)"
            >
              {{ row.status === 'enabled' ? 'Disabled' : 'Active' }}
            </el-button>
            <el-button
              type="warning"
              size="small"
              text
              @click="testChannel(row)"
              :disabled="row.status !== 'enabled'"
            >
              Test
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 渠道编辑对话框 -->
    <el-dialog
      v-model="channelDialogVisible"
      :title="dialogMode === 'add' ? 'Add Channel' : 'Edit Channel'"
      width="70%"
      destroy-on-close
    >
      <el-form :model="currentChannel" label-width="100px">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Channel Name" required>
              <el-input v-model="currentChannel.name" placeholder="Please input channel name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Type" required>
              <el-select 
                v-model="currentChannel.type" 
                placeholder="Select channel type" 
                style="width: 100%"
                @change="handleChannelTypeChange"
              >
                <el-option
                  v-for="option in channelTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Status">
              <el-select v-model="currentChannel.status" placeholder="Select status" style="width: 100%">
                <el-option label="Active" value="enabled" />
                <el-option label="Disabled" value="disabled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Vendor">
              <el-input v-model="currentChannel.vendor" placeholder="Please input vendor" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Tag">
          <el-tag
            v-for="tag in currentChannel.tags"
            :key="tag"
            closable
            class="edit-tag"
            @close="currentChannel.tags.splice(currentChannel.tags.indexOf(tag), 1)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="inputTagVisible"
            ref="tagInputRef"
            v-model="inputTagValue"
            class="input-new-tag"
            size="small"
            @keyup.enter="handleTagConfirm"
            @blur="handleTagConfirm"
          />
          <el-button v-else class="button-new-tag" size="small" @click="showTagInput">
            + Add Tag
          </el-button>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <el-form-item label="Priority">
              <el-input-number v-model="currentChannel.priority" :min="1" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <el-form-item label="Retry Times">
              <el-input-number v-model="currentChannel.retryTimes" :min="0" :max="10" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <el-form-item label="Retry Interval (s)">
              <el-input-number v-model="currentChannel.retryInterval" :min="1" :max="3600" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider>Channel Config</el-divider>
        
        <template v-if="currentChannel.type">
          <el-form-item 
            v-for="field in getChannelConfigForm()" 
            :key="field.key"
            :label="field.label"
            :required="field.required"
          >
            <el-input 
              v-if="field.type === 'input'" 
              v-model="currentChannel.config[field.key]" 
              :placeholder="`Please input ${field.label}`"
            />
            <el-input 
              v-else-if="field.type === 'password'" 
              v-model="currentChannel.config[field.key]" 
              :placeholder="`Please input ${field.label}`"
              type="password"
              show-password
            />
            <el-input-number 
              v-else-if="field.type === 'number'" 
              v-model="currentChannel.config[field.key]" 
              :placeholder="`Please input ${field.label}`"
              style="width: 100%"
            />
            <el-switch 
              v-else-if="field.type === 'switch'" 
              v-model="currentChannel.config[field.key]" 
            />
            <el-select 
              v-else-if="field.type === 'select'" 
              v-model="currentChannel.config[field.key]" 
              :placeholder="`Please select ${field.label}`"
              style="width: 100%"
            >
              <el-option
                v-for="option in field.options"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
            <el-input 
              v-else-if="field.type === 'textarea'" 
              v-model="currentChannel.config[field.key]" 
              :placeholder="`Please input ${field.label}`"
              type="textarea"
              :rows="3"
            />
          </el-form-item>
        </template>
        
        <el-empty v-else description="Please input channel type" :image-size="100" />

        <el-divider>Parameter mapping</el-divider>
        
        <template v-if="currentChannel.type">
          <div class="param-mapping-header">
            <p class="param-mapping-desc">Parameter mapping is used to convert standard parameters into channel-specific parameters, allowing business systems to send messages using a unified parameter format.</p>
            <el-button 
              type="primary" 
              size="small" 
              plain
              @click="resetAllParamMappings"
            >
              Restore Default Mapping
            </el-button>
          </div>
          
          <el-table :data="getParamMappingForm().standardParams" border style="width: 100%; margin-bottom: 20px;">
            <el-table-column prop="label" label="Standard Params" width="120" />
            <el-table-column prop="description" label="Description" width="200" />
            <el-table-column label="Map to Channel Parameters" min-width="200">
              <template #default="{ row }">
                <el-select 
                  v-model="currentChannel.paramMapping[row.key]" 
                  placeholder="Select mapping parameters"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="param in getParamMappingForm().channelSpecificParams"
                    :key="param.key"
                    :label="`${param.label} (${param.key})`"
                    :value="param.key"
                  />
                </el-select>
                <div class="param-mapping-status" v-if="currentChannel.paramMapping[row.key]">
                  <el-tag size="small" type="success">
                    Mapped to: {{ getParamLabel(currentChannel.paramMapping[row.key], currentChannel.type) }}
                  </el-tag>
                </div>
                <div class="param-mapping-status" v-else>
                  <el-tag size="small" type="info">Unmapped</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Action" width="120">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small" 
                  text
                  @click="currentChannel.paramMapping[row.key] = getDefaultParamMapping(currentChannel.type)[row.key] || ''"
                  :disabled="!getDefaultParamMapping(currentChannel.type)[row.key]"
                >
                  Restore Default
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  text
                  @click="clearParamMapping(row.key)"
                  :disabled="!currentChannel.paramMapping[row.key]"
                >
                  Clear
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        
        <el-empty v-else description="Please select channel type" :image-size="100" />
        
        <el-divider>Available Time</el-divider>
        
        <el-form-item label="Workdays">
          <el-checkbox-group v-model="currentChannel.availableTime.workDays">
            <el-checkbox :label="1">Monday</el-checkbox>
            <el-checkbox :label="2">Tuesday</el-checkbox>
            <el-checkbox :label="3">Wednesday</el-checkbox>
            <el-checkbox :label="4">Thursday</el-checkbox>
            <el-checkbox :label="5">Friday</el-checkbox>
            <el-checkbox :label="6">Saturday</el-checkbox>
            <el-checkbox :label="7">Sunday</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="Time Range">
          <div v-for="(range, index) in currentChannel.availableTime.timeRanges" :key="index" class="time-range-item">
            <el-time-picker
              v-model="range.start"
              format="HH:mm"
              placeholder="Start Time"
              style="width: 120px; margin-right: 10px;"
            />
            <span class="time-range-separator">to</span>
            <el-time-picker
              v-model="range.end"
              format="HH:mm"
              placeholder="End Time"
              style="width: 120px; margin-left: 10px; margin-right: 10px;"
            />
            <el-button 
              type="danger" 
              icon="Delete" 
              circle 
              size="small"
              @click="currentChannel.availableTime.timeRanges.splice(index, 1)"
              v-if="currentChannel.availableTime.timeRanges.length > 1"
            />
          </div>
          <div class="add-time-range">
            <el-button 
              type="primary" 
              plain 
              size="small" 
              @click="currentChannel.availableTime.timeRanges.push({ 
                start: convertTimeStringToDate('00:00'), 
                end: convertTimeStringToDate('23:59') 
              })"
            >
              Add Time Range
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="channelDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveChannel">Save</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 渠道测试对话框 -->
    <el-dialog
      v-model="testDialogVisible"
      title="Channel Test"
      width="600px"
      destroy-on-close
    >
      <div class="test-channel-info">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Channel Name">{{ currentChannel.name }}</el-descriptions-item>
          <el-descriptions-item label="Type">{{ getChannelTypeName(currentChannel.type) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      
      <el-divider>Test Parameters</el-divider>
      
      <el-form :model="testForm" label-width="80px">
        <el-form-item label="Recipient" required>
          <el-input v-model="testForm.recipient" :placeholder="`Please input ${currentChannel.type === 'email' ? 'Email' : currentChannel.type === 'sms' ? 'Phone number' : 'Recipient ID'}`" />
        </el-form-item>
        
        <el-form-item label="Subject" v-if="currentChannel.type !== 'sms'">
          <el-input v-model="testForm.subject" placeholder="Please input message subject" />
        </el-form-item>
        
        <el-form-item label="Content">
          <el-input v-model="testForm.content" type="textarea" :rows="3" placeholder="Please input message content" />
        </el-form-item>
        
        <el-collapse>
          <el-collapse-item title="Param Mapping Preview">
            <div class="param-mapping-preview">
              <p class="mapping-title">Standard parameters will be mapped to the following channel-specific parameters：</p>
              
              <el-empty 
                v-if="!currentChannel.paramMapping || Object.keys(currentChannel.paramMapping).length === 0" 
                description="Mapping not configured" 
                :image-size="80" 
              />
              
              <el-table 
                v-else
                :data="Object.keys(currentChannel.paramMapping).map(key => ({
                  standardKey: key,
                  standardLabel: getParamLabel(key, 'standard'),
                  targetKey: currentChannel.paramMapping[key],
                  targetLabel: getParamLabel(currentChannel.paramMapping[key], currentChannel.type),
                  value: getParamValue(key, testForm)
                }))"
                border 
                size="small"
                style="width: 100%"
              >
                <el-table-column label="Standard Parameters" prop="standardLabel" width="120" />
                <el-table-column label="Map to Channel Parameters" prop="targetLabel" width="150" />
                <el-table-column label="Actual Value">
                  <template #default="{ row }">
                    <span class="param-value">{{ row.value || '-' }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-form>
      
      <div v-if="testResult.message" class="test-result">
        <el-alert
          :title="testResult.message"
          :type="testResult.success ? 'success' : 'error'"
          :closable="false"
          show-icon
        >
          <template v-if="testResult.time" #default>
            <div>Duration: {{ testResult.time }}ms</div>
          </template>
        </el-alert>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="testDialogVisible = false">Close</el-button>
          <el-button type="primary" @click="executeChannelTest(currentChannel.id)" :loading="testLoading">Start Test</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.channels-container {
  padding-bottom: 20px;
}

.page-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-card :deep(.el-card__body) {
  padding: 15px;
}

.filter-select {
  width: 100%;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.channel-list-card {
  margin-bottom: 20px;
}

.channel-list-card :deep(.el-card__body) {
  padding: 0;
}

.channel-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-channel-info {
  margin-bottom: 20px;
}

.test-result {
  margin-top: 20px;
}

/* 参数映射样式 */
.param-mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.param-mapping-desc {
  font-size: 14px;
  color: #606266;
  margin: 0;
  line-height: 1.5;
  flex: 1;
}

.param-mapping-preview {
  padding: 10px 0;
}

.mapping-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.param-mapping-value {
  margin-top: 5px;
  color: #909399;
}

.param-value {
  color: #409EFF;
  word-break: break-all;
}

.param-mapping-status {
  margin-top: 5px;
}

/* 时间段样式 */
.time-range-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.time-range-separator {
  margin: 0 10px;
  color: #909399;
}

.add-time-range {
  margin-top: 10px;
}

/* 监控指标样式 */
.metrics-indicator {
  display: flex;
  justify-content: center;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .action-buttons {
    justify-content: flex-start;
    margin-top: 15px;
  }
  
  .filter-select {
    margin-bottom: 10px;
  }
  
  .pagination-container {
    justify-content: center;
  }
}

.channel-tag {
  margin-right: 5px;
}

.edit-tag {
  margin-right: 10px;
  margin-bottom: 5px;
}

.button-new-tag {
  margin-bottom: 5px;
}

.input-new-tag {
  width: 150px;
  margin-right: 10px;
  margin-bottom: 5px;
  display: inline-block;
  vertical-align: bottom;
}

.pagination-container {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
}
</style> 