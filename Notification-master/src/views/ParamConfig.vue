<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useChannelStore } from '@/stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const channelStore = useChannelStore()

// 标准参数列表
const standardParams = ref([])
// 表格加载状态
const loading = ref(false)
// 参数对话框可见性
const paramDialogVisible = ref(false)
// 当前编辑的参数
const currentParam = ref({
  id: null,
  key: '',
  label: '',
  description: '',
  type: 'string',
  required: false,
  defaultValue: '',
  validationRules: {},
  appliedChannels: []
})
// 对话框模式：新增/编辑
const dialogMode = ref('add')
// 搜索关键字
const searchKeyword = ref('')
// 类型筛选
const typeFilter = ref('all')
// 渠道筛选
const channelFilter = ref([])

// 分页相关变量
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 参数类型选项

const paramTypeOptions = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'url', label: 'URL' }
]

// 获取所有渠道类型

const channelTypes = computed(() => {
  return [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'webhook', label: 'Webhook' },
    { value: 'internal', label: 'Internal Message' }
  ]
})

// 默认映射配置对话框可见性
const mappingDialogVisible = ref(false)
// 当前编辑的默认映射配置
const currentMappingConfig = ref({
  standardParam: null,
  mappings: {}
})

// 各渠道特定参数

const channelSpecificParams = {
  email: [
    { key: 'to_email', label: 'Recipient Email', description: 'The email address of the recipient' },
    { key: 'cc', label: 'CC', description: 'List of CC email addresses' },
    { key: 'bcc', label: 'BCC', description: 'List of BCC email addresses' },
    { key: 'subject', label: 'Email Subject', description: 'The subject of the email' },
    { key: 'html_body', label: 'HTML Body', description: 'The HTML formatted body of the email' },
    { key: 'text_body', label: 'Plain Text Body', description: 'The plain text formatted body of the email' },
    { key: 'attachments', label: 'Attachments', description: 'List of email attachments' }
  ],
  sms: [
    { key: 'phone_number', label: 'Phone Number', description: 'The recipient’s phone number' },
    { key: 'content', label: 'SMS Content', description: 'The text content of the SMS' },
    { key: 'template_code', label: 'Template Code', description: 'The template code from the SMS provider' },
    { key: 'template_param', label: 'Template Parameters', description: 'Parameters for the SMS template' }
  ],
  webhook: [
    { key: 'payload', label: 'Request Payload', description: 'The body data of the Webhook request' },
    { key: 'headers', label: 'Request Headers', description: 'The header information of the Webhook request' }
  ],
  internal: [
    { key: 'user_id', label: 'User ID', description: 'The unique identifier of the internal system user' },
    { key: 'title', label: 'Title', description: 'The title of the internal message' },
    { key: 'content', label: 'Content', description: 'The content of the internal message' },
    { key: 'type', label: 'Type', description: 'The type of the internal message' },
    { key: 'link', label: 'Link', description: 'The related link address' }
  ]
}

// 默认映射关系表
const defaultMappings = ref([])

// 监听 channelStore 中的默认参数映射配置变化
const initDefaultMappings = async () => {
  // 如果 store 中已有数据，直接使用
  if (channelStore.defaultParamMappings && channelStore.defaultParamMappings.length > 0) {
    console.log('Get the default mapping configuration from store:', channelStore.defaultParamMappings)
    defaultMappings.value = JSON.parse(JSON.stringify(channelStore.defaultParamMappings))
  } else {
    // 否则加载数据
    console.log('加载默认映射配置')
    await channelStore.loadDefaultParamMappings()
    defaultMappings.value = JSON.parse(JSON.stringify(channelStore.defaultParamMappings))
  }
  console.log('Default mapping after initialization:', defaultMappings.value)
}

// 筛选后的参数列表
const filteredParams = computed(() => {
  let result = [...standardParams.value]
  
  // 按关键字搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(param => 
      param.key.toLowerCase().includes(keyword) || 
      param.label.toLowerCase().includes(keyword) ||
      param.description.toLowerCase().includes(keyword)
    )
  }
  
  // 按类型筛选
  if (typeFilter.value !== 'all') {
    result = result.filter(param => param.type === typeFilter.value)
  }
  
  // 按渠道筛选
  if (channelFilter.value.length > 0) {
    result = result.filter(param => 
      param.appliedChannels && 
      param.appliedChannels.some(channel => channelFilter.value.includes(channel))
    )
  }
  
  // 更新总数
  pagination.value.total = result.length
  
  return result
})

// 分页后的参数列表
const paginatedParams = computed(() => {
  // 分页处理
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredParams.value.slice(start, end)
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

// 加载标准参数列表
const loadStandardParams = () => {
  loading.value = true
  
  // 模拟从API获取数据
  setTimeout(() => {
    standardParams.value = [
      {
        id: 1,
        key: 'recipient',
        label: 'Recipient',
        description: 'Identifier of the message recipient',
        type: 'string',
        required: true,
        defaultValue: '',
        validationRules: {
          required: true,
          message: 'Recipient cannot be empty'
        },
        appliedChannels: ['email', 'sms', 'internal']
      },
      {
        id: 2,
        key: 'subject',
        label: 'Subject',
        description: 'Message subject or title',
        type: 'string',
        required: true,
        defaultValue: '',
        validationRules: {
          required: true,
          message: 'Subject cannot be empty'
        },
        appliedChannels: ['email', 'internal']
      },
      {
        id: 3,
        key: 'content',
        label: 'Content',
        description: 'Message body content',
        type: 'string',
        required: true,
        defaultValue: '',
        validationRules: {
          required: true,
          message: 'Content cannot be empty'
        },
        appliedChannels: ['email', 'sms', 'webhook', 'internal']
      },
      {
        id: 4,
        key: 'attachment',
        label: 'Attachment',
        description: 'Message attachments',
        type: 'array',
        required: false,
        defaultValue: '[]',
        validationRules: {},
        appliedChannels: ['email']
      },
      {
        id: 5,
        key: 'importance',
        label: 'Importance',
        description: 'Message priority level',
        type: 'string',
        required: false,
        defaultValue: 'normal',
        validationRules: {
          enum: ['high', 'normal', 'low']
        },
        appliedChannels: ['email', 'internal']
      },
      {
        id: 6,
        key: 'template_id',
        label: 'Template ID',
        description: 'Identifier of the message template',
        type: 'string',
        required: false,
        defaultValue: '',
        validationRules: {},
        appliedChannels: ['email', 'sms']
      },
      {
        id: 7,
        key: 'url',
        label: 'Url',
        description: 'Clickable link in the message',
        type: 'url',
        required: false,
        defaultValue: '',
        validationRules: {
          pattern: /^https?:\/\/.+/,
          message: 'Please input valid URL'
        },
        appliedChannels: ['email', 'internal']
      }
    ]
    
    loading.value = false
    
    // 初始化默认映射配置
    initDefaultMappings()
  }, 500)
}

// 打开新增参数对话框
const openAddDialog = () => {
  dialogMode.value = 'add'
  currentParam.value = {
    id: null,
    key: '',
    label: '',
    description: '',
    type: 'string',
    required: false,
    defaultValue: '',
    validationRules: {},
    appliedChannels: []
  }
  paramDialogVisible.value = true
}

// 打开编辑参数对话框
const openEditDialog = (param) => {
  dialogMode.value = 'edit'
  currentParam.value = JSON.parse(JSON.stringify(param))
  paramDialogVisible.value = true
}

// 保存参数
const saveParam = () => {
  // 表单验证
  if (!currentParam.value.key || !currentParam.value.label) {
    ElMessage.warning('Please fill in the required fields')
    return
  }
  
  if (dialogMode.value === 'add') {
    // 添加新参数
    const newParam = {
      ...currentParam.value,
      id: standardParams.value.length + 1
    }
    standardParams.value.push(newParam)
    ElMessage.success('Parameter added')
  } else {
    // 更新参数
    const index = standardParams.value.findIndex(p => p.id === currentParam.value.id)
    if (index !== -1) {
      standardParams.value[index] = { ...currentParam.value }
      ElMessage.success('Parameter updated')
    }
  }
  
  paramDialogVisible.value = false
}

// 删除参数
const deleteParam = (param) => {
  ElMessageBox.confirm(
    `Confirm to delete parameter "${param.label}"？`,
    'Confirm delete',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    const index = standardParams.value.findIndex(p => p.id === param.id)
    if (index !== -1) {
      standardParams.value.splice(index, 1)
      ElMessage.success('Parameter deleted')
    }
  }).catch(() => {
    // 用户取消
  })
}

// 获取参数类型显示名称
const getParamTypeName = (type) => {
  const option = paramTypeOptions.find(opt => opt.value === type)
  return option ? option.label : type
}

// 获取渠道类型显示名称
const getChannelTypeName = (type) => {
  const option = channelTypes.value.find(opt => opt.value === type)
  return option ? option.label : type
}

// 获取验证规则显示文本
const getValidationRuleText = (rules) => {
  if (!rules || Object.keys(rules).length === 0) {
    return 'None'
  }
  
  const texts = []
  
  if (rules.required) {
    texts.push('Required')
  }
  
  if (rules.enum) {
    texts.push(`Enum value: ${rules.enum.join(', ')}`)
  }
  
  if (rules.min !== undefined) {
    texts.push(`Min: ${rules.min}`)
  }
  
  if (rules.max !== undefined) {
    texts.push(`Max: ${rules.max}`)
  }
  
  if (rules.pattern) {
    texts.push('Matching')
  }
  
  return texts.join(', ')
}

// 打开参数映射配置对话框
const openMappingDialog = (param) => {
  // 初始化当前映射配置
  currentMappingConfig.value = {
    standardParam: param,
    mappings: {}
  }
  
  // 从默认映射配置中获取该参数的映射关系
  const existingMapping = defaultMappings.value.find(m => m.standardParam.id === param.id)
  
  if (existingMapping) {
    // 如果已有映射配置，复制一份以便编辑
    currentMappingConfig.value = JSON.parse(JSON.stringify(existingMapping))
    
    // 确保所有渠道都有配置对象
    channelTypes.value.forEach(channel => {
      if (!currentMappingConfig.value.mappings[channel.value]) {
        currentMappingConfig.value.mappings[channel.value] = {
          paramKey: '',
          description: '',
          isRequired: param.required
        }
      }
    })
  } else {
    // 如果没有已存在的映射，为所有渠道初始化一个空的映射配置
    channelTypes.value.forEach(channel => {
      const isApplied = param.appliedChannels && param.appliedChannels.includes(channel.value)
      currentMappingConfig.value.mappings[channel.value] = {
        paramKey: '',
        description: '',
        isRequired: isApplied ? param.required : false
      }
    })
  }
  
  // 打印调试信息，便于确认映射关系
  console.log('Current parameter mapping configuration:', currentMappingConfig.value)
  
  mappingDialogVisible.value = true
}

// 保存参数映射配置
const saveMappingConfig = async () => {
  try {
    // 清理空的映射关系，只保留有参数映射的渠道
    const cleanedMappings = {}
    Object.keys(currentMappingConfig.value.mappings).forEach(channel => {
      if (currentMappingConfig.value.mappings[channel] && 
          currentMappingConfig.value.mappings[channel].paramKey) {
        cleanedMappings[channel] = currentMappingConfig.value.mappings[channel]
      }
    })
    
    // 创建要保存的映射配置
    const configToSave = {
      standardParam: currentMappingConfig.value.standardParam,
      mappings: cleanedMappings
    }
    
    // 查找是否已存在该参数的映射配置
    const index = defaultMappings.value.findIndex(m => 
      m.standardParam.id === currentMappingConfig.value.standardParam.id
    )
    
    // 创建新的映射数组，避免直接修改引用
    const updatedMappings = JSON.parse(JSON.stringify(defaultMappings.value))
    
    if (index !== -1) {
      // 更新现有配置
      updatedMappings[index] = configToSave
    } else {
      // 添加新配置
      updatedMappings.push(configToSave)
    }
    
    // 更新到 channelStore
    const result = channelStore.updateDefaultParamMappings(updatedMappings)
    
    if (result) {
      // 更新本地数据
      defaultMappings.value = JSON.parse(JSON.stringify(updatedMappings))
      
      ElMessage.success('Parameter mapping configuration has been saved')
      mappingDialogVisible.value = false
      
      // 打印保存后的映射列表，便于确认
      console.log('List of mappings after saving:', defaultMappings.value)
    }
  } catch (error) {
    console.error('Failed to save mapping configuration:', error)
    ElMessage.error('Failed to save mapping configuration')
  }
}

// 获取渠道特定参数选项
const getChannelParamOptions = (channelType) => {
  return channelSpecificParams[channelType] || []
}

// 导出映射配置
const exportMappingConfig = () => {
  if (!defaultMappings.value || defaultMappings.value.length === 0) {
    ElMessage.warning('No mapping configuration available for export')
    return
  }
  
  try {
    // 创建 JSON 字符串
    const configData = JSON.stringify(defaultMappings.value, null, 2)
    
    // 创建 Blob 对象
    const blob = new Blob([configData], { type: 'application/json' })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `param_mappings_${new Date().toISOString().slice(0, 10)}.json`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('Configuration exported successfully')
  } catch (error) {
    console.error('Failed to export configuration:', error)
    ElMessage.error('Failed to export configuration')
  }
}

// 导入映射配置
const importMappingConfig = (file) => {
  if (!file || !file.raw) {
    ElMessage.error('Please select a valid configuration file')
    return
  }
  
  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      // 解析 JSON 数据
      const importedData = JSON.parse(e.target.result)
      
      // 验证数据格式
      if (!Array.isArray(importedData)) {
        throw new Error('The imported data format is incorrect')
      }
      
      // 检查每个映射配置
      for (const mapping of importedData) {
        if (!mapping.standardParam || !mapping.mappings) {
          throw new Error('The mapping configuration format is incorrect')
        }
      }
      
      // 更新映射配置
      if (channelStore.updateDefaultParamMappings(importedData)) {
        defaultMappings.value = JSON.parse(JSON.stringify(importedData))
        ElMessage.success('Configuration imported successfully')
      } else {
        throw new Error('Failed to update configuration')
      }
    } catch (error) {
      console.error('Failed to import configuration:', error)
      ElMessage.error(`Failed to import configuration: ${error.message}`)
    }
  }
  
  reader.onerror = () => {
    ElMessage.error('Failed to read file')
  }
  
  reader.readAsText(file.raw)
}

onMounted(async () => {
  // 加载标准参数列表
  loadStandardParams()
  
  // 加载默认参数映射配置
  try {
    await initDefaultMappings()
    console.log('Default mapping configuration initialized successfully')
  } catch (error) {
    console.error('Failed to load default mapping configuration:', error)
    ElMessage.error('Failed to load default mapping configuration')
  }
})
</script>

<template>
  <div class="param-config-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Parameter Configuration</h2>
      </el-col>
    </el-row>
    
    <!-- 标签页 -->
    <el-tabs type="border-card">
      <el-tab-pane label="Parameter Management">
        <!-- 筛选工具栏 -->
        <el-card shadow="hover" class="filter-card">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-input
                v-model="searchKeyword"
                placeholder="Search parameter name..."
                clearable
                prefix-icon="Search"
              />
            </el-col>
            <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="4">
              <el-select v-model="typeFilter" placeholder="Type" class="filter-select">
                <el-option label="All" value="all" />
                <el-option
                  v-for="option in paramTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6" :lg="8" :xl="8">
              <el-select 
                v-model="channelFilter" 
                placeholder="Channel" 
                class="filter-select"
                multiple
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option
                  v-for="option in channelTypes"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6" class="action-buttons">
              <el-button type="primary" @click="openAddDialog">
                <el-icon><Plus /></el-icon>Add Param
              </el-button>
            </el-col>
          </el-row>
        </el-card>
        
        <!-- 参数列表 -->
        <el-card shadow="hover" class="param-list-card">
          <el-table
            v-loading="loading"
            :data="paginatedParams"
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa' }"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="Param" min-width="120">
              <template #default="{ row }">
                <el-tag type="info" effect="plain">{{ row.key }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="label" label="Name" min-width="120" />
            <el-table-column prop="description" label="Description" min-width="200" />
            <el-table-column label="Type" width="100">
              <template #default="{ row }">
                <el-tag>{{ getParamTypeName(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Required" width="80" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.required" color="#67C23A"><Check /></el-icon>
                <el-icon v-else color="#909399"><Close /></el-icon>
              </template>
            </el-table-column>
            <el-table-column prop="defaultValue" label="Default" width="120" />
            <el-table-column label="Validation Value" min-width="150">
              <template #default="{ row }">
                <span>{{ getValidationRuleText(row.validationRules) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Channel" min-width="200">
              <template #default="{ row }">
                <el-tag
                  v-for="channel in row.appliedChannels"
                  :key="channel"
                  size="small"
                  class="channel-tag"
                >
                  {{ getChannelTypeName(channel) }}
                </el-tag>
                <span v-if="!row.appliedChannels || row.appliedChannels.length === 0">-</span>
              </template>
            </el-table-column>
            <el-table-column label="Action" width="260" fixed="right">
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
                  type="danger"
                  size="small"
                  text
                  @click="deleteParam(row)"
                >
                  Delete
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  text
                  @click="openMappingDialog(row)"
                >
                  Default Mapping
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
      </el-tab-pane>
      
      <el-tab-pane label="Param Default Mapping">
        <el-card shadow="hover" class="mapping-config-card">
          <div class="mapping-header">
            <div class="mapping-title">
              <h3>Standard Parameter Default Mapping Relationship</h3>
              <p class="mapping-desc">Configure the default mapping relationships of standard parameters across various channels. These defaults will be applied when creating a new channel.</p>
            </div>
            <div class="mapping-actions">
              <el-button 
                type="success" 
                size="small" 
                @click="exportMappingConfig"
                :disabled="!defaultMappings || defaultMappings.length === 0"
              >
                <el-icon><Download /></el-icon>Export Config
              </el-button>
              <el-upload
                :auto-upload="false"
                :show-file-list="false"
                accept=".json"
                @change="importMappingConfig"
              >
                <el-button type="primary" size="small">
                  <el-icon><Upload /></el-icon>Import Config
                </el-button>
              </el-upload>
            </div>
          </div>
          
          <el-table
            v-loading="!defaultMappings || defaultMappings.length === 0"
            :data="defaultMappings"
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa' }"
            border
          >
            <el-table-column label="Param" width="150">
              <template #default="{ row }">
                <el-tag type="info" effect="plain">{{ row.standardParam.key }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column v-for="channel in channelTypes" :key="channel.value" :label="channel.label" min-width="150">
              <template #default="{ row }">
                <div class="mapping-cell">
                  <el-tag 
                    v-if="row.mappings && row.mappings[channel.value] && row.mappings[channel.value].paramKey" 
                    type="success" 
                    effect="light"
                  >
                    {{ getChannelParamOptions(channel.value).find(p => p.key === row.mappings[channel.value].paramKey)?.label || row.mappings[channel.value].paramKey }}
                  </el-tag>
                  <span v-else class="no-mapping">Unmapped</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="Action" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  text
                  @click="openMappingDialog(row.standardParam)"
                >
                  Edit Mapping
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="mapping-tips">
            <el-alert
              title="Default Mapping Description"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>1. The default mapping relationships will be automatically applied when creating a new channel</p>
                <p>2. Modifying the default mapping will not affect the mapping configuration of existing channels</p>
                <p>3. You can use the export/import feature to back up or migrate configurations</p>
              </template>
            </el-alert>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 参数编辑对话框 -->
    <el-dialog
      v-model="paramDialogVisible"
      :title="dialogMode === 'add' ? 'Add Parameter' : 'Edit Parameter'"
      width="600px"
      destroy-on-close
    >
      <el-form :model="currentParam" label-width="100px">
        <el-form-item label="Param" required>
          <el-input 
            v-model="currentParam.key" 
            placeholder="Input param indentifier，such as recipient1" 
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        
        <el-form-item label="Name" required>
          <el-input v-model="currentParam.label" placeholder="Input param name，such as recipient_Gp1" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input v-model="currentParam.description" placeholder="Input param description" />
        </el-form-item>
        
        <el-form-item label="Type">
          <el-select v-model="currentParam.type" style="width: 100%">
            <el-option
              v-for="option in paramTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Required">
          <el-switch v-model="currentParam.required" />
        </el-form-item>
        
        <el-form-item label="Deafult">
          <el-input v-model="currentParam.defaultValue" placeholder="Input default value" />
        </el-form-item>
        
        <el-form-item label="Channel">
          <el-checkbox-group v-model="currentParam.appliedChannels">
            <el-checkbox 
              v-for="option in channelTypes" 
              :key="option.value" 
              :label="option.value"
            >
              {{ option.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-divider>Validation Rule</el-divider>
        
        <el-form-item label="Required" v-if="currentParam.required">
          <el-input v-model="currentParam.validationRules.message" placeholder="Enter error message" />
        </el-form-item>
        
        <template v-if="currentParam.type === 'string'">
          <el-form-item label="Min Length">
            <el-input-number v-model="currentParam.validationRules.minLength" :min="0" style="width: 100%" />
          </el-form-item>
          
          <el-form-item label="Max Length">
            <el-input-number v-model="currentParam.validationRules.maxLength" :min="0" style="width: 100%" />
          </el-form-item>
        </template>
        
        <template v-if="currentParam.type === 'number'">
          <el-form-item label="Min Value">
            <el-input-number v-model="currentParam.validationRules.min" style="width: 100%" />
          </el-form-item>
          
          <el-form-item label="Max Value">
            <el-input-number v-model="currentParam.validationRules.max" style="width: 100%" />
          </el-form-item>
        </template>
        
        <el-form-item label="Enum Value" v-if="['string', 'number'].includes(currentParam.type)">
          <el-input 
            v-model="currentParam.validationRules.enumString" 
            placeholder="Enter enum values (use , to separate multiple values)" 
            @input="(val) => currentParam.validationRules.enum = val ? val.split(',').map(v => v.trim()) : []"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="paramDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveParam">Save</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 默认映射编辑对话框 -->
    <el-dialog
      v-model="mappingDialogVisible"
      title="Edit Default Mapping Configuration"
      width="700px"
      destroy-on-close
    >
      <div class="mapping-dialog-header">
        <h3>Param Indentifier: {{ currentMappingConfig.standardParam.key }}</h3>
        <p class="mapping-dialog-desc">Configure the default mapping relationships for this parameter across different channels</p>
      </div>
      
      <el-form :model="currentMappingConfig" label-width="120px">
        <el-form-item 
          v-for="channel in channelTypes" 
          :key="channel.value" 
          :label="channel.label"
        >
          <el-select 
            v-model="currentMappingConfig.mappings[channel.value].paramKey" 
            placeholder="Select mapping param"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="param in getChannelParamOptions(channel.value)"
              :key="param.key"
              :label="`${param.label} (${param.key})`"
              :value="param.key"
            >
              <div class="param-option">
                <span>{{ param.label }} ({{ param.key }})</span>
                <el-tooltip :content="param.description" placement="right">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mappingDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveMappingConfig">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.param-config-container {
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

.param-list-card {
  margin-bottom: 20px;
}

.param-list-card :deep(.el-card__body) {
  padding: 0;
}

.channel-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.mapping-config-card {
  margin-bottom: 20px;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.mapping-title h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.mapping-desc {
  color: #606266;
  margin: 0;
}

.mapping-actions {
  display: flex;
  gap: 10px;
}

.mapping-cell {
  display: flex;
  align-items: center;
}

.no-mapping {
  color: #909399;
  font-size: 13px;
}

.mapping-tips {
  margin-top: 20px;
}

.mapping-dialog-header {
  margin-bottom: 20px;
}

.mapping-dialog-header h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.mapping-dialog-desc {
  color: #606266;
  margin: 0;
}

.param-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
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
  
  .mapping-header {
    flex-direction: column;
  }
  
  .mapping-actions {
    margin-top: 10px;
  }
  
  .pagination-container {
    justify-content: center;
  }
}
</style>