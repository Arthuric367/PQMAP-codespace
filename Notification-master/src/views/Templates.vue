<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { useTemplateStore, useMessageTypeStore, useChannelStore } from '@/stores'
import { 
  Plus, 
  Delete, 
  Search, 
  Edit, 
  ArrowDown, 
  Download, 
  Upload, 
  Check, 
  Close 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateStore = useTemplateStore()
const messageTypeStore = useMessageTypeStore()
const channelStore = useChannelStore()

// 模板列表
const templates = computed(() => templateStore.templates)
// 消息类型列表
const messageTypes = computed(() => messageTypeStore.messageTypes)
// 通知渠道列表
const channels = computed(() => channelStore.channels)

// 表格加载状态
const loading = ref(false)
// 模板对话框可见性
const templateDialogVisible = ref(false)
// 当前编辑的模板
const currentTemplate = reactive({
  id: '',
  templateName: '',
  templateCode: '',
  templateType: '',
  supportChannels: [],
  description: '',
  createdBy: '',
  createdTime: '',
  updatedTime: '',
  status: 'draft',
  content: {},
  variableConfig: []
})

// 模板类型选项
const templateTypeOptions = [
  { value: 'notification', label: 'Notification' },
  { value: 'alert', label: 'Alert' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'system', label: 'System' }
]

// 通知渠道选项
const channelOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'system_notification', label: 'In-system' },
  { value: 'xx', label: 'xx' },
  { value: 'xxx', label: 'xxx' }
]

// 活动的标签页
const activeTab = ref('basic')

// 内容类型相关
const activeContentType = ref('')
const contentTypeDialog = ref(false)
const newContentType = ref({ name: '', id: '' })

// 获取当前内容类型列表
const currentContentTypes = computed(() => {
  return Object.keys(currentTemplate.content).map(id => {
    return {
      id,
      name: getContentTypeName(id)
    };
  });
})

// 变量相关
const addVariableDialog = ref(false);
const currentVariable = ref({
  name: '',
  dataType: 'string',
  required: false,
  description: '',
  validationRule: '',
  maxLength: null,
  format: '',
  example: ''
});
const currentVariableIndex = ref(-1);

// 变量相关
const showVariableHighlight = ref(true)

// 搜索关键字
const searchKeyword = ref('')
// 状态筛选
const statusFilter = ref('all')
// 类型筛选
const typeFilter = ref('all')

// 分页相关变量
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 状态选项
const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Reviewing' },
  { value: 'published', label: 'Published' },
  { value: 'disabled', label: 'Disabled' }
];

// 通过类型值获取类型名称
function getTemplateTypeName(type) {
  const typeOption = templateTypeOptions.find(t => t.value === type);
  return typeOption ? typeOption.label : type;
}

// 通过渠道数组获取渠道名称列表
function getChannelNames(channels) {
  if (!channels || channels.length === 0) return 'None';
  
  return channels.map(channelId => {
    const channel = channelOptions.find(c => c.value === channelId);
    return channel ? channel.label : channelId;
  }).join('、');
}

// 获取状态标签类型
function getStatusType(status) {
  switch (status) {
    case 'draft': return 'info';
    case 'review': return 'warning';
    case 'published': return 'success';
    case 'disabled': return 'danger';
    default: return 'info';
  }
}

// 获取状态名称
function getStatusName(status) {
  const statusOption = statusOptions.find(s => s.value === status);
  return statusOption ? statusOption.label : status;
}

// 搜索表单
const searchForm = ref({
  name: '',
  code: '',
  type: '',
  status: ''
});

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  return templateStore.templates.filter(template => {
    const nameMatch = !searchForm.value.name || 
      template.templateName.toLowerCase().includes(searchForm.value.name.toLowerCase());
    
    const codeMatch = !searchForm.value.code || 
      template.templateCode.toLowerCase().includes(searchForm.value.code.toLowerCase());
    
    const typeMatch = !searchForm.value.type || 
      template.templateType === searchForm.value.type;
    
    const statusMatch = !searchForm.value.status || 
      template.status === searchForm.value.status;
    
    return nameMatch && codeMatch && typeMatch && statusMatch;
  });
});

// 分页后的模板列表
const paginatedTemplates = computed(() => {
  // 更新总数
  pagination.value.total = filteredTemplates.value.length;
  
  // 分页处理
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return filteredTemplates.value.slice(start, end);
});

// 搜索模板
function searchTemplates() {
  // 重置分页到第一页
  pagination.value.currentPage = 1;
}

// 重置搜索条件
function resetSearch() {
  searchForm.value = {
    name: '',
    code: '',
    type: '',
    status: ''
  };
  // 重置分页到第一页
  pagination.value.currentPage = 1;
}

// 处理分页变化
const handleCurrentChange = (val) => {
  pagination.value.currentPage = val;
}

// 处理每页数量变化
const handleSizeChange = (val) => {
  pagination.value.pageSize = val;
  pagination.value.currentPage = 1;
}

// 删除模板
function handleDelete(template) {
  ElMessageBox.confirm(
    `Confirm to delete template "${template.templateName}" ？`,
    'Confirm delete',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    templateStore.deleteTemplate(template.id);
    ElMessage.success('Template deleted');
  }).catch(() => {
    // 用户取消
  });
}

// 获取内容类型名称
function getContentTypeName(typeId) {
  // 先尝试从通知渠道中匹配
  const channel = channelOptions.find(ch => ch.value === typeId)
  if (channel) return channel.label
  
  // 如果不是预定义的通知渠道，则直接返回ID
  return typeId
}

// 获取内容类型输入框占位符
function getContentTypePlaceholder(typeId) {
  return `Please input ${getContentTypeName(typeId)} template content ...`
}

// 打开添加内容类型对话框
function openContentTypeDialog() {
  newContentType.value = { id: '' };
  contentTypeDialog.value = true;
}

// 添加内容类型
function addContentType() {
  if (!newContentType.value.id) {
    ElMessage.warning('Please select content type');
    return;
  }
  
  if (currentTemplate.content[newContentType.value.id]) {
    ElMessage.warning('This content type already exists');
    return;
  }
  
  // 添加到内容对象中
  currentTemplate.content[newContentType.value.id] = '';
  
  // 设置为当前活动的内容类型
  activeContentType.value = newContentType.value.id;
  
  // 关闭对话框
  contentTypeDialog.value = false;
  
  ElMessage.success('Content type added');
}

// 移除内容类型
function removeContentType(typeId) {
  ElMessageBox.confirm(
    `Confirm to delete "${getContentTypeName(typeId)}" type of content ？`,
    'COnfirm delete',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    // 删除该内容类型
    delete currentTemplate.content[typeId]
    
    // 如果当前活动的是被删除的内容类型，则重置
    if (activeContentType.value === typeId) {
      const keys = Object.keys(currentTemplate.content)
      activeContentType.value = keys.length > 0 ? keys[0] : ''
    }
    
    ElMessage.success('Content type deleted')
  }).catch(() => {
    // 取消删除
  })
}

// 插入变量
function insertVariable(variableName, contentTypeId) {
  if (!contentTypeId || !currentTemplate.content[contentTypeId]) {
    return
  }
  
  const textarea = document.querySelector('.content-textarea textarea')
  if (textarea) {
    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const currentContent = currentTemplate.content[contentTypeId]
    const variableText = `{${variableName}}`
    
    // 在光标位置插入变量
    currentTemplate.content[contentTypeId] = 
      currentContent.substring(0, startPos) + 
      variableText + 
      currentContent.substring(endPos)
    
    // 设置焦点并将光标移动到插入变量之后
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(startPos + variableText.length, startPos + variableText.length)
    }, 50)
  } else {
    // 如果找不到textarea，则简单地在末尾追加
    currentTemplate.content[contentTypeId] += `{${variableName}}`
  }
}

// 获取模板预览内容（高亮变量）
function getTemplatePreview(content) {
  if (!content) return ''
  
  if (showVariableHighlight.value) {
    // 高亮显示变量
    return content.replace(/\{([^{}]+)\}/g, '<span style="background-color: #f0f9eb; color: #67c23a; padding: 0 4px; border-radius: 2px; font-weight: bold;">{$1}</span>')
  } else {
    // 使用模拟数据替换变量
    let previewContent = content
    currentTemplate.variableConfig.forEach(variable => {
      const regex = new RegExp(`\\{${variable.name}\\}`, 'g')
      previewContent = previewContent.replace(regex, variable.example || `[${variable.description || variable.name}]`)
    })
    return previewContent
  }
}

// 初始化模板数据（示例）
function initTemplateData() {
  // 模拟获取模板数据
  currentTemplate.id = 'TPL202306001'
  currentTemplate.templateName = '订单确认通知'
  currentTemplate.templateCode = 'ORDER_CONFIRM'
  currentTemplate.templateType = 'notification'
  currentTemplate.supportChannels = ['email', 'sms', 'app_push']
  currentTemplate.description = '用户下单后发送订单确认信息'
  currentTemplate.createdBy = 'admin'
  currentTemplate.createdTime = '2023-06-15 14:30:25'
  currentTemplate.updatedTime = '2023-06-16 09:15:30'
  currentTemplate.status = 'published'
  
  // 内容示例
  currentTemplate.content = {
    email: '尊敬的{userName}，您的订单 {orderNo} 已确认，金额：{amount}元，下单时间：{orderTime}，预计发货时间：{shipTime}。感谢您的购买！',
    sms: '【信立集团】尊敬的{userName}，您的订单{orderNo}已确认，金额{amount}元，下单时间{orderTime}，预计发货{shipTime}。',
    app_push: '订单确认通知：您的订单 {orderNo} 已确认，预计{shipTime}发货。'
  }
  
  // 变量配置示例
  currentTemplate.variableConfig = [
    {
      name: "userName",
      dataType: "string",
      required: true,
      description: "用户姓名",
      validationRule: "",
      maxLength: 50,
      example: "张三"
    },
    {
      name: "orderNo",
      dataType: "string",
      required: true,
      description: "订单号",
      validationRule: "^[A-Z0-9]{8,15}$",
      example: "ORD20230615001"
    },
    {
      name: "amount",
      dataType: "number",
      required: true,
      description: "金额",
      format: "0,0.00",
      example: "199.99"
    },
    {
      name: "orderTime",
      dataType: "date",
      required: true,
      description: "下单时间",
      format: "yyyy-MM-dd HH:mm:ss",
      example: "2023-06-15 14:30:25"
    },
    {
      name: "shipTime",
      dataType: "date",
      required: false,
      description: "预计发货时间",
      format: "yyyy-MM-dd",
      example: "2023-06-18"
    }
  ]
  
  // 设置默认活动内容类型
  if (Object.keys(currentTemplate.content).length > 0) {
    activeContentType.value = Object.keys(currentTemplate.content)[0]
  }
}

// 初始化数据
initTemplateData()

// 打开新增模板对话框
function openAddDialog() {
  // 重置当前模板数据
  Object.assign(currentTemplate, {
    id: '',
    templateName: '',
    templateCode: '',
    templateType: '',
    supportChannels: [],
    description: '',
    createdBy: 'current_user',
    createdTime: new Date().toISOString(),
    updatedTime: new Date().toISOString(),
    status: 'draft',
    content: {},
    variableConfig: []
  });
  
  activeTab.value = 'basic';
  activeContentType.value = '';
  templateDialogVisible.value = true;
}

// 打开编辑模板对话框
function openEditDialog(template) {
  // 深拷贝模板数据以避免直接修改原始数据
  Object.assign(currentTemplate, JSON.parse(JSON.stringify(template)));
  
  // 确保内容对象存在
  if (!currentTemplate.content) {
    currentTemplate.content = {};
  }
  
  // 确保变量配置数组存在
  if (!currentTemplate.variableConfig) {
    currentTemplate.variableConfig = [];
  }
  
  templateDialogVisible.value = true;
  activeTab.value = 'basic';
  
  // 如果有内容，默认选择第一个内容类型
  const contentKeys = Object.keys(currentTemplate.content);
  activeContentType.value = contentKeys.length > 0 ? contentKeys[0] : '';
}

// 发布模板
function publishTemplate(template) {
  ElMessageBox.confirm(
    `Confirm to publish "${template.templateName}" ？`,
    'Confirm publish',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'info'
    }
  ).then(() => {
    templateStore.publishTemplate(template.id);
    ElMessage.success('Template published');
  }).catch(() => {
    // 用户取消
  });
}

// 加载数据
function loadData() {
  loading.value = true;
  
  // 加载必要数据
  const loadTemplatesPromise = new Promise(resolve => {
    templateStore.loadTemplates();
    resolve();
  });
  
  const loadTypesPromise = new Promise(resolve => {
    if (messageTypeStore.messageTypes.length === 0) {
      messageTypeStore.loadMessageTypes();
    }
    resolve();
  });
  
  const loadChannelsPromise = new Promise(resolve => {
    if (channelStore.channels.length === 0) {
      channelStore.loadChannels();
    }
    resolve();
  });
  
  Promise.all([loadTemplatesPromise, loadTypesPromise, loadChannelsPromise])
    .then(() => {
      loading.value = false;
    })
    .catch(error => {
      console.error('Data loading error:', error);
      loading.value = false;
    });
}

// 复制模板
function copyTemplate(template) {
  const newTemplate = JSON.parse(JSON.stringify(template));
  newTemplate.templateName = `${newTemplate.templateName} (Copy)`;
  newTemplate.templateCode = `${newTemplate.templateCode}_COPY`;
  newTemplate.status = 'draft';
  newTemplate.createdTime = new Date().toISOString().replace('T', ' ').substr(0, 19);
  newTemplate.updatedTime = new Date().toISOString().replace('T', ' ').substr(0, 19);
  
  templateStore.addTemplate(newTemplate);
  ElMessage.success('Templated copied');
}

// 添加或更新模板
function saveTemplate() {
  // 表单验证
  if (!currentTemplate.templateName || !currentTemplate.templateCode || !currentTemplate.templateType) {
    ElMessage.warning('Please input');
    return;
  }
  
  if (currentTemplate.id) {
    // 更新模板
    templateStore.updateTemplate(currentTemplate.id, currentTemplate);
    ElMessage.success('Template updated');
  } else {
    // 添加新模板
    templateStore.addTemplate(currentTemplate);
    ElMessage.success('Template added');
  }
  
  templateDialogVisible.value = false;
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

// 数据类型选项
const dataTypeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Array', value: 'array' },
  { label: 'Object', value: 'object' }
]

// 获取变量示例显示值
const getVariableExampleDisplay = (variable) => {
  if (!variable.example) return ''
  
  if (variable.dataType === 'array' || variable.dataType === 'object') {
    return typeof variable.example === 'string' ? 
      variable.example : 
      JSON.stringify(variable.example, null, 2)
  }
  
  return variable.example.toString()
}

// 获取数据类型标签类型
const getDataTypeTagType = (dataType) => {
  switch (dataType) {
    case 'string': return 'info'
    case 'number': return 'success'
    case 'boolean': return 'warning'
    case 'date': return 'primary'
    case 'array': return 'danger'
    case 'object': return 'success'
    default: return 'info'
  }
}

// 添加变量
function addVariable() {
  addVariableDialog.value = true;
  currentVariableIndex.value = -1;
  currentVariable.value = {
    name: '',
    dataType: 'string',
    required: false,
    description: '',
    validationRule: '',
    maxLength: null,
    format: '',
    example: ''
  };
}

// 编辑变量
function editVariable(variable) {
  const index = currentTemplate.variableConfig.findIndex(v => v.name === variable.name);
  if (index !== -1) {
    currentVariableIndex.value = index;
    currentVariable.value = JSON.parse(JSON.stringify(variable));
    addVariableDialog.value = true;
  }
}

// 删除变量
function deleteVariable(index) {
  ElMessageBox.confirm(
    `Confirm to delete variable "${currentTemplate.variableConfig[index].name}" ？`,
    'Confirm delete',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    currentTemplate.variableConfig.splice(index, 1);
    ElMessage.success('Variable deleted');
  }).catch(() => {
    // 取消删除
  });
}

// 保存变量
function saveVariable() {
  if (!currentVariable.value.name) {
    ElMessage.warning('Variable name cannot empty');
    return;
  }
  
  // 检查变量名是否已存在（新增时）
  if (currentVariableIndex.value === -1) {
    const existingIndex = currentTemplate.variableConfig.findIndex(v => v.name === currentVariable.value.name);
    if (existingIndex !== -1) {
      ElMessage.warning('Variable name already exists');
      return;
    }
  }
  
  if (currentVariableIndex.value === -1) {
    // 新增变量
    currentTemplate.variableConfig.push(JSON.parse(JSON.stringify(currentVariable.value)));
  } else {
    // 更新变量
    currentTemplate.variableConfig[currentVariableIndex.value] = JSON.parse(JSON.stringify(currentVariable.value));
  }
  
  addVariableDialog.value = false;
  ElMessage.success('Variable saved');
}

// 获取格式占位符提示
function getFormatPlaceholder() {
  if (currentVariable.value.dataType === 'date') {
    return 'yyyy-MM-dd HH:mm:ss';
  } else if (currentVariable.value.dataType === 'number') {
    return '0,0.00';
  }
  return '';
}

// 获取格式提示
function getFormatHint() {
  if (currentVariable.value.dataType === 'date') {
    return 'Date Template：yyyy-MM-dd , HH:mm:ss ';
  } else if (currentVariable.value.dataType === 'number') {
    return 'Number Template：0,000.00';
  }
  return '';
}

onMounted(() => {
  loadData();
})
</script>

<template>
  <div class="template-container">
    <div class="template-header">
      <h2>Message Templates</h2>
    </div>
    
    <el-card shadow="never" class="template-list-card">
      <div class="search-form-container">
        <el-form :inline="true" class="search-form">
          <el-form-item label="Name">
            <el-input v-model="searchForm.name" placeholder="Template Name" clearable />
          </el-form-item>
          <el-form-item label="Code">
            <el-input v-model="searchForm.code" placeholder="Template Code" clearable />
          </el-form-item>
          <el-form-item label="Type">
            <el-select v-model="searchForm.type" placeholder="All" clearable style="width: 150px">
              <el-option
                v-for="type in templateTypeOptions"
                :key="type.value"
                :label="type.label"
                :value="type.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Status">
            <el-select v-model="searchForm.status" placeholder="All" clearable style="width: 150px">
              <el-option
                v-for="status in statusOptions"
                :key="status.value"
                :label="status.label"
                :value="status.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchTemplates" :icon="Search">Search</el-button>
            <el-button @click="resetSearch">Reset</el-button>
          </el-form-item>
        </el-form>
        
        <div class="form-actions">
          <el-button type="primary" @click="openAddDialog" :icon="Plus">Add Template</el-button>
        </div>
      </div>
      
      <el-table
        :data="paginatedTemplates"
        style="width: 100%"
        v-loading="loading"
        border
        stripe
        highlight-current-row
      >
        <el-table-column prop="templateName" label="Template Name" min-width="150" />
        <el-table-column prop="templateCode" label="Template Code" min-width="150" />
        <el-table-column label="Type" min-width="100">
          <template #default="scope">
            {{ getTemplateTypeName(scope.row.templateType) }}
          </template>
        </el-table-column>
        <el-table-column label="Support Channels" min-width="180">
          <template #default="scope">
            {{ getChannelNames(scope.row.supportChannels) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />
        <el-table-column label="Status" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusName(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="Version" width="80" />
        <el-table-column label="Update Time" min-width="180">
          <template #default="scope">
            {{ scope.row.updatedTime || scope.row.createdTime }}
          </template>
        </el-table-column>
        <el-table-column label="Action" width="200" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button size="small" @click="openEditDialog(scope.row)" :icon="Edit">Edit</el-button>
              <el-button size="small" type="danger" @click="handleDelete(scope.row)" :icon="Delete">Delete</el-button>
            </el-button-group>
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
    
    <!-- 模板编辑对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      :title="currentTemplate.id ? 'Edit Template' : 'Add Template'"
      width="80%"
      destroy-on-close
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Basic" name="basic">
          <el-form label-width="100px">
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="Name" required>
                  <el-input v-model="currentTemplate.templateName" placeholder="Please input template name" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="Code" required>
                  <el-input v-model="currentTemplate.templateCode" placeholder="Please input template code" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="Type" required>
                  <el-select v-model="currentTemplate.templateType" placeholder="Select type" style="width: 100%">
                    <el-option
                      v-for="type in templateTypeOptions"
                      :key="type.value"
                      :label="type.label"
                      :value="type.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="Status">
                  <el-select v-model="currentTemplate.status" placeholder="Select status" style="width: 100%">
                    <el-option
                      v-for="status in statusOptions"
                      :key="status.value"
                      :label="status.label"
                      :value="status.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                <el-form-item label="Support Channels">
                  <el-checkbox-group v-model="currentTemplate.supportChannels">
                    <el-checkbox 
                      v-for="channel in channelOptions" 
                      :key="channel.value" 
                      :label="channel.value"
                    >
                      {{ channel.label }}
                    </el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                <el-form-item label="Description">
                  <el-input 
                    v-model="currentTemplate.description" 
                    type="textarea" 
                    :rows="3" 
                    placeholder="Please input template description"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="Content" name="content">
            <div class="template-content-container">
              <div class="template-types-section">
                <div class="section-header">
                  <h4>Type</h4>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="openContentTypeDialog"
                    :icon="Plus"
                  >
                    Add Type
                  </el-button>
                </div>
                
                <el-card shadow="hover" class="content-types-card">
                  <el-empty 
                    v-if="currentContentTypes.length === 0" 
                    description="No content type" 
                    :image-size="60" 
                  />
                  
                  <el-menu
                    v-else
                    :default-active="activeContentType"
                    class="content-types-menu"
                    @select="(index) => activeContentType = index"
                  >
                    <el-menu-item 
                      v-for="type in currentContentTypes" 
                      :key="type.id"
                      :index="type.id"
                    >
                      <template #title>
                        <div class="menu-item-content">
                          <span>{{ type.name }}</span>
                          <el-button 
                            type="danger" 
                            size="small" 
                            circle 
                            :icon="Delete"
                            @click.stop="removeContentType(type.id)"
                          ></el-button>
                        </div>
                      </template>
                    </el-menu-item>
                  </el-menu>
                </el-card>
              </div>
              
              <div class="template-editor-section">
                <div v-if="!activeContentType" class="no-content-selected">
                  <el-empty description="Select or add a content type" />
                </div>
                
                <el-card v-else shadow="hover" class="editor-card">
                  <template #header>
                    <div class="editor-header">
                      <h4>{{ getContentTypeName(activeContentType) }} Contnet</h4>
                      <div class="editor-actions">
                        <el-tooltip content="Insert variable" placement="top">
                          <el-dropdown 
                            trigger="click" 
                            @command="(variable) => insertVariable(variable, activeContentType)"
                          >
                            <el-button type="primary" size="small" plain>
                              Insert variable <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                            </el-button>
                            <template #dropdown>
                              <el-dropdown-menu>
                                <el-dropdown-item 
                                  v-for="variable in currentTemplate.variableConfig" 
                                  :key="variable.name"
                                  :command="variable.name"
                                >
                                  {{ variable.name }}
                                  <span class="variable-type-hint">({{ variable.description || variable.dataType }})</span>
                                </el-dropdown-item>
                                <el-dropdown-item 
                                  v-if="currentTemplate.variableConfig.length === 0"
                                  disabled
                                >
                                  No variable
                                </el-dropdown-item>
                              </el-dropdown-menu>
                            </template>
                          </el-dropdown>
                        </el-tooltip>
                      </div>
                    </div>
                  </template>
                  
                  <el-alert
                    title="Use {Variable} format to insert variable, such as {userName}"
                    type="info"
                    :closable="false"
                    show-icon
                    style="margin-bottom: 15px;"
                  />
                  
                  <el-input
                    v-model="currentTemplate.content[activeContentType]"
                    type="textarea"
                    :rows="12"
                    :placeholder="getContentTypePlaceholder(activeContentType)"
                    class="content-textarea"
                  />
                  
                  <div class="preview-section" v-if="currentTemplate.content[activeContentType]">
                    <div class="preview-header">
                      <h5>Preview</h5>
                      <el-switch 
                        v-model="showVariableHighlight"
                        active-text="Highlight"
                        inactive-text="Normal"
                      />
                    </div>
                    <div 
                      class="preview-content"
                      :class="{'highlight-variables': showVariableHighlight}"
                      v-html="getTemplatePreview(currentTemplate.content[activeContentType])"
                    ></div>
                  </div>
                </el-card>
              </div>
            </div>
          </el-tab-pane>
        
        <el-tab-pane label="Variable" name="variables">
          <el-button type="primary" :icon="Plus" @click="addVariable">Add Variable</el-button>
          
          <el-table
            :data="currentTemplate.variableConfig"
            style="width: 100%; margin-top: 15px;"
            border
            stripe
          >
            <el-table-column prop="name" label="Variable Name" width="180" />
            <el-table-column prop="dataType" label="Data Type" width="100">
              <template #default="scope">
                <el-tag>{{ scope.row.dataType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="Description" min-width="150" />
            <el-table-column prop="required" label="Required" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.required ? 'danger' : 'info'">
                  {{ scope.row.required ? 'Required' : 'Optional' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="example" label="Vaule" min-width="150" show-overflow-tooltip>
              <template #default="scope">
                {{ scope.row.example || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="Action" width="150">
              <template #default="scope">
                <el-button-group>
                  <el-button size="small" @click="editVariable(scope.row)" :icon="Edit">Edit</el-button>
                  <el-button size="small" type="danger" @click="deleteVariable(scope.$index)" :icon="Delete">Delete</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="templateDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveTemplate">Save</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 内容类型选择对话框 -->
    <el-dialog
      v-model="contentTypeDialog"
      title="Add content type"
      width="500px"
      destroy-on-close
    >
      <el-form>
        <el-form-item label="Select content type" label-width="120px">
          <el-select v-model="newContentType.id" placeholder="Select content type" style="width: 100%">
            <el-option
              v-for="channel in channelOptions"
              :key="channel.value"
              :label="channel.label"
              :value="channel.value"
              :disabled="currentTemplate.content && currentTemplate.content[channel.value] !== undefined"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="contentTypeDialog = false">Cancel</el-button>
          <el-button type="primary" @click="addContentType">Confirm</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 变量编辑对话框 -->
    <el-dialog
      v-model="addVariableDialog"
      :title="currentVariableIndex === -1 ? 'Add Variable' : 'Edit Variable'"
      width="600px"
    >
      <el-form :model="currentVariable" label-width="100px">
        <el-form-item label="Variable Name" required>
          <el-input v-model="currentVariable.name" placeholder="Please input variable name, such as userName" />
        </el-form-item>
        
        <el-form-item label="Data Type" required>
          <el-select v-model="currentVariable.dataType" placeholder="Please select data type" style="width: 100%">
            <el-option label="String" value="string" />
            <el-option label="Number" value="number" />
            <el-option label="Boolean" value="boolean" />
            <el-option label="Date" value="date" />
            <el-option label="Array" value="array" />
            <el-option label="Object" value="object" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input v-model="currentVariable.description" placeholder="Please input variable description" />
        </el-form-item>
        
        <el-form-item label="Required">
          <el-switch v-model="currentVariable.required" />
        </el-form-item>
        
        <el-form-item label="Sample Value">
          <el-input v-model="currentVariable.example" placeholder="Please input sample value" />
        </el-form-item>
        
        <el-form-item label="Validation Rule" v-if="currentVariable.dataType === 'string'">
          <el-input v-model="currentVariable.validationRule" placeholder="Please enter a regular expression" />
        </el-form-item>
        
        <el-form-item label="Max Length" v-if="currentVariable.dataType === 'string'">
          <el-input-number v-model="currentVariable.maxLength" :min="0" />
        </el-form-item>
        
        <el-form-item label="Format" v-if="['date', 'number'].includes(currentVariable.dataType)">
          <el-input v-model="currentVariable.format" :placeholder="getFormatPlaceholder()" />
          <div class="format-hint">{{ getFormatHint() }}</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addVariableDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveVariable">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.template-container {
  padding: 20px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-list-card {
  margin-bottom: 20px;
}

.search-form-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.search-form {
  flex: 1;
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-left: 10px;
}

.content-types-menu {
  border-right: none;
}

.menu-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.template-content-container {
  display: flex;
  gap: 20px;
}

.template-types-section {
  width: 250px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
}

.content-types-card {
  margin-bottom: 20px;
}

.template-editor-section {
  flex: 1;
}

.no-content-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.editor-card {
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h4 {
  margin: 0;
}

.content-textarea {
  margin-bottom: 20px;
}

.preview-section {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.preview-header h5 {
  margin: 0;
}

.preview-content {
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
  min-height: 100px;
}

.highlight-variables {
  background-color: #f0f0f0;
}

.variable-type-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

.format-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 0 15px 15px;
}
</style> 