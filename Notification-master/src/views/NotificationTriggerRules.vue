<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useTriggerRuleStore, useTemplateStore, useChannelStore } from '@/stores'
import {
  Plus,
  Delete,
  Search,
  Edit,
  Check,
  Close,
  Download
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const triggerRuleStore = useTriggerRuleStore()
const templateStore = useTemplateStore()
const channelStore = useChannelStore()

// 触发规则列表
const triggerRules = computed(() => triggerRuleStore.triggerRules)
// 模板列表
const templates = computed(() => templateStore.templates)
// 通知渠道列表
const channels = computed(() => channelStore.channels)

// 表格加载状态
const tableLoading = ref(false)
// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: 'all'
})

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)

// 选中的记录
const selectedRecords = ref([])

// 详情对话框
const detailDialogVisible = ref(false)
const currentRule = reactive({
  id: '',
  name: '',
  code: '',
  description: '',
  conditions: [],
  associatedTemplates: [],
  channels: [],
  status: 'inactive',
  createdBy: '',
  createdTime: '',
  updatedTime: ''
})

// 编辑对话框
const editDialogVisible = ref(false)

// 条件类型选项
const conditionTypeOptions = [
  { value: 'system_disconnected', label: 'System Disconnected' },
  { value: 'voltage_dip_detected', label: 'Voltage Dip Detected' },
  { value: 'cpu_usage', label: 'CPU Usage (%)' },
  { value: 'memory_usage', label: 'Memory Usage (%)' },
  { value: 'disk_usage', label: 'Disk Usage (%)' },
  { value: 'network_error', label: 'Network Error' },
  { value: 'affected_customers', label: 'Affected Customers Count' }
]

// 操作符选项
const operatorOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_equal', label: 'Greater or Equal' },
  { value: 'less_equal', label: 'Less or Equal' }
]

// 状态选项
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

// 条件编辑相关
const conditionDialogVisible = ref(false)
const currentCondition = ref({
  type: '',
  threshold: null,
  operator: 'greater_than'
})
const currentConditionIndex = ref(-1)

// 筛选后的数据
const filteredData = computed(() => {
  let result = [...triggerRules.value]

  // 关键字搜索
  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    result = result.filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选
  if (searchForm.status !== 'all') {
    result = result.filter(item => item.status === searchForm.status)
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
  Object.assign(currentRule, row)
  detailDialogVisible.value = true
}

// 激活规则
const activateRule = (row) => {
  ElMessageBox.confirm(
    `Confirm to activate trigger rule "${row.name}"？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    triggerRuleStore.activateTriggerRule(row.id)
    ElMessage.success('Rule activated')
  }).catch(() => {})
}

// 停用规则
const deactivateRule = (row) => {
  ElMessageBox.confirm(
    `Confirm to deactivate trigger rule "${row.name}"？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(() => {
    triggerRuleStore.deactivateTriggerRule(row.id)
    ElMessage.success('Rule deactivated')
  }).catch(() => {})
}

// 删除规则
const deleteRule = (row) => {
  ElMessageBox.confirm(
    `Confirm to delete trigger rule "${row.name}"？`,
    'Warning',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'danger'
    }
  ).then(() => {
    triggerRuleStore.deleteTriggerRule(row.id)
    ElMessage.success('Rule deleted')
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
    selectedRecords.value.forEach(id => {
      triggerRuleStore.deleteTriggerRule(id)
    })
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
    status: 'all'
  })
}

// 导出规则
const exportRules = () => {
  ElMessage.success('Exporting to Excel file')
}

// 打开添加对话框
const openAddDialog = () => {
  Object.assign(currentRule, {
    id: '',
    name: '',
    code: '',
    description: '',
    conditions: [],
    associatedTemplates: [],
    channels: [],
    status: 'inactive',
    createdBy: 'current_user',
    createdTime: new Date().toISOString(),
    updatedTime: new Date().toISOString()
  })
  editDialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (row) => {
  Object.assign(currentRule, JSON.parse(JSON.stringify(row)))
  editDialogVisible.value = true
}

// 保存规则
const saveRule = () => {
  if (!currentRule.name || !currentRule.code) {
    ElMessage.warning('Please fill in required fields')
    return
  }

  if (currentRule.conditions.length === 0) {
    ElMessage.warning('Please add at least one condition')
    return
  }

  if (currentRule.id) {
    triggerRuleStore.updateTriggerRule(currentRule.id, currentRule)
    ElMessage.success('Rule updated')
  } else {
    triggerRuleStore.addTriggerRule(currentRule)
    ElMessage.success('Rule added')
  }

  editDialogVisible.value = false
}

// 打开添加条件对话框
const openAddConditionDialog = () => {
  currentConditionIndex.value = -1
  currentCondition.value = {
    type: '',
    threshold: null,
    operator: 'greater_than'
  }
  conditionDialogVisible.value = true
}

// 编辑条件
const editCondition = (index) => {
  currentConditionIndex.value = index
  currentCondition.value = JSON.parse(JSON.stringify(currentRule.conditions[index]))
  conditionDialogVisible.value = true
}

// 删除条件
const deleteCondition = (index) => {
  currentRule.conditions.splice(index, 1)
  ElMessage.success('Condition deleted')
}

// 保存条件
const saveCondition = () => {
  if (!currentCondition.value.type) {
    ElMessage.warning('Please select condition type')
    return
  }

  if (currentConditionIndex.value === -1) {
    currentRule.conditions.push(JSON.parse(JSON.stringify(currentCondition.value)))
  } else {
    currentRule.conditions[currentConditionIndex.value] = JSON.parse(JSON.stringify(currentCondition.value))
  }

  conditionDialogVisible.value = false
  ElMessage.success('Condition saved')
}

// 获取状态标签类型
function getStatusType(status) {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'info'
    default: return 'info'
  }
}

// 获取状态名称
function getStatusName(status) {
  const statusOption = statusOptions.find(s => s.value === status)
  return statusOption ? statusOption.label : status
}

// 获取条件类型名称
function getConditionTypeName(type) {
  const option = conditionTypeOptions.find(c => c.value === type)
  return option ? option.label : type
}

// 获取操作符名称
function getOperatorName(operator) {
  const option = operatorOptions.find(o => o.value === operator)
  return option ? option.label : operator
}

// 获取模板名称列表
function getTemplateNames(templateIds) {
  if (!templateIds || templateIds.length === 0) return 'None'
  return templateIds.map(id => {
    const template = templates.value.find(t => t.id === id)
    return template ? template.name : `Template ${id}`
  }).join(', ')
}

// 获取渠道名称列表
function getChannelNames(channelIds) {
  if (!channelIds || channelIds.length === 0) return 'None'
  return channelIds.map(id => {
    const channel = channels.value.find(c => c.id === id)
    return channel ? channel.name : id
  }).join(', ')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}
</script>

<template>
  <div class="trigger-rules-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Notification Trigger Rules</h2>
      </el-col>
    </el-row>

    <!-- 搜索栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :model="searchForm" label-width="80px" size="default" inline>
        <el-form-item label="Keyword">
          <el-input v-model="searchForm.keyword" placeholder="Rule name/code/description" clearable />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="searchForm.status" placeholder="All" clearable>
            <el-option label="All" value="all" />
            <el-option label="Active" value="active" />
            <el-option label="Inactive" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="totalRecords = filteredData.length">Search</el-button>
          <el-button @click="resetSearch">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工具栏 -->
    <el-card shadow="hover" class="action-card">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
          <el-button type="primary" @click="openAddDialog" :icon="Plus">Add Rule</el-button>
          <el-button type="danger" @click="batchDelete" :disabled="selectedRecords.length === 0" :icon="Delete">
            Batch Delete
          </el-button>
          <el-button type="success" @click="exportRules" :icon="Download">Export Rules</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 规则列表 -->
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
        <el-table-column prop="name" label="Rule Name" min-width="180" show-overflow-tooltip />
        <el-table-column prop="code" label="Rule Code" width="120" />
        <el-table-column label="Conditions" min-width="200">
          <template #default="{ row }">
            <div v-for="(condition, index) in row.conditions" :key="index" class="condition-item">
              {{ getConditionTypeName(condition.type) }}
              <span v-if="condition.operator && condition.threshold !== null">
                {{ getOperatorName(condition.operator) }} {{ condition.threshold }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Templates" min-width="150">
          <template #default="{ row }">
            <el-tooltip
              :content="getTemplateNames(row.associatedTemplates)"
              placement="top"
              :hide-after="0"
            >
              <span>{{ row.associatedTemplates.length }} templates</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="Channels" width="100">
          <template #default="{ row }">
            <el-tooltip
              :content="getChannelNames(row.channels)"
              placement="top"
              :hide-after="0"
            >
              <span>{{ row.channels.length }} channels</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdTime" label="Created Time" width="160" />
        <el-table-column label="Action" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">Details</el-button>
            <el-button type="success" size="small" @click="openEditDialog(row)">Edit</el-button>
            <el-button
              v-if="row.status === 'inactive'"
              type="warning"
              size="small"
              @click="activateRule(row)"
            >
              Activate
            </el-button>
            <el-button
              v-else
              type="info"
              size="small"
              @click="deactivateRule(row)"
            >
              Deactivate
            </el-button>
            <el-button type="danger" size="small" @click="deleteRule(row)">Delete</el-button>
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
      title="Trigger Rule Details"
      width="700px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Rule ID">{{ currentRule.id }}</el-descriptions-item>
        <el-descriptions-item label="Rule Name">{{ currentRule.name }}</el-descriptions-item>
        <el-descriptions-item label="Rule Code">{{ currentRule.code }}</el-descriptions-item>
        <el-descriptions-item label="Description">{{ currentRule.description }}</el-descriptions-item>
        <el-descriptions-item label="Conditions">
          <div v-for="(condition, index) in currentRule.conditions" :key="index" class="condition-detail">
            {{ getConditionTypeName(condition.type) }}
            <span v-if="condition.operator && condition.threshold !== null">
              {{ getOperatorName(condition.operator) }} {{ condition.threshold }}
            </span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="Associated Templates">
          <el-tag
            v-for="templateId in currentRule.associatedTemplates"
            :key="templateId"
            class="template-tag"
            type="info"
          >
            {{ getTemplateNames([templateId]) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Channels">
          <el-tag
            v-for="channelId in currentRule.channels"
            :key="channelId"
            class="channel-tag"
            type="success"
          >
            {{ getChannelNames([channelId]) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Status">{{ getStatusName(currentRule.status) }}</el-descriptions-item>
        <el-descriptions-item label="Created By">{{ currentRule.createdBy }}</el-descriptions-item>
        <el-descriptions-item label="Created Time">{{ formatDate(currentRule.createdTime) }}</el-descriptions-item>
        <el-descriptions-item label="Updated Time">{{ formatDate(currentRule.updatedTime) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">Close</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="currentRule.id ? 'Edit Trigger Rule' : 'Add Trigger Rule'"
      width="80%"
      destroy-on-close
    >
      <el-form label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Rule Name" required>
              <el-input v-model="currentRule.name" placeholder="Enter rule name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Rule Code" required>
              <el-input v-model="currentRule.code" placeholder="Enter rule code" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Description">
              <el-input
                v-model="currentRule.description"
                type="textarea"
                :rows="3"
                placeholder="Enter rule description"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Associated Templates">
              <el-select
                v-model="currentRule.associatedTemplates"
                multiple
                placeholder="Select templates"
                style="width: 100%"
              >
                <el-option
                  v-for="template in templates"
                  :key="template.id"
                  :label="template.name"
                  :value="template.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Channels">
              <el-select
                v-model="currentRule.channels"
                multiple
                placeholder="Select channels"
                style="width: 100%"
              >
                <el-option
                  v-for="channel in channels"
                  :key="channel.id"
                  :label="channel.name"
                  :value="channel.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Conditions">
              <el-button type="primary" @click="openAddConditionDialog" :icon="Plus">Add Condition</el-button>
              <div class="conditions-list">
                <el-tag
                  v-for="(condition, index) in currentRule.conditions"
                  :key="index"
                  closable
                  @close="deleteCondition(index)"
                  class="condition-tag"
                >
                  {{ getConditionTypeName(condition.type) }}
                  <span v-if="condition.operator && condition.threshold !== null">
                    {{ getOperatorName(condition.operator) }} {{ condition.threshold }}
                  </span>
                  <el-button size="small" @click="editCondition(index)" style="margin-left: 10px">Edit</el-button>
                </el-tag>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveRule">Save</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 条件编辑对话框 -->
    <el-dialog
      v-model="conditionDialogVisible"
      :title="currentConditionIndex === -1 ? 'Add Condition' : 'Edit Condition'"
      width="500px"
      destroy-on-close
    >
      <el-form :model="currentCondition" label-width="120px">
        <el-form-item label="Condition Type" required>
          <el-select v-model="currentCondition.type" placeholder="Select condition type" style="width: 100%">
            <el-option
              v-for="type in conditionTypeOptions"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Operator" required>
          <el-select v-model="currentCondition.operator" placeholder="Select operator" style="width: 100%">
            <el-option
              v-for="op in operatorOptions"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Threshold/Value" required>
          <el-input-number
            v-model="currentCondition.threshold"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="Enter threshold value"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="conditionDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveCondition">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trigger-rules-container {
  padding: 20px;
}

.trigger-rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trigger-rules-list-card {
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

.condition-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.conditions-list {
  margin-top: 10px;
}

.condition-tag {
  margin-right: 10px;
  margin-bottom: 5px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 0 15px 15px;
}
</style>