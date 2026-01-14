<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMessageTypeStore, useChannelStore, useTemplateStore } from '@/stores'

const messageTypeStore = useMessageTypeStore()
const channelStore = useChannelStore()
const templateStore = useTemplateStore()

// 消息类型列表
const messageTypes = computed(() => messageTypeStore.messageTypes)

// 表格加载状态
const loading = ref(false)
// 类型对话框可见性
const typeDialogVisible = ref(false)
// 当前编辑的类型
const currentType = ref({
  id: null,
  name: '',
  description: '',
  defaultChannels: [],
  defaultTemplate: null,
  status: 'enabled',
  icon: '',
  color: '#409EFF'
})
// 对话框模式：新增/编辑
const dialogMode = ref('add')

// 搜索关键字
const searchKeyword = ref('')
// 状态筛选
const statusFilter = ref('all')

// 分页相关变量
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 颜色选项
const colorOptions = [
  { color: '#409EFF', name: 'Blue' },
  { color: '#67C23A', name: 'Green' },
  { color: '#E6A23C', name: 'Yellow' },
  { color: '#F56C6C', name: 'Red' },
  { color: '#909399', name: 'Gray' },
  { color: '#8E44AD', name: 'Purple' },
  { color: '#16A085', name: 'Cyan' },
  { color: '#D35400', name: 'Orange' }
]

// 图标选项
const iconOptions = [
  'Bell',
  'Message',
  'ChatDotRound',
  'ChatLineRound',
  'Warning',
  'InfoFilled',
  'CircleCheck',
  'CircleClose',
  'Notification',
  'Star'
]

// 筛选后的类型列表
const filteredTypes = computed(() => {
  let result = [...messageTypes.value]
  
  // 按关键字搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(type => 
      type.name.toLowerCase().includes(keyword) || 
      type.description.toLowerCase().includes(keyword)
    )
  }
  
  // 按状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(type => type.status === statusFilter.value)
  }
  
  // 更新总数
  pagination.value.total = result.length
  
  // 分页处理
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return result.slice(start, end)
})

// 加载消息类型列表
const loadMessageTypes = () => {
  loading.value = true
  
  // 实际项目中应从API获取
  setTimeout(() => {
    messageTypeStore.loadMessageTypes()
    
    // 确保其他相关数据已加载
    if (channelStore.channels.length === 0) {
      channelStore.loadChannels()
    }
    if (templateStore.templates.length === 0) {
      templateStore.loadTemplates()
    }
    
    loading.value = false
  }, 500)
}

// 打开新增类型对话框
const openAddDialog = () => {
  dialogMode.value = 'add'
  currentType.value = {
    id: null,
    name: '',
    description: '',
    defaultChannels: [],
    defaultTemplate: null,
    status: 'enabled',
    icon: 'Bell',
    color: '#409EFF'
  }
  typeDialogVisible.value = true
}

// 打开编辑类型对话框
const openEditDialog = (type) => {
  dialogMode.value = 'edit'
  currentType.value = JSON.parse(JSON.stringify(type))
  typeDialogVisible.value = true
}

// 保存消息类型
const saveMessageType = () => {
  // 表单验证
  if (!currentType.value.name) {
    ElMessage.warning('Please input type')
    return
  }
  
  if (dialogMode.value === 'add') {
    // 使用store的addMessageType方法
    messageTypeStore.addMessageType(currentType.value)
    ElMessage.success('Message type added')
  } else {
    // 使用store的updateMessageType方法
    messageTypeStore.updateMessageType(currentType.value.id, currentType.value)
    ElMessage.success('Message type updated')
  }
  
  typeDialogVisible.value = false
}

// 切换消息类型状态
const toggleTypeStatus = (type) => {
  const newStatus = type.status === 'enabled' ? 'disabled' : 'enabled'
  messageTypeStore.updateMessageType(type.id, { status: newStatus })
  ElMessage.success(`Message type is ${newStatus === 'enabled' ? 'Active' : 'Disabled'}`)
}

// 处理分页变化
const handleCurrentChange = (val) => {
  pagination.value.currentPage = val
}

// 处理每页数量变化
const handleSizeChange = (val) => {
  pagination.value.pageSize = val
  pagination.value.currentPage = 1
}

// 获取渠道名称
const getChannelName = (channelId) => {
  const channel = channelStore.channels.find(c => c.id === channelId)
  return channel ? channel.name : `Unknown channel (${channelId})`
}

// 获取模板名称
const getTemplateName = (templateId) => {
  const template = templateStore.templates.find(t => t.id === templateId)
  return template ? template.name : `Unknow template (${templateId})`
}

// 获取可选渠道列表
const availableChannels = computed(() => {
  return channelStore.channels
    .filter(c => c.status === 'enabled')
    .map(c => ({ value: c.id, label: c.name }))
})

// 获取可选模板列表
const availableTemplates = computed(() => {
  return templateStore.templates
    .filter(t => t.status === 'published')
    .map(t => ({ value: t.id, label: t.name }))
})

onMounted(() => {
  // 确保数据已加载
  if (messageTypeStore.messageTypes.length === 0) {
    loadMessageTypes()
  }
})
</script>

<template>
  <div class="message-types-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Message Types Management</h2>
      </el-col>
    </el-row>
    
    <!-- 筛选工具栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-input
            v-model="searchKeyword"
            placeholder="Search by message type or description..."
            clearable
            prefix-icon="Search"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-select v-model="statusFilter" placeholder="Status" class="filter-select">
            <el-option label="All" value="all" />
            <el-option label="Active" value="enabled" />
            <el-option label="Disabled" value="disabled" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="12" :xl="12" class="action-buttons">
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon>Add Type
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 类型列表 -->
    <el-card shadow="hover" class="type-list-card">
      <el-table
        v-loading="loading"
        :data="filteredTypes"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Type Name" min-width="150">
          <template #default="{ row }">
            <div class="type-name">
              <el-icon :style="{ color: row.color }">
                <component :is="row.icon" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" min-width="200" />
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" effect="light">
              {{ row.status === 'enabled' ? 'Active' : 'Disabled' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="Update Time" width="180" />
        <el-table-column label="Action" width="200" fixed="right">
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
              @click="toggleTypeStatus(row)"
            >
              {{ row.status === 'enabled' ? 'Disabled' : 'Active' }}
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
    
    <!-- 类型编辑对话框 -->
    <el-dialog
      v-model="typeDialogVisible"
      :title="dialogMode === 'add' ? 'Add Message Type' : 'Edit Message Type'"
      width="70%"
      destroy-on-close
    >
      <el-form :model="currentType" label-width="100px">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Type Name" required>
              <el-input v-model="currentType.name" placeholder="Please input type name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Status">
              <el-select v-model="currentType.status" placeholder="Please select status" style="width: 100%">
                <el-option label="Active" value="enabled" />
                <el-option label="Disabled" value="disabled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Type Description">
          <el-input v-model="currentType.description" placeholder="Please input message type description" type="textarea" :rows="2" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Icon">
              <el-select v-model="currentType.icon" placeholder="Select icon" style="width: 100%">
                <el-option
                  v-for="icon in iconOptions"
                  :key="icon"
                  :label="icon"
                  :value="icon"
                >
                  <div class="icon-option">
                    <el-icon><component :is="icon" /></el-icon>
                    <span>{{ icon }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Color">
              <el-select v-model="currentType.color" placeholder="Select color" style="width: 100%">
                <el-option
                  v-for="option in colorOptions"
                  :key="option.color"
                  :label="option.name"
                  :value="option.color"
                >
                  <div class="color-option">
                    <div class="color-block" :style="{ backgroundColor: option.color }"></div>
                    <span>{{ option.name }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider>Deafult Settings</el-divider>
        
        <el-form-item label="Channel">
          <el-select
            v-model="currentType.defaultChannels"
            multiple
            filterable
            placeholder="Please select default channel"
            style="width: 100%"
          >
            <el-option
              v-for="channel in availableChannels"
              :key="channel.value"
              :label="channel.label"
              :value="channel.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Template">
          <el-select
            v-model="currentType.defaultTemplate"
            filterable
            clearable
            placeholder="Please select default template"
            style="width: 100%"
          >
            <el-option
              v-for="template in availableTemplates"
              :key="template.value"
              :label="template.label"
              :value="template.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="typeDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveMessageType">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.message-types-container {
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

.type-list-card {
  margin-bottom: 20px;
}

.type-list-card :deep(.el-card__body) {
  padding: 0;
}

.type-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-block {
  width: 16px;
  height: 16px;
  border-radius: 2px;
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
  
  .pagination-container {
    justify-content: center;
  }
}
</style> 