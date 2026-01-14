<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMessageStore, useMessageTypeStore } from '@/stores'

const messageStore = useMessageStore()
const messageTypeStore = useMessageTypeStore()

// 表格数据
const tableData = ref([])
// 表格加载状态
const tableLoading = ref(false)
// 批量选择的消息
const selectedMessages = ref([])
// 每页显示数量
const pageSize = ref(10)
// 当前页码
const currentPage = ref(1)
// 总消息数
const totalMessages = ref(0)
// 搜索条件
const searchForm = reactive({
  keyword: '',
  status: 'all',
  type: 'all',
  dateRange: []
})
// 表单弹窗可见性
const dialogVisible = ref(false)
// 批量发送弹窗可见性
const batchDialogVisible = ref(false)
// 当前编辑的消息
const currentMessage = reactive({
  id: null,
  title: '',
  content: '',
  type: '',
  recipients: [],
  scheduledTime: '',
  status: 'Pending'
})
// 批量发送表单
const batchForm = reactive({
  title: '',
  content: '',
  type: '',
  recipientFile: null,
  scheduledTime: '',
  immediatelyDispatch: true
})
// 表单规则
const rules = reactive({
  title: [{ required: true, message: 'Please input message title', trigger: 'blur' }],
  content: [{ required: true, message: 'Please input content', trigger: 'blur' }],
  type: [{ required: true, message: 'Please select type', trigger: 'change' }],
  recipients: [{ required: true, message: 'Please select recipients', trigger: 'change' }]
})
// 批量表单规则
const batchRules = reactive({
  title: [{ required: true, message: 'Please input message title', trigger: 'blur' }],
  content: [{ required: true, message: 'Please input content', trigger: 'blur' }],
  type: [{ required: true, message: 'Please select type', trigger: 'change' }],
  recipientFile: [{ required: true, message: 'Please upload recipient file', trigger: 'change' }]
})
// 接收者选项
const recipientOptions = ref([
  { value: 1, label: 'Amy' },
  { value: 2, label: 'Ben' },
  { value: 3, label: 'Cathy' },
  { value: 4, label: 'GBG' },
  { value: 5, label: 'PSBG' },
  { value: 6, label: 'Digital' }
])

// 表单引用
const formRef = ref(null)
const batchFormRef = ref(null)

// 初始化函数
onMounted(() => {
  loadData()
  if (messageTypeStore.messageTypes.length === 0) {
    messageTypeStore.loadMessageTypes()
  }
})

// 加载数据
const loadData = () => {
  tableLoading.value = true
  
  // 模拟数据 - 实际项目中应从API获取
  setTimeout(() => {
    tableData.value = [
      {
        id: 101,
        title: 'System Maintenance Notification',
        type: { id: 1, name: 'System Notification', color: '#409EFF' },
        recipientCount: 125,
        status: 'Pending',
        scheduledTime: '2023-11-20 22:00:00',
        createTime: '2023-11-15 10:30:00',
        creator: 'System Administrator'
      },
      {
        id: 102,
        title: 'Employee Training Notification',
        type: { id: 4, name: 'Meeting Notification', color: '#E6A23C' },
        recipientCount: 45,
        status: 'Sent',
        scheduledTime: '2023-11-16 09:00:00',
        createTime: '2023-11-14 16:45:00',
        creator: 'Human Resources Department'
      },
      {
        id: 103,
        title: 'Customer Satisfaction Survey',
        type: { id: 2, name: 'Work Reminder', color: '#67C23A' },
        recipientCount: 500,
        status: 'Pending',
        scheduledTime: '2023-11-25 09:00:00',
        createTime: '2023-11-18 11:30:00',
        creator: 'Admin Department'
      },
      {
        id: 104,
        title: 'System Update Reminder',
        type: { id: 1, name: 'System Notification', color: '#409EFF' },
        recipientCount: 150,
        status: 'Cancelled',
        scheduledTime: '2023-11-22 20:00:00',
        createTime: '2023-11-17 09:45:00',
        creator: 'Digital'
      }
    ]
    totalMessages.value = tableData.value.length
    tableLoading.value = false
  }, 500)
}

// 筛选后的数据
const filteredData = computed(() => {
  let result = [...tableData.value]
  
  // 关键字搜索
  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    result = result.filter(item => 
      item.title.toLowerCase().includes(keyword) || 
      item.creator.toLowerCase().includes(keyword)
    )
  }
  
  // 状态筛选
  if (searchForm.status !== 'all') {
    result = result.filter(item => item.status === searchForm.status)
  }
  
  // 类型筛选
  if (searchForm.type !== 'all') {
    result = result.filter(item => item.type.id === parseInt(searchForm.type))
  }
  
  // 日期筛选
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    // 实际项目中应处理日期比较
  }
  
  return result
})

// 分页数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 打开新增弹窗
const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

// 打开编辑弹窗
const handleEdit = (row) => {
  resetForm()
  // 填充表单数据
  Object.assign(currentMessage, {
    id: row.id,
    title: row.title,
    content: 'This is a sample message content; the actual data should be retrieved from the API.',
    type: row.type.id,
    recipients: [1, 4], // 示例数据
    scheduledTime: row.scheduledTime,
    status: row.status
  })
  dialogVisible.value = true
}

// 打开批量发送弹窗
const handleBatchSend = () => {
  resetBatchForm()
  batchDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(currentMessage, {
    id: null,
    title: '',
    content: '',
    type: '',
    recipients: [],
    scheduledTime: '',
    status: 'Penidng'
  })
}

// 重置批量表单
const resetBatchForm = () => {
  if (batchFormRef.value) {
    batchFormRef.value.resetFields()
  }
  Object.assign(batchForm, {
    title: '',
    content: '',
    type: '',
    recipientFile: null,
    scheduledTime: '',
    immediatelyDispatch: true
  })
}

// 保存消息
const saveMessage = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // 模拟保存操作
      ElMessage.success(`${currentMessage.id ? 'Update' : 'Create'}Message scheduled！`)
      dialogVisible.value = false
      loadData()
    }
  })
}

// 保存批量发送
const saveBatchSend = () => {
  batchFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟保存操作
      ElMessage.success('Batch messages created！')
      batchDialogVisible.value = false
      loadData()
    }
  })
}

// 取消发送
const cancelScheduled = (row) => {
  ElMessageBox.confirm(
    `Confirm to cancel the scheduled message "${row.title}"？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    // 模拟取消操作
    row.status = 'Cancelled'
    ElMessage.success('Cancelled to send scheduled message')
  }).catch(() => {})
}

// 立即发送
const sendNow = (row) => {
  ElMessageBox.confirm(
    `Confirm to send scheduled message "${row.title}"？`,
    'Warning',
    {
      confirmButtonText: 'Confim',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    // 模拟发送操作
    row.status = 'Sent'
    ElMessage.success('Message sent')
  }).catch(() => {})
}

// 删除消息
const deleteMessage = (row) => {
  ElMessageBox.confirm(
    `Confirm to delete scheduled message"${row.title}"？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'danger'
    }
  ).then(() => {
    // 模拟删除操作
    tableData.value = tableData.value.filter(item => item.id !== row.id)
    ElMessage.success('Message deleted')
  }).catch(() => {})
}

// 批量删除
const batchDelete = () => {
  if (selectedMessages.value.length === 0) {
    ElMessage.warning('Please select the messages to delete')
    return
  }
  
  ElMessageBox.confirm(
    `Confirm to delete ${selectedMessages.value.length} messages？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'danger'
    }
  ).then(() => {
    // 模拟批量删除
    tableData.value = tableData.value.filter(
      item => !selectedMessages.value.includes(item.id)
    )
    selectedMessages.value = []
    ElMessage.success('Batch delete completed')
  }).catch(() => {})
}

// 上传前验证
const beforeUpload = (file) => {
  const isCSV = file.type === 'text/csv'
  const isExcel = file.type === 'application/vnd.ms-excel' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  
  if (!isCSV && !isExcel) {
    ElMessage.error('Only CSV or Excel allowed!')
    return false
  }
  
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    ElMessage.error('File size cannot exceed 2MB!')
    return false
  }
  
  return true
}

// 文件上传成功
const handleUploadSuccess = (response) => {
  batchForm.recipientFile = response
  ElMessage.success('File uploaded')
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 处理每页条数变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

// 重置搜索条件
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: 'all',
    type: 'all',
    dateRange: []
  })
}
</script>

<template>
  <div class="scheduled-messages-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Scheduled Messages</h2>
      </el-col>
    </el-row>
    
    <!-- 搜索栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :model="searchForm" label-width="80px" size="default" inline>
        <el-form-item label="Keywords">
          <el-input v-model="searchForm.keyword" placeholder="Creator / Keyword" clearable />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="searchForm.status" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option label="Pending" value="Pending" />
            <el-option label="Sent" value="Sent" />
            <el-option label="Cancelled" value="Cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="Type">
          <el-select v-model="searchForm.type" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option
              v-for="type in messageTypeStore.messageTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id.toString()"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Creation Date">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="to"
            start-placeholder="Start Date"
            end-placeholder="End Date"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">Search</el-button>
          <el-button @click="resetSearch">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 工具栏 -->
    <el-card shadow="hover" class="action-card">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> Add Scheduled Message
          </el-button>
          <el-button type="success" @click="handleBatchSend">
            <el-icon><Upload /></el-icon> Batch Send
          </el-button>
          <el-button type="danger" @click="batchDelete" :disabled="selectedMessages.length === 0">
            <el-icon><Delete /></el-icon> Batch Delete
          </el-button>
          <el-button type="warning" @click="$router.push('/message-records')">
            <el-icon><Tickets /></el-icon> Message Records
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 消息列表 -->
    <el-card shadow="hover" class="table-card">
      <el-table
        v-loading="tableLoading"
        :data="paginatedData"
        style="width: 100%"
        @selection-change="val => selectedMessages = val.map(item => item.id)"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="Heading" min-width="180" show-overflow-tooltip />
        <el-table-column label="Type" width="120">
          <template #default="{ row }">
            <el-tag
              :style="{ backgroundColor: row.type.color + '20', color: row.type.color, borderColor: row.type.color }"
              effect="plain"
            >
              {{ row.type.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recipientCount" label="Recipient Count" width="100" align="center" />
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Pending' ? 'warning' : row.status === 'Sent' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scheduledTime" label="Scheduled Time" width="160" />
        <el-table-column prop="createTime" label="Create Time" width="160" />
        <el-table-column prop="creator" label="Creator" width="120" />
        <el-table-column label="Action" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'Pending'" type="primary" size="small" @click="sendNow(row)">
              Send
            </el-button>
            <el-button v-if="row.status === 'Pending'" type="warning" size="small" @click="cancelScheduled(row)">
              Cancel
            </el-button>
            <el-button v-if="row.status === 'Pending'" type="info" size="small" @click="handleEdit(row)">
              Edit
            </el-button>
            <el-button type="danger" size="small" @click="deleteMessage(row)">
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 定时消息表单弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentMessage.id ? 'Edit Scheduled Messgae' : 'Add Scheduled Message'"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="currentMessage"
        :rules="rules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="Title" prop="title">
          <el-input v-model="currentMessage.title" placeholder="Please input message title" />
        </el-form-item>
        <el-form-item label="Content" prop="content">
          <el-input
            v-model="currentMessage.content"
            type="textarea"
            :rows="4"
            placeholder="Please input content"
          />
        </el-form-item>
        <el-form-item label="Type" prop="type">
          <el-select v-model="currentMessage.type" placeholder="Select type" style="width: 100%">
            <el-option
              v-for="type in messageTypeStore.messageTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Recipients" prop="recipients">
          <el-select
            v-model="currentMessage.recipients"
            multiple
            filterable
            collapse-tags
            placeholder="Select recipients"
            style="width: 100%"
          >
            <el-option
              v-for="item in recipientOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Schedule Send">
          <el-date-picker
            v-model="currentMessage.scheduledTime"
            type="datetime"
            placeholder="Select date and time"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveMessage">confirm</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 批量发送弹窗 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="Batch Send"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="batchFormRef"
        :model="batchForm"
        :rules="batchRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="Title" prop="title">
          <el-input v-model="batchForm.title" placeholder="Please input message title" />
        </el-form-item>
        <el-form-item label="Content" prop="content">
          <el-input
            v-model="batchForm.content"
            type="textarea"
            :rows="4"
            placeholder="Please input content"
          />
        </el-form-item>
        <el-form-item label="Type" prop="type">
          <el-select v-model="batchForm.type" placeholder="Select type" style="width: 100%">
            <el-option
              v-for="type in messageTypeStore.messageTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Recipient File" prop="recipientFile">
          <el-upload
            class="upload-demo"
            action="https://api.example.com/upload"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            :show-file-list="true"
          >
            <el-button type="primary">Upload recipient file</el-button>
            <template #tip>
              <div class="el-upload__tip">
                Only CSV or Excel，file size cannot exceed 2MB.
                <el-link type="primary" :underline="true">Download template</el-link>
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="Send Time">
          <el-radio-group v-model="batchForm.immediatelyDispatch">
            <el-radio :label="true">Send Now</el-radio>
            <el-radio :label="false">Scheduled Send</el-radio>
          </el-radio-group>
          <el-date-picker
            v-if="!batchForm.immediatelyDispatch"
            v-model="batchForm.scheduledTime"
            type="datetime"
            placeholder="Select date and time"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%; margin-top: 10px;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveBatchSend">Confirm</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.scheduled-messages-container {
  padding: 20px;
}

.page-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.filter-card,
.action-card,
.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.el-table :deep(.el-button) {
  padding: 4px 8px;
  margin-right: 5px;
}

.upload-demo {
  width: 100%;
}

.upload-demo .el-upload {
  width: 100%;
}

.upload-demo .el-button {
  margin-right: 10px;
}

.el-form-item {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .el-form-item {
    margin-right: 0;
  }
}
</style> 