<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSystemStore } from '@/stores'

const systemStore = useSystemStore()

// 系统列表
const systems = computed(() => systemStore.systems)

// 表格加载状态
const loading = ref(false)
// 系统对话框可见性
const systemDialogVisible = ref(false)
// 当前编辑的系统
const currentSystem = ref({
  id: null,
  name: '',
  description: '',
  apiKey: '',
  callbackUrl: '',
  status: 'enabled',
  ipWhitelist: '',
  createTime: '',
  updateTime: ''
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

// 筛选后的系统列表
const filteredSystems = computed(() => {
  let result = [...systems.value]
  
  // 按关键字搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(system => 
      system.name.toLowerCase().includes(keyword) || 
      system.description.toLowerCase().includes(keyword)
    )
  }
  
  // 按状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(system => system.status === statusFilter.value)
  }
  
  // 更新总数
  pagination.value.total = result.length
  
  return result
})

// 分页后的系统列表
const paginatedSystems = computed(() => {
  // 分页处理
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredSystems.value.slice(start, end)
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

// 加载系统列表
const loadSystems = () => {
  loading.value = true
  
  // 实际项目中应从API获取
  setTimeout(() => {
    systemStore.loadSystems()
    loading.value = false
  }, 500)
}

// 打开新增系统对话框
const openAddDialog = () => {
  dialogMode.value = 'add'
  currentSystem.value = {
    id: null,
    name: '',
    description: '',
    apiKey: generateApiKey(),
    callbackUrl: '',
    status: 'enabled',
    ipWhitelist: '',
    createTime: new Date().toLocaleString(),
    updateTime: new Date().toLocaleString()
  }
  systemDialogVisible.value = true
}

// 打开编辑系统对话框
const openEditDialog = (system) => {
  dialogMode.value = 'edit'
  currentSystem.value = JSON.parse(JSON.stringify(system))
  systemDialogVisible.value = true
}

// 保存系统
const saveSystem = () => {
  // 表单验证
  if (!currentSystem.value.name) {
    ElMessage.warning('Please input system name')
    return
  }
  
  // 更新时间
  currentSystem.value.updateTime = new Date().toLocaleString()
  
  if (dialogMode.value === 'add') {
    // 使用store的addSystem方法
    systemStore.addSystem(currentSystem.value)
    ElMessage.success('System Added')
  } else {
    // 使用store的updateSystem方法
    systemStore.updateSystem(currentSystem.value.id, currentSystem.value)
    ElMessage.success('System updated')
  }
  
  systemDialogVisible.value = false
}

// 切换系统状态
const toggleSystemStatus = (system) => {
  const newStatus = system.status === 'enabled' ? 'disabled' : 'enabled'
  
  if (newStatus === 'enabled') {
    systemStore.enableSystem(system.id)
  } else {
    systemStore.disableSystem(system.id)
  }
}

// 重新生成API密钥
const regenerateApiKey = () => {
  currentSystem.value.apiKey = generateApiKey()
  ElMessage.success('API Key generated')
}

// 生成随机API密钥
const generateApiKey = () => {
  return 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 复制API密钥
const copyApiKey = () => {
  navigator.clipboard.writeText(currentSystem.value.apiKey)
    .then(() => {
      ElMessage.success('API key has been copied to the clipboard')
    })
    .catch(() => {
      ElMessage.error('Copying failed, please copy manually')
    })
}

onMounted(() => {
  // 确保数据已加载
  if (systemStore.systems.length === 0) {
    loadSystems()
  }
})
</script>

<template>
  <div class="systems-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">System Connection Management</h2>
      </el-col>
    </el-row>
    
    <!-- 筛选工具栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-input
            v-model="searchKeyword"
            placeholder="System name or description..."
            clearable
            prefix-icon="Search"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
          <el-select v-model="statusFilter" placeholder="System Status" class="filter-select">
            <el-option label="All" value="all" />
            <el-option label="Active" value="enabled" />
            <el-option label="Disabled" value="disabled" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="12" :xl="12" class="action-buttons">
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon>Add System
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 系统列表 -->
    <el-card shadow="hover" class="system-list-card">
      <el-table
        v-loading="loading"
        :data="paginatedSystems"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column prop="id" label="System ID" width="80" />
        <el-table-column prop="name" label="Name" min-width="120" />
        <el-table-column prop="description" label="Description" min-width="180" />
        <el-table-column prop="apiKey" label="API Key" min-width="200">
          <template #default="{ row }">
            <el-tooltip 
              :content="row.apiKey || 'Unset'" 
              placement="top" 
              effect="light"
            >
              <span>{{ row.apiKey ? row.apiKey.substring(0, 8) + '...' : 'Unset' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="callbackUrl" label="Callback URL" min-width="180">
          <template #default="{ row }">
            <el-tooltip 
              :content="row.callbackUrl || 'Unset'" 
              placement="top" 
              effect="light"
            >
              <span>{{ row.callbackUrl || 'Unset' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="ipWhitelist" label="IP Whitelist" min-width="150">
          <template #default="{ row }">
            <el-tooltip 
              :content="row.ipWhitelist || 'Unset'" 
              placement="top" 
              effect="light"
            >
              <span>{{ row.ipWhitelist ? (row.ipWhitelist.split(',').length + ' IP') : 'Unset' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" effect="light">
              {{ row.status === 'enabled' ? 'Active' : 'Disabled' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="Create Time" width="180" />
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
              @click="toggleSystemStatus(row)"
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
    
    <!-- 系统编辑对话框 -->
    <el-dialog
      v-model="systemDialogVisible"
      :title="dialogMode === 'add' ? 'Add System' : 'Edit System'"
      width="70%"
      destroy-on-close
    >
      <el-form :model="currentSystem" label-width="100px">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="System ID" v-if="dialogMode === 'edit'">
              <el-input v-model="currentSystem.id" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Name" required>
              <el-input v-model="currentSystem.name" placeholder="Please input system name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Status">
              <el-select v-model="currentSystem.status" placeholder="Select status" style="width: 100%">
                <el-option label="Active" value="enabled" />
                <el-option label="Disabled" value="disabled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Description">
          <el-input v-model="currentSystem.description" placeholder="Please input system description" type="textarea" :rows="2" />
        </el-form-item>
        
        <el-form-item label="API Key">
          <div class="api-key-input">
            <el-input v-model="currentSystem.apiKey" placeholder="API Key" readonly />
            <el-button type="primary" @click="regenerateApiKey">Re-generate</el-button>
            <el-button type="success" @click="copyApiKey">Copy</el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="Callback URL">
          <el-input v-model="currentSystem.callbackUrl" placeholder="Please input callback URL" />
        </el-form-item>
        
        <el-form-item label="IP Whitelist">
          <el-input 
            v-model="currentSystem.ipWhitelist" 
            placeholder="Please enter the IP whitelist, use , to separate multiple IPs." 
            type="textarea" 
            :rows="2"
          />
        </el-form-item>
        
        <el-row :gutter="20" v-if="dialogMode === 'edit'">
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Create Time">
              <el-input v-model="currentSystem.createTime" disabled />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="Update Time">
              <el-input v-model="currentSystem.updateTime" disabled />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="systemDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveSystem">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.systems-container {
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

.system-list-card {
  margin-bottom: 20px;
}

.system-list-card :deep(.el-card__body) {
  padding: 0;
}

.api-key-input {
  display: flex;
  gap: 10px;
}

.api-key-input .el-button {
  width: 100%;
}

.pagination-container {
  padding: 15px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .action-buttons {
    justify-content: flex-start;
    margin-top: 15px;
  }
  
  .filter-select {
    margin-bottom: 10px;
  }
  
  .api-key-input {
    flex-direction: column;
    gap: 10px;
  }
  
  .api-key-input .el-button {
    width: 100%;
  }
  
  .pagination-container {
    justify-content: center;
  }
}
</style> 