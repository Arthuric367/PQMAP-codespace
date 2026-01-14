import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useSystemStore = defineStore('system', () => {
  // 状态
  const systems = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 模拟的系统对接数据
  const mockSystems = [
    { id: 1, name: 'PQMS', description: 'Power Quality Monitoring System', status: 'enabled' },
    { id: 2, name: 'CPDIS', description: 'Customer Power Disturbance Information System', status: 'enabled' },
    { id: 3, name: 'UAM', description: 'User Account Management System', status: 'enabled' },
    { id: 4, name: 'WIS', description: 'Weather Information System', status: 'enabled' },
    { id: 5, name: 'ADMS', description: 'Advanced Distribution Management System', status: 'disabled' }
  ]

  // 加载系统对接
  const loadSystems = () => {
    loading.value = true
    error.value = null
    
    // 模拟API调用
    setTimeout(() => {
      systems.value = mockSystems
      loading.value = false
    }, 300)
    
    // 实际项目中应使用axios请求
    // axios.get('/api/systems')
    //   .then(response => {
    //     systems.value = response.data
    //   })
    //   .catch(err => {
    //     error.value = err.message
    //   })
    //   .finally(() => {
    //     loading.value = false
    //   })
  }

  // 根据ID获取系统
  const getSystemById = (id) => {
    return systems.value.find(system => system.id === id)
  }

  // 获取启用的系统
  const getEnabledSystems = () => {
    return systems.value.filter(system => system.status === 'enabled')
  }

  // 添加系统
  const addSystem = (system) => {
    // 生成新ID（实际项目中应由后端生成）
    const newId = Math.max(...systems.value.map(s => s.id)) + 1
    
    const newSystem = {
      ...system,
      id: newId,
      status: system.status || 'enabled'
    }
    
    systems.value.push(newSystem)
    ElMessage.success('System added successfully')
    return newSystem
  }

  // 更新系统
  const updateSystem = (id, updatedSystem) => {
    const index = systems.value.findIndex(system => system.id === id)
    
    if (index !== -1) {
      systems.value[index] = {
        ...systems.value[index],
        ...updatedSystem
      }
      ElMessage.success('System updated successfully')
      return true
    }
    
    ElMessage.error('Cannot find the system to update')
    return false
  }

  // 删除系统
  const deleteSystem = (id) => {
    const index = systems.value.findIndex(system => system.id === id)
    
    if (index !== -1) {
      systems.value.splice(index, 1)
      ElMessage.success('System deleted successfully')
      return true
    }
    
    ElMessage.error('Cannot find the system to delete')
    return false
  }

  // 启用系统
  const enableSystem = (id) => {
    const system = getSystemById(id)
    
    if (system) {
      system.status = 'enabled'
      ElMessage.success(`${system.name} activated`)
      return true
    }
    
    ElMessage.error('Cannot find the system to enable')
    return false
  }

  // 禁用系统
  const disableSystem = (id) => {
    const system = getSystemById(id)
    
    if (system) {
      system.status = 'disabled'
      ElMessage.success(`${system.name} disabled`)
      return true
    }

    ElMessage.error('Cannot find the system to disable')
    return false
  }

  return {
    systems,
    loading,
    error,
    loadSystems,
    getSystemById,
    getEnabledSystems,
    addSystem,
    updateSystem,
    deleteSystem,
    enableSystem,
    disableSystem
  }
}) 