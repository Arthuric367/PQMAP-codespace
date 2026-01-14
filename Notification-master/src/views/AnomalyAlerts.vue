<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useStatisticsStore } from '@/stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const statisticsStore = useStatisticsStore()

// 加载状态
const loading = ref(false)

// 异常预警数据
const alerts = ref([])

// 预警规则表单
const ruleForm = reactive({
  name: '',
  metricType: 'failureRate', // 指标类型
  targetType: 'channel', // 目标类型（渠道、系统、消息类型）
  targetId: '', // 目标ID
  threshold: 5, // 阈值
  level: 'medium', // 预警级别
  notifyMethod: ['email'], // 通知方式
  description: '' // 描述
})

const ruleFormVisible = ref(false)
const isEdit = ref(false)
const currentRuleId = ref(null)

// 显示所有预警还是仅显示活跃预警
const showAllAlerts = ref(false)

// 筛选选项
const filterOptions = reactive({
  level: '',
  type: '',
  status: ''
})

// 指标类型选项
const metricTypeOptions = [
  { value: 'failureRate', label: 'Failure Rate', unit: '%' },
  { value: 'responseTime', label: 'Response Time', unit: 's' },
  { value: 'volumeGrowth', label: 'Volume Growth', unit: '%' },
  { value: 'unreadRate', label: 'Unread Rate', unit: '%' },
  { value: 'queueBacklog', label: 'Queue Backlog', unit: 'items' }
]

// 目标类型选项
const targetTypeOptions = [
  { value: 'channel', label: 'Channel' },
  { value: 'system', label: 'System' },
  { value: 'messageType', label: 'Message Type' }
]

// 目标选项（根据目标类型动态变化）
const targetOptions = computed(() => {
  switch(ruleForm.targetType) {
    case 'channel':
      return [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'internal', label: 'In-system' }
      ]
    case 'system':
      return [
        { value: 'pqms', label: 'PQMS' },
        { value: 'cpdis', label: 'CPDIS' },
        { value: 'uam', label: 'UAM' },
        { value: 'wis', label: 'WIS' },
        { value: 'adms', label: 'ADMS' }
      ]
    case 'messageType':
      return [
        { value: 'system', label: 'System Notification' },
        { value: 'work', label: 'Work Reminder' },
        { value: 'alert', label: 'Alert Information' },
        { value: 'meeting', label: 'Meeting Notification' },
        { value: 'operation', label: 'Operational Activity' }
      ]
    default:
      return []
  }
})

// 通知方式选项
const notifyMethodOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'internal', label: 'In-system' }
]

// 筛选后的预警列表
const filteredAlerts = computed(() => {
  let result = alerts.value
  
  if (!showAllAlerts.value) {
    result = result.filter(alert => alert.status === 'active')
  }
  
  if (filterOptions.level) {
    result = result.filter(alert => alert.level === filterOptions.level)
  }
  
  if (filterOptions.type) {
    result = result.filter(alert => alert.type === filterOptions.type)
  }
  
  if (filterOptions.status) {
    result = result.filter(alert => alert.status === filterOptions.status)
  }
  
  return result
})

// 根据预警级别获取状态类型
const getAlertType = (level) => {
  switch (level) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'info'
  }
}

// 加载预警数据
const loadAlerts = async () => {
  loading.value = true
  try {
    await statisticsStore.loadStatistics()
    alerts.value = statisticsStore.getAnomalyAlerts()
  } catch (error) {
    console.error('Failed to load alert data:', error)
    ElMessage.error('Failed to load alert data')
  } finally {
    loading.value = false
  }
}

// 解决预警
const resolveAlert = async (alertId) => {
  try {
    const result = await statisticsStore.updateAlertStatus(alertId, 'resolved')
    if (result) {
      ElMessage.success('Alert resolved')
      loadAlerts()
    }
  } catch (error) {
    console.error('Failed to resolve alert:', error)
    ElMessage.error('Failed to resolve alert')
  }
}

// 忽略预警
const ignoreAlert = async (alertId) => {
  try {
    const result = await statisticsStore.updateAlertStatus(alertId, 'ignored')
    if (result) {
      ElMessage.success('Alert ignored')
      loadAlerts()
    }
  } catch (error) {
    console.error('Failed to ignore alert:', error)
    ElMessage.error('Failed to ignore alert')
  }
}

// 打开预警规则表单
const openRuleForm = (rule = null) => {
  if (rule) {
    // 编辑模式
    Object.assign(ruleForm, rule)
    isEdit.value = true
    currentRuleId.value = rule.id
  } else {
    // 新建模式
    Object.assign(ruleForm, {
      name: '',
      metricType: 'failureRate',
      targetType: 'channel',
      targetId: '',
      threshold: 5,
      level: 'medium',
      notifyMethod: ['email'],
      description: ''
    })
    isEdit.value = false
    currentRuleId.value = null
  }
  ruleFormVisible.value = true
}

// 提交预警规则表单
const submitRuleForm = async () => {
  try {
    if (isEdit.value) {
      // 更新规则
      const result = await statisticsStore.updateAlertRule(currentRuleId.value, ruleForm)
      if (result.success) {
        ElMessage.success('Alert rule updated successfully')
      }
    } else {
      // 新增规则
      const result = await statisticsStore.addAlertRule(ruleForm)
      if (result.success) {
        ElMessage.success('Alert rule created successfully')
      }
    }
    ruleFormVisible.value = false
    loadAlerts()
  } catch (error) {
    console.error('Failed to save alert rule:', error)
    ElMessage.error('Failed to save alert rule')
  }
}

// 删除预警规则
const deleteRule = async (ruleId) => {
  try {
    await ElMessageBox.confirm('Confirm to delete alert rule？', 'Confirm', {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    
    const result = await statisticsStore.deleteAlertRule(ruleId)
    if (result.success) {
      ElMessage.success('Alert rule deleted')
      loadAlerts()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete alert rule:', error)
      ElMessage.error('Failed to delete alert rule')
    }
  }
}

// 清空所有筛选条件
const clearFilters = () => {
  filterOptions.level = ''
  filterOptions.type = ''
  filterOptions.status = ''
}

// 初始化
onMounted(() => {
  loadAlerts()
})
</script>

<template>
  <div class="anomaly-alerts-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">Abnormal Data Alert</h2>
      </el-col>
    </el-row>
    
    <!-- 操作栏 -->
    <el-row :gutter="20" class="operation-bar">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <el-card shadow="never">
          <div class="operation-container">
            <div class="left-operations">
              <el-button type="primary" @click="openRuleForm()" :icon="Plus">
                Add Alert Rule
              </el-button>
              <el-button @click="loadAlerts()" :loading="loading" :icon="Refresh">
                Refresh
              </el-button>
            </div>
            <div class="filter-container">
              <el-select v-model="filterOptions.level" placeholder="Alert Level" clearable>
                <el-option label="High" value="high" />
                <el-option label="Medium" value="medium" />
                <el-option label="Low" value="low" />
              </el-select>
              <el-select v-model="filterOptions.type" placeholder="Alert Type" clearable>
                <el-option label="Channel" value="channel" />
                <el-option label="System" value="system" />
                <el-option label="Message Type" value="messageType" />
              </el-select>
              <el-select v-model="filterOptions.status" placeholder="Alert Status" clearable>
                <el-option label="Active" value="active" />
                <el-option label="Resolved" value="resolved" />
                <el-option label="Ignored" value="ignored" />
              </el-select>
              <el-button @click="clearFilters()" :icon="Delete">Clear</el-button>
              <el-switch
                v-model="showAllAlerts"
                active-text="Show All Alerts"
                inactive-text="Active Alerts"
                class="show-all-switch"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 预警列表 -->
    <el-row :gutter="20" class="alert-list">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <el-card shadow="hover" v-if="loading">
          <div class="loading-container">
            <el-skeleton :rows="5" animated />
          </div>
        </el-card>
        
        <template v-else>
          <el-empty description="No alert data" v-if="filteredAlerts.length === 0" />
          
          <el-card 
            v-for="alert in filteredAlerts" 
            :key="alert.id" 
            shadow="hover" 
            class="alert-card"
            :class="{ 'alert-resolved': alert.status === 'resolved', 'alert-ignored': alert.status === 'ignored' }"
          >
            <div class="alert-header">
              <div class="alert-title">
                <el-tag :type="getAlertType(alert.level)" effect="dark" size="small" class="alert-level-tag">
                  {{ alert.level === 'high' ? 'High' : alert.level === 'medium' ? 'Medium' : 'Low' }}
                </el-tag>
                <span>{{ alert.title }}</span>
              </div>
              <div class="alert-status">
                <el-tag 
                  :type="alert.status === 'active' ? 'danger' : alert.status === 'resolved' ? 'success' : 'info'"
                  size="small"
                >
                  {{ alert.status === 'active' ? 'Active' : alert.status === 'resolved' ? 'Resolved' : 'Ignored' }}
                </el-tag>
              </div>
            </div>
            
            <div class="alert-content">
              <p class="alert-description">{{ alert.description }}</p>
              <div class="alert-meta">
                <div class="alert-type">
                  <span class="meta-label">Type：</span>
                  <el-tag size="small">
                    {{ alert.type === 'channel' ? 'Channel' : alert.type === 'system' ? 'System' : 'Message Type' }}
                  </el-tag>
                </div>
                <div class="alert-metric">
                  <span class="meta-label">Index：</span>
                  <span>
                    {{ 
                      alert.metric === 'failureRate' ? 'Failure Rate' : 
                      alert.metric === 'responseTime' ? 'Response Time' : 
                      alert.metric === 'volumeGrowth' ? 'Volume Growth' : 
                      alert.metric === 'unreadRate' ? 'Unread Rate' : 
                      'Queue Backlog'
                    }}
                  </span>
                </div>
                <div class="alert-value">
                  <span class="meta-label">Current Value：</span>
                  <span class="value-text">{{ alert.value }}</span>
                  <span class="unit-text">
                    {{ 
                      alert.metric === 'failureRate' || alert.metric === 'volumeGrowth' || alert.metric === 'unreadRate' ? '%' : 
                      alert.metric === 'responseTime' ? 's' : 
                      'items'
                    }}
                  </span>
                </div>
                <div class="alert-threshold">
                  <span class="meta-label">Threshold：</span>
                  <span>{{ alert.threshold }}
                    {{ 
                      alert.metric === 'failureRate' || alert.metric === 'volumeGrowth' || alert.metric === 'unreadRate' ? '%' : 
                      alert.metric === 'responseTime' ? 's' : 
                      'items'
                    }}
                  </span>
                </div>
                <div class="alert-time">
                  <span class="meta-label">Time：</span>
                  <span>{{ alert.timestamp }}</span>
                </div>
              </div>
            </div>
            
            <div class="alert-actions" v-if="alert.status === 'active'">
              <el-button type="success" size="small" @click="resolveAlert(alert.id)">Resolved</el-button>
              <el-button type="info" size="small" @click="ignoreAlert(alert.id)">Ignored</el-button>
            </div>
          </el-card>
        </template>
      </el-col>
    </el-row>
    
    <!-- 预警规则表单对话框 -->
    <el-dialog
      v-model="ruleFormVisible"
      :title="isEdit ? 'Edit Alert Rule' : 'Add Alert Rule'"
      width="550px"
    >
      <el-form :model="ruleForm" label-width="100px" label-position="right">
        <el-form-item label="Rule Name">
          <el-input v-model="ruleForm.name" placeholder="Please input rule name" />
        </el-form-item>
        
        <el-form-item label="Rule Type">
          <el-select v-model="ruleForm.metricType" placeholder="Select rule type" class="full-width">
            <el-option
              v-for="option in metricTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <span>{{ option.label }}</span>
              <span class="option-unit">({{ option.unit }})</span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Target Type">
          <el-select v-model="ruleForm.targetType" placeholder="Select target type" class="full-width">
            <el-option
              v-for="option in targetTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Monitor Target">
          <el-select v-model="ruleForm.targetId" placeholder="Select monitor target" class="full-width">
            <el-option
              v-for="option in targetOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Alert threshold">
          <el-input-number
            v-model="ruleForm.threshold"
            :min="0"
            :precision="2"
            :step="0.5"
            class="full-width"
          />
        </el-form-item>
        
        <el-form-item label="Alert Level">
          <el-radio-group v-model="ruleForm.level">
            <el-radio label="high">High</el-radio>
            <el-radio label="medium">Medium</el-radio>
            <el-radio label="low">Low</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="Noti Method">
          <el-checkbox-group v-model="ruleForm.notifyMethod">
            <el-checkbox v-for="option in notifyMethodOptions" :key="option.value" :label="option.value">
              {{ option.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="Rule Description">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            :rows="3"
            placeholder="Please input rule description"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="ruleFormVisible = false">Cancel</el-button>
          <el-button type="primary" @click="submitRuleForm">Confirm</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.anomaly-alerts-container {
  padding-bottom: 20px;
}

.page-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.operation-bar {
  margin-bottom: 20px;
}

.operation-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.left-operations {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.filter-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.show-all-switch {
  margin-left: 10px;
}

.alert-list {
  margin-top: 20px;
}

.alert-card {
  margin-bottom: 15px;
}

.alert-resolved {
  opacity: 0.7;
}

.alert-ignored {
  opacity: 0.6;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.alert-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.alert-level-tag {
  margin-right: 10px;
}

.alert-description {
  margin-top: 0;
  margin-bottom: 15px;
  color: #606266;
}

.alert-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  color: #909399;
  font-size: 14px;
}

.meta-label {
  font-weight: 600;
  margin-right: 5px;
}

.value-text {
  font-weight: 600;
  color: #F56C6C;
}

.alert-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.loading-container {
  padding: 20px;
}

.full-width {
  width: 100%;
}

.option-unit {
  color: #909399;
  margin-left: 5px;
}

@media (max-width: 768px) {
  .operation-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-container {
    margin-top: 10px;
    width: 100%;
  }
  
  .alert-meta {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 