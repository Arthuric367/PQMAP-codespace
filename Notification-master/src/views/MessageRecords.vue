<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMessageStore, useMessageTypeStore } from '@/stores'

const router = useRouter()
const messageStore = useMessageStore()
const messageTypeStore = useMessageTypeStore()

// 表格数据
const tableData = ref([])
// 表格加载状态
const tableLoading = ref(false)
// 批量选择的记录
const selectedRecords = ref([])
// 每页显示数量
const pageSize = ref(10)
// 当前页码
const currentPage = ref(1)
// 总记录数
const totalRecords = ref(0)
// 详情弹窗可见性
const detailDialogVisible = ref(false)
// 当前查看的记录详情
const currentRecord = reactive({
  id: null,
  title: '',
  content: '',
  sourceSystem: '',
  messageType: '',
  templateId: '',
  variables: '',
  recipients: [],
  channels: [],
  status: '',
  createTime: '',
  sendTime: '',
  retryCount: 0,
  failReason: '',
  priority: 0,
  scheduledTime: ''
})

// 搜索条件
const searchForm = reactive({
  keyword: '',
  status: 'all',
  sourceSystem: 'all',
  messageType: 'all',
  dateRange: []
})

// 获取系统列表 (模拟数据)
const systemOptions = ref([
  { value: '1', label: 'PQMS' },
  { value: '2', label: 'CPDIS' },
  { value: '3', label: 'UAM' },
  { value: '4', label: 'WIS' },
  { value: '5', label: 'ADMS' }
])

// 渠道类型选项
const channelOptions = ref([
  { value: '1', label: 'SMS' },
  { value: '2', label: 'Email' },
  { value: '3', label: 'In-system' },
  { value: '4', label: 'xx' },
  { value: '5', label: 'xxx' }
])

// 初始化
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
        id: 1001,
        title: 'Order Completed',
        content: 'Task No.123 completed',
        sourceSystem: { id: '1', name: 'PQMS' },
        messageType: { id: 1, name: 'System Notification', color: '#409EFF' },
        templateId: 'TPL_PAYMENT_SUCCESS',
        variables: { orderNo: '67890', amount: 199.00 },
        recipients: [{ id: 2, name: 'Ben', type: 'Personal' }],
        channels: [{ id: '1', name: 'SMS' }, { id: '3', name: 'In-system' }],
        status: 'Sent',
        createTime: '2023-10-16 14:20:00',
        sendTime: '2023-10-16 14:20:03',
        retryCount: 0,
        failReason: '',
        priority: 1,
        scheduledTime: null
      },
      {
        id: 1002,
        title: 'Account Abnormal Login Alert',
        content: 'Your account logged in from an unusual location (US) at 03:25 on 2023-10-18. If this was not you, please change your password immediately.',
        sourceSystem: { id: '4', name: 'WIS' },
        messageType: { id: 3, name: 'Alert Message', color: '#F56C6C' },
        templateId: 'TPL_SECURITY_ALERT',
        variables: { loginTime: '2023-10-18 03:25', location: 'US' },
        recipients: [{ id: 3, name: 'Cathy', type: 'Personal' }],
        channels: [{ id: '1', name: 'SMS' }, { id: '2', name: 'Email' }],
        status: 'Failed',
        createTime: '2023-10-18 03:26:00',
        sendTime: '2023-10-18 03:26:10',
        retryCount: 3,
        failReason: 'SMS service issue',
        priority: 0,
        scheduledTime: null
      },
      {
        id: 1003,
        title: 'Logistics Delivery Notification',
        content: 'Your order #54321 has been shipped. Tracking number: SF1234567890. Expected delivery tomorrow.',
        sourceSystem: { id: '5', name: 'ADMS' },
        messageType: { id: 1, name: 'System Notification', color: '#409EFF' },
        templateId: 'TPL_DELIVERY_NOTICE',
        variables: { orderNo: '54321', trackingNo: 'SF1234567890', deliveryDate: 'Tomorrow' },
        recipients: [{ id: 1, name: 'Amy', type: 'Personal' }],
        channels: [{ id: '1', name: 'SMS' }, { id: '2', name: 'In-system' }],
        status: 'Pending',
        createTime: '2023-10-19 15:40:00',
        sendTime: null,
        retryCount: 0,
        failReason: '',
        priority: 2,
        scheduledTime: '2023-10-19 16:00:00'
      }
    ]
    totalRecords.value = tableData.value.length
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
      item.content.toLowerCase().includes(keyword) ||
      (typeof item.variables === 'object' && JSON.stringify(item.variables).toLowerCase().includes(keyword))
    )
  }
  
  // 状态筛选
  if (searchForm.status !== 'all') {
    result = result.filter(item => item.status === searchForm.status)
  }
  
  // 来源系统筛选
  if (searchForm.sourceSystem !== 'all') {
    result = result.filter(item => item.sourceSystem.id === searchForm.sourceSystem)
  }
  
  // 消息类型筛选
  if (searchForm.messageType !== 'all') {
    result = result.filter(item => item.messageType.id === parseInt(searchForm.messageType))
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

// 查看详情
const viewDetail = (row) => {
  // 填充详情数据
  Object.assign(currentRecord, {
    id: row.id,
    title: row.title,
    content: row.content,
    sourceSystem: row.sourceSystem.name,
    messageType: row.messageType.name,
    templateId: row.templateId,
    variables: JSON.stringify(row.variables, null, 2),
    recipients: row.recipients,
    channels: row.channels,
    status: row.status,
    createTime: row.createTime,
    sendTime: row.sendTime || 'Not sent yet',
    retryCount: row.retryCount,
    failReason: row.failReason || 'None',
    priority: row.priority,
    scheduledTime: row.scheduledTime || 'None'
  })
  detailDialogVisible.value = true
}

// 重新发送
const resendMessage = (row) => {
  ElMessageBox.confirm(
    `Confirm to resend "${row.title}" ？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    // 模拟重发操作
    row.status = 'Sending'
    setTimeout(() => {
      row.status = 'Sent'
      row.retryCount += 1
      row.sendTime = new Date().toLocaleString()
      row.failReason = ''
      ElMessage.success('The message has been resent')
    }, 1000)
  }).catch(() => {})
}

// 删除记录
const deleteRecord = (row) => {
  ElMessageBox.confirm(
    `Confirm to delete message record "${row.title}" ？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'danger'
    }
  ).then(() => {
    // 模拟删除操作
    tableData.value = tableData.value.filter(item => item.id !== row.id)
    ElMessage.success('Record deleted')
  }).catch(() => {})
}

// 批量删除
const batchDelete = () => {
  if (selectedRecords.value.length === 0) {
    ElMessage.warning('Please select the records to delete')
    return
  }
  
  ElMessageBox.confirm(
    `Confirm to delete ${selectedRecords.value.length} records？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'danger'
    }
  ).then(() => {
    // 模拟批量删除
    tableData.value = tableData.value.filter(
      item => !selectedRecords.value.includes(item.id)
    )
    selectedRecords.value = []
    ElMessage.success('Batch delete completed')
  }).catch(() => {})
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
    sourceSystem: 'all',
    messageType: 'all',
    dateRange: []
  })
}

// 导出记录
const exportRecords = () => {
  ElMessage.success('Exporting to Excel file')
}
</script>

<template>
  <div class="message-records-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Message Records</h2>
      </el-col>
    </el-row>
    
    <!-- 搜索栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :model="searchForm" label-width="80px" size="default" inline>
        <el-form-item label="Keyword">
          <el-input v-model="searchForm.keyword" placeholder="Title/Content/Variables" clearable />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="searchForm.status" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option label="Penidng" value="Pending" />
            <el-option label="Sending" value="Sending" />
            <el-option label="Sent" value="Sent" />
            <el-option label="Failed" value="Failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="Source System">
          <el-select v-model="searchForm.sourceSystem" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option
              v-for="item in systemOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Type">
          <el-select v-model="searchForm.messageType" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option
              v-for="type in messageTypeStore.messageTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id.toString()"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Time Range">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="to"
            start-placeholder="Start date"
            end-placeholder="End date"
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
          <el-button type="danger" @click="batchDelete" :disabled="selectedRecords.length === 0">
            <el-icon><Delete /></el-icon> Batch Delete
          </el-button>
          <el-button type="success" @click="exportRecords">
            <el-icon><Download /></el-icon> Export Records
          </el-button>
          <el-button type="info" @click="$router.push('/scheduled-messages')">
            <el-icon><Timer /></el-icon> Scheduled Messages
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 记录列表 -->
    <el-card shadow="hover" class="table-card">
      <el-table
        v-loading="tableLoading"
        :data="paginatedData"
        style="width: 100%"
        @selection-change="val => selectedRecords = val.map(item => item.id)"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="Title" min-width="180" show-overflow-tooltip />
        <el-table-column label="Type" width="100">
          <template #default="{ row }">
            <el-tag
              :style="{ backgroundColor: row.messageType.color + '20', color: row.messageType.color, borderColor: row.messageType.color }"
              effect="plain"
            >
              {{ row.messageType.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Source System" width="100">
          <template #default="{ row }">
            {{ row.sourceSystem.name }}
          </template>
        </el-table-column>
        <el-table-column label="Recipient" width="100">
          <template #default="{ row }">
            <el-tooltip
              :content="row.recipients.map(r => r.name).join(', ')"
              placement="top"
              :hide-after="0"
            >
              <span>{{ row.recipients.length }} recipients</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="Distribution Channel" width="100">
          <template #default="{ row }">
            <el-tooltip
              :content="row.channels.map(c => c.name).join(', ')"
              placement="top"
              :hide-after="0"
            >
              <span>{{ row.channels.length }} channels</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="
              row.status === 'Sent' ? 'success' : 
              row.status === 'Failed' ? 'danger' : 
              row.status === 'Sending' ? 'warning' : 
              'info'
            ">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="Priority" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="
              row.priority === 0 ? 'danger' : 
              row.priority === 1 ? 'warning' : 
              'info'
            ">
              {{ row.priority === 0 ? 'High' : row.priority === 1 ? 'Medium' : 'Low' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="Creation Time" width="160" />
        <el-table-column prop="sendTime" label="Send Time" width="160">
          <template #default="{ row }">
            {{ row.sendTime || 'Not sent yet' }}
          </template>
        </el-table-column>
        <el-table-column label="Action" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">
              Details
            </el-button>
            <el-button 
              v-if="row.status === 'Failed' || row.status === 'Pending'"
              type="success" 
              size="small" 
              @click="resendMessage(row)"
            >
              Resend
            </el-button>
            <el-button type="danger" size="small" @click="deleteRecord(row)">
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
    
    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="Message Sending Details"
      width="700px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Message ID">{{ currentRecord.id }}</el-descriptions-item>
        <el-descriptions-item label="Title">{{ currentRecord.title }}</el-descriptions-item>
        <el-descriptions-item label="Content">{{ currentRecord.content }}</el-descriptions-item>
        <el-descriptions-item label="Source System">{{ currentRecord.sourceSystem }}</el-descriptions-item>
        <el-descriptions-item label="Type">{{ currentRecord.messageType }}</el-descriptions-item>
        <el-descriptions-item label="Template ID">{{ currentRecord.templateId }}</el-descriptions-item>
        <el-descriptions-item label="Variables">
          <pre class="json-code">{{ currentRecord.variables }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="Recipients">
          <el-tag 
            v-for="recipient in currentRecord.recipients" 
            :key="recipient.id"
            class="recipient-tag"
            type="info"
          >
            {{ recipient.name }} ({{ recipient.type }})
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Distribution Channels">
          <el-tag 
            v-for="channel in currentRecord.channels" 
            :key="channel.id"
            class="channel-tag"
            type="success"
          >
            {{ channel.name }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Sending Status">{{ currentRecord.status }}</el-descriptions-item>
        <el-descriptions-item label="Creation Time">{{ currentRecord.createTime }}</el-descriptions-item>
        <el-descriptions-item label="Send Time">{{ currentRecord.sendTime }}</el-descriptions-item>
        <el-descriptions-item label="Retry Count">{{ currentRecord.retryCount }}</el-descriptions-item>
        <el-descriptions-item label="Fail Reason">{{ currentRecord.failReason }}</el-descriptions-item>
        <el-descriptions-item label="Priority">
          {{ currentRecord.priority === 0 ? 'High' : currentRecord.priority === 1 ? 'Medium' : 'Low' }}
        </el-descriptions-item>
        <el-descriptions-item label="Scheduled Time">{{ currentRecord.scheduledTime }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">Close</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.message-records-container {
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

.json-code {
  margin: 0;
  background-color: #f8f8f8;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

.recipient-tag,
.channel-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

@media (max-width: 768px) {
  .el-form-item {
    margin-right: 0;
  }
}
</style> 