<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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
    console.error('Time format conversion error:', error)
    return '00:00'
  }
}

// 系统配置
const systemSettings = ref({
  // 基本设置
  system: {
    name: 'PQMAP Notification System',
    logo: '/src/assets/logo.svg',
    description: 'A platform for centralized management and distribution of various message notifications',
    adminEmail: 'admin@example.com',
    supportPhone: '23459876',
    version: '1.0.0'
  },
  
  // 消息设置
  message: {
    defaultPriority: 5,
    maxRetryTimes: 3,
    retryInterval: 60,
    expireDays: 30,
    batchSize: 100,
    enableRealtime: true
  },
  
  // 通知设置
  notification: {
    enableWebNotification: true,
    enableEmailNotification: true,
    enableSmsNotification: true,
    dailyLimit: 1000,
    quietHoursStart: convertTimeStringToDate('22:00'),
    quietHoursEnd: convertTimeStringToDate('08:00'),
    enableQuietHours: false
  },
  
  // 存储设置
  storage: {
    archiveDays: 90,
    cleanupDays: 180,
    backupEnabled: true,
    backupCycle: 'weekly',
    backupTime: convertTimeStringToDate('03:00'),
    backupRetention: 12
  },
  
  // 安全设置
  security: {
    passwordExpireDays: 90,
    maxLoginAttempts: 5,
    lockoutMinutes: 30,
    sessionTimeout: 120,
    enableTwoFactor: false,
    ipRestriction: false,
    allowedIps: ''
  }
})

// 当前激活的标签页
const activeTab = ref('basic')

// 保存设置
const saveSettings = (section) => {
  // 转换回字符串格式用于保存
  const settingsToSave = JSON.parse(JSON.stringify(systemSettings.value))
  
  // 转换通知设置的时间
  if (section === 'Notification') {
    settingsToSave.notification.quietHoursStart = convertDateToTimeString(systemSettings.value.notification.quietHoursStart)
    settingsToSave.notification.quietHoursEnd = convertDateToTimeString(systemSettings.value.notification.quietHoursEnd)
  }
  
  // 转换存储设置的时间
  if (section === 'Save') {
    settingsToSave.storage.backupTime = convertDateToTimeString(systemSettings.value.storage.backupTime)
  }
  
  // 实际项目中应调用API保存
  console.log(`Save ${section} setting:`, settingsToSave)
  ElMessage.success(`${section} setting saved`)
}

// 重置设置
const resetSettings = (section) => {
  ElMessageBox.confirm('Confirm to restore default setting？', 'Alert', {
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    type: 'warning'
  }).then(() => {
    // 重置对应部分的设置
    if (section === 'Notification') {
      systemSettings.value.notification = {
        enableWebNotification: true,
        enableEmailNotification: true,
        enableSmsNotification: true,
        dailyLimit: 1000,
        quietHoursStart: convertTimeStringToDate('22:00'),
        quietHoursEnd: convertTimeStringToDate('08:00'),
        enableQuietHours: false
      }
    } else if (section === 'Save') {
      systemSettings.value.storage = {
        archiveDays: 90,
        cleanupDays: 180,
        backupEnabled: true,
        backupCycle: 'weekly',
        backupTime: convertTimeStringToDate('03:00'),
        backupRetention: 12
      }
    }
    
    // 实际项目中应调用API重置
    ElMessage.success(`${section} restored default setting`)
  }).catch(() => {
    // Cancel Reset
  })
}

// 加载设置
const loadSettings = () => {
  // 实际项目中应从API获取，这里模拟从API获取数据后的转换
  // 确保时间字段被转换为Date对象
  try {
    // 模拟从后端获取的数据
    const mockApiData = {
      notification: {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      },
      storage: {
        backupTime: '03:00'
      }
    }
    
    // 转换时间字符串为Date对象
    systemSettings.value.notification.quietHoursStart = convertTimeStringToDate(mockApiData.notification.quietHoursStart)
    systemSettings.value.notification.quietHoursEnd = convertTimeStringToDate(mockApiData.notification.quietHoursEnd)
    systemSettings.value.storage.backupTime = convertTimeStringToDate(mockApiData.storage.backupTime)
  } catch (error) {
    console.error('Error occurred while loading settings:', error)
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <h2 class="page-title">System Settings</h2>
      </el-col>
    </el-row>
    
    <el-card shadow="hover" class="settings-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本设置 -->
        <el-tab-pane label="Basic" name="basic">
          <el-form :model="systemSettings.system" label-width="120px">
            <el-form-item label="System Name">
              <el-input v-model="systemSettings.system.name" />
            </el-form-item>
            
            <el-form-item label="Description">
              <el-input v-model="systemSettings.system.description" type="textarea" :rows="2" />
            </el-form-item>
            
            <el-form-item label="Admin Email">
              <el-input v-model="systemSettings.system.adminEmail" />
            </el-form-item>
            
            <el-form-item label="Support Phone">
              <el-input v-model="systemSettings.system.supportPhone" />
            </el-form-item>
            
            <el-form-item label="Version">
              <el-input v-model="systemSettings.system.version" disabled />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings('Basic')">Save</el-button>
              <el-button @click="resetSettings('Basic')">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- 消息设置 -->
        <el-tab-pane label="Message" name="message">
          <el-form :model="systemSettings.message" label-width="120px">
            <el-form-item label="Default Priority">
              <el-input-number v-model="systemSettings.message.defaultPriority" :min="1" :max="10" />
              <div class="form-help">The smaller the default priority number, the higher the priority. The default is 5.</div>
            </el-form-item>
            
            <el-form-item label="Max Retry Times">
              <el-input-number v-model="systemSettings.message.maxRetryTimes" :min="0" :max="10" />
            </el-form-item>
            
            <el-form-item label="Interval(s)">
              <el-input-number v-model="systemSettings.message.retryInterval" :min="10" :max="3600" />
            </el-form-item>
            
            <el-form-item label="Message Expire Days">
              <el-input-number v-model="systemSettings.message.expireDays" :min="1" :max="365" />
              <div class="form-help">After the specified number of days following message sending, the message will be marked as expired.</div>
            </el-form-item>
            
            <el-form-item label="Batch Size">
              <el-input-number v-model="systemSettings.message.batchSize" :min="10" :max="1000" />
              <div class="form-help">The number of messages to process in a batch.</div>
            </el-form-item>
            
            <el-form-item label="Realtime">
              <el-switch v-model="systemSettings.message.enableRealtime" />
              <div class="form-help">After enabling, messages will be pushed in real time via WebSocket.</div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings('Message')">Save</el-button>
              <el-button @click="resetSettings('Message')">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- 通知设置 -->
        <el-tab-pane label="Notification" name="notification">
          <el-form :model="systemSettings.notification" label-width="120px">
            <el-form-item label="Web">
              <el-switch v-model="systemSettings.notification.enableWebNotification" />
              <div class="form-help">Once enabled, desktop notifications will appear in the browser.</div>
            </el-form-item>
            
            <el-form-item label="Email">
              <el-switch v-model="systemSettings.notification.enableEmailNotification" />
            </el-form-item>
            
            <el-form-item label="SMS">
              <el-switch v-model="systemSettings.notification.enableSmsNotification" />
            </el-form-item>
            
            <el-form-item label="Daily Limit">
              <el-input-number v-model="systemSettings.notification.dailyLimit" :min="0" :max="10000" />
              <div class="form-help">Max number of notifications sent per day; 0 means no limit.</div>
            </el-form-item>
            
            <el-form-item label="Quiet Hours">
              <div class="quiet-hours-setting">
                <el-switch v-model="systemSettings.notification.enableQuietHours" />
                <el-time-picker
                  v-model="systemSettings.notification.quietHoursStart"
                  format="HH:mm"
                  placeholder="Start Time"
                  :disabled="!systemSettings.notification.enableQuietHours"
                />
                <span class="time-separator">to</span>
                <el-time-picker
                  v-model="systemSettings.notification.quietHoursEnd"
                  format="HH:mm"
                  placeholder="End Time"
                  :disabled="!systemSettings.notification.enableQuietHours"
                />
              </div>
              <div class="form-help">Only send urgent notifications during quiet hours.</div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings('Notification')">Save</el-button>
              <el-button @click="resetSettings('Notification')">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- 存储设置 -->
        <el-tab-pane label="Storage" name="storage">
          <el-form :model="systemSettings.storage" label-width="120px">
            <el-form-item label="Archive Days">
              <el-input-number v-model="systemSettings.storage.archiveDays" :min="30" :max="365" />
              <div class="form-help">Messages older than the specified number of days will be archived.</div>
            </el-form-item>
            
            <el-form-item label="Cleanup Days">
              <el-input-number v-model="systemSettings.storage.cleanupDays" :min="90" :max="730" />
              <div class="form-help">Messages older than the specified number of days for cleanup will be permanently deleted.</div>
            </el-form-item>
            
            <el-form-item label="Backup">
              <el-switch v-model="systemSettings.storage.backupEnabled" />
            </el-form-item>
            
            <el-form-item label="Backup Cycle">
              <el-select v-model="systemSettings.storage.backupCycle" :disabled="!systemSettings.storage.backupEnabled">
                <el-option label="Daily" value="daily" />
                <el-option label="Weekly" value="weekly" />
                <el-option label="Monthly" value="monthly" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="Backup Time">
              <el-time-picker
                v-model="systemSettings.storage.backupTime"
                format="HH:mm"
                placeholder="Backup Time"
                :disabled="!systemSettings.storage.backupEnabled"
              />
            </el-form-item>
            
            <el-form-item label="Backup Retention">
              <el-input-number
                v-model="systemSettings.storage.backupRetention"
                :min="1"
                :max="100"
                :disabled="!systemSettings.storage.backupEnabled"
              />
              <div class="form-help">Number of historical backups to retain.</div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings('Storage')">Save</el-button>
              <el-button @click="resetSettings('Storage')">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- 安全设置 -->
        <el-tab-pane label="Security" name="security">
          <el-form :model="systemSettings.security" label-width="120px">
            <el-form-item label="PW Exp Days">
              <el-input-number v-model="systemSettings.security.passwordExpireDays" :min="0" :max="365" />
              <div class="form-help">Password expiration days; 0 means never expires.</div>
            </el-form-item>
            
            <el-form-item label="Max Attempts">
              <el-input-number v-model="systemSettings.security.maxLoginAttempts" :min="3" :max="10" />
            </el-form-item>
            
            <el-form-item label="Lockout(min)">
              <el-input-number v-model="systemSettings.security.lockoutMinutes" :min="5" :max="1440" />
              <div class="form-help">Unlock time after account lockout.</div>
            </el-form-item>
            
            <el-form-item label="Timeout(min)">
              <el-input-number v-model="systemSettings.security.sessionTimeout" :min="10" :max="1440" />
              <div class="form-help">Automatic logout time after user inactivity.</div>
            </el-form-item>
            
            <el-form-item label="IP Restriction">
              <el-switch v-model="systemSettings.security.ipRestriction" />
            </el-form-item>
            
            <el-form-item label="Allowed IPs" v-if="systemSettings.security.ipRestriction">
              <el-input
                v-model="systemSettings.security.allowedIps"
                type="textarea"
                :rows="3"
                placeholder="Enter the IP addresses allowed to access the system. (Use , to separate multiple IPs)"
              />
              <div class="form-help">Only the IP addresses in the list can access the system.</div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings('Security')">Save</el-button>
              <el-button @click="resetSettings('Secuity')">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.settings-container {
  padding-bottom: 20px;
}

.page-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.settings-card {
  margin-bottom: 20px;
}

.settings-card :deep(.el-card__body) {
  padding: 0;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.quiet-hours-setting {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.time-separator {
  color: #606266;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .quiet-hours-setting {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .quiet-hours-setting .el-time-picker {
    width: 100%;
    margin-top: 10px;
  }
  
  .time-separator {
    display: none;
  }
}
</style> 