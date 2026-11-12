import axios from 'axios'
import { LEAVE_REQUEST_BPMN_XML } from './definitions/leaveRequestBpmn.js'
import { OVERTIME_REQUEST_BPMN_XML } from './definitions/overtimeRequestBpmn.js'

// Flowable REST API Client
// Base URL - can be overridden via env or settings
const getBaseUrl = () => {
  if (process.env.FLOWABLE_URL) return process.env.FLOWABLE_URL
  return 'http://localhost:8080/flowable-ui/process-api'
}

// Get auth header (Basic Auth)
const getAuthHeader = (username, password) => {
  const token = Buffer.from(`${username}:${password}`).toString('base64')
  return `Basic ${token}`
}

// Create axios instance
const createClient = (username = 'admin', password = 'test') => {
  return axios.create({
    baseURL: getBaseUrl(),
    headers: {
      'Authorization': getAuthHeader(username, password),
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })
}

// Default client
export const flowableClient = createClient()

// Request interceptor to ensure dynamic base URL and credentials
flowableClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl()
  config.headers.Authorization = getAuthHeader(
    process.env.FLOWABLE_USER || 'admin',
    process.env.FLOWABLE_PASSWORD || 'test'
  )
  return config
})

// -- Process Definitions --------------------------------------------------------

export const getProcessDefinitions = async (params = {}) => {
  try {
    const response = await flowableClient.get('/repository/process-definitions', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getProcessDefinition = async (processDefinitionId) => {
  try {
    const response = await flowableClient.get(`/repository/process-definitions/${processDefinitionId}`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getProcessDefinitionBpmn = async (processDefinitionId) => {
  try {
    const response = await flowableClient.get(
      `/repository/process-definitions/${processDefinitionId}/resourcedata`,
      { responseType: 'text' }
    )
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const deployProcess = async (bpmnXml, name, key) => {
  try {
    const formData = new FormData()
    const fileName = `${(key || 'process').toLowerCase().replace(/[^a-z0-9-_]/g, '_')}.bpmn20.xml`
    const blob = new Blob([bpmnXml], { type: 'text/xml' })
    formData.append('file', blob, fileName)
    if (name) formData.append('name', name)
    if (key) formData.append('key', key)

    // Using fetch with native FormData so multipart boundary is set automatically
    const authHeader = getAuthHeader(process.env.FLOWABLE_USER || 'admin', process.env.FLOWABLE_PASSWORD || 'test')
    const response = await fetch(`${getBaseUrl()}/repository/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        success: false,
        error: data?.message || `HTTP ${response.status}: Failed to deploy to Flowable`,
        data,
      }
    }
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

// -- Process Instances ---------------------------------------------------------

export const startProcess = async (processDefinitionKey, variables = []) => {
  try {
    const payload = {
      processDefinitionKey,
      variables: variables.map(v => ({
        name: v.name,
        value: v.value,
        type: v.type || (typeof v.value === 'boolean' ? 'boolean' : typeof v.value === 'number' ? (Number.isInteger(v.value) ? 'integer' : 'double') : 'string'),
      })),
    }
    const response = await flowableClient.post('/runtime/process-instances', payload)
    return { success: true, data: response.data }
  } catch (error) {
    // If not found, try fallback key alias (LeaveRequest <-> leave-request-process)
    const fallbackKey = processDefinitionKey === 'LeaveRequest'
      ? 'leave-request-process'
      : (processDefinitionKey === 'leave-request-process' ? 'LeaveRequest' : null)

    if (fallbackKey) {
      try {
        const fallbackRes = await flowableClient.post('/runtime/process-instances', {
          processDefinitionKey: fallbackKey,
          variables: variables.map(v => ({
            name: v.name,
            value: v.value,
            type: v.type || 'string',
          })),
        })
        return { success: true, data: fallbackRes.data }
      } catch {}
    }
    return { success: false, error: error.message, data: null }
  }
}

export const getProcessInstance = async (processInstanceId) => {
  try {
    const response = await flowableClient.get(`/runtime/process-instances/${processInstanceId}`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getProcessInstances = async (params = {}) => {
  try {
    const response = await flowableClient.get('/runtime/process-instances', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const deleteProcessInstance = async (processInstanceId, deleteReason = 'Cancelled') => {
  try {
    const response = await flowableClient.delete(`/runtime/process-instances/${processInstanceId}`, {
      params: { deleteReason },
    })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

// -- Tasks ---------------------------------------------------------------------

export const getTasks = async (params = {}) => {
  try {
    const response = await flowableClient.get('/runtime/tasks', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getTask = async (taskId) => {
  try {
    const response = await flowableClient.get(`/runtime/tasks/${taskId}`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getTaskVariables = async (taskId) => {
  try {
    const response = await flowableClient.get(`/runtime/tasks/${taskId}/variables`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: [] }
  }
}

export const completeTask = async (taskId, variables = []) => {
  try {
    const payload = {
      action: 'complete',
      variables: variables.map(v => ({
        name: v.name,
        value: v.value,
        type: v.type || (typeof v.value === 'boolean' ? 'boolean' : typeof v.value === 'number' ? (Number.isInteger(v.value) ? 'integer' : 'double') : 'string'),
      })),
    }
    const response = await flowableClient.post(`/runtime/tasks/${taskId}`, payload)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const claimTask = async (taskId, userId) => {
  try {
    const response = await flowableClient.post(`/runtime/tasks/${taskId}`, {
      action: 'claim',
      assignee: userId,
    })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const unclaimTask = async (taskId) => {
  try {
    const response = await flowableClient.post(`/runtime/tasks/${taskId}`, {
      action: 'unclaim',
    })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getTaskIdentityLinks = async (taskId) => {
  try {
    const response = await flowableClient.get(`/runtime/tasks/${taskId}/identitylinks`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: [] }
  }
}

export const getTasksWithIdentityLinks = async (params = {}) => {
  const result = await getTasks(params)
  if (!result.success || !Array.isArray(result.data?.data)) {
    return result
  }
  const tasks = result.data.data
  const tasksWithLinks = await Promise.all(
    tasks.map(async (task) => {
      try {
        const linksRes = await getTaskIdentityLinks(task.id)
        const links = linksRes.success && Array.isArray(linksRes.data) ? linksRes.data : []
        const candidateGroups = links.filter((l) => l.type === 'candidate' && l.group).map((l) => l.group)
        const candidateUsers = links.filter((l) => l.type === 'candidate' && l.user).map((l) => l.user)
        return {
          ...task,
          candidateGroups,
          candidateUsers,
          identityLinks: links,
        }
      } catch {
        return { ...task, candidateGroups: [], candidateUsers: [], identityLinks: [] }
      }
    })
  )
  return {
    success: true,
    data: {
      ...result.data,
      data: tasksWithLinks,
    },
  }
}

// -- History ------------------------------------------------------------------

export const getHistoricProcessInstances = async (params = {}) => {
  try {
    const response = await flowableClient.get('/history/historic-process-instances', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getHistoricTasks = async (params = {}) => {
  try {
    const response = await flowableClient.get('/history/historic-task-instances', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getHistoricActivities = async (params = {}) => {
  try {
    const response = await flowableClient.get('/history/historic-activity-instances', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

// -- Identity -----------------------------------------------------------------

export const getUsers = async (params = {}) => {
  try {
    const response = await flowableClient.get('/identity/users', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const getGroups = async (params = {}) => {
  try {
    const response = await flowableClient.get('/identity/groups', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

// -- Form ---------------------------------------------------------------------

export const getFormData = async (taskId) => {
  try {
    const response = await flowableClient.get(`/form/form-data?taskId=${taskId}`)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const submitForm = async (formFields) => {
  try {
    const response = await flowableClient.post('/form/form-data', formFields)
    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

// Ensure LeaveRequest process is deployed in Flowable
export const ensureLeaveProcessDeployed = async () => {
  try {
    // Check if leave-request-process or LeaveRequest is already deployed
    const defsRes = await getProcessDefinitions({ key: 'leave-request-process', latest: true })
    if (defsRes.success && Array.isArray(defsRes.data?.data) && defsRes.data.data.length > 0) {
      return { success: true, message: 'Process already deployed', data: defsRes.data.data[0] }
    }
    const defsLegacyRes = await getProcessDefinitions({ key: 'LeaveRequest', latest: true })
    if (defsLegacyRes.success && Array.isArray(defsLegacyRes.data?.data) && defsLegacyRes.data.data.length > 0) {
      return { success: true, message: 'Process already deployed', data: defsLegacyRes.data.data[0] }
    }

    // Deploy the standard process BPMN
    const deployRes = await deployProcess(LEAVE_REQUEST_BPMN_XML, 'Pengajuan Cuti Karyawan', 'leave-request-process')
    if (deployRes.success) {
      console.log('[Flowable Auto-Bootstrap] Successfully deployed leave-request-process definition.')
    }
    return deployRes
  } catch (err) {
    console.error('[Flowable Auto-Bootstrap error]:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Memastikan definisi proses Persetujuan Lembur (overtime-request-process) sudah ter-deploy di Flowable Engine.
 */
export const ensureOvertimeProcessDeployed = async () => {
  try {
    const defsRes = await getProcessDefinitions({ key: 'overtime-request-process', latest: true })
    if (defsRes.success && Array.isArray(defsRes.data?.data) && defsRes.data.data.length > 0) {
      return { success: true, message: 'Overtime process already deployed', data: defsRes.data.data[0] }
    }
    const defsLegacyRes = await getProcessDefinitions({ key: 'OvertimeRequest', latest: true })
    if (defsLegacyRes.success && Array.isArray(defsLegacyRes.data?.data) && defsLegacyRes.data.data.length > 0) {
      return { success: true, message: 'Overtime process already deployed', data: defsLegacyRes.data.data[0] }
    }

    const deployRes = await deployProcess(OVERTIME_REQUEST_BPMN_XML, 'Persetujuan Lembur Karyawan', 'overtime-request-process')
    if (deployRes.success) {
      console.log('[Flowable Auto-Bootstrap] Successfully deployed overtime-request-process definition.')
    }
    return deployRes
  } catch (err) {
    console.error('[Flowable Auto-Bootstrap Overtime error]:', err.message)
    return { success: false, error: err.message }
  }
}

// -- Utility ------------------------------------------------------------------
export const testConnection = async (username = 'admin', password = 'test') => {
  try {
    const client = createClient(username, password)
    const response = await client.get('/repository/process-definitions?size=1')
    return { success: true, message: 'Connection successful', data: response.data }
  } catch (error) {
    return { success: false, message: error.message, data: null }
  }
}

export default {
  // Process Definitions
  getProcessDefinitions,
  getProcessDefinition,
  getProcessDefinitionBpmn,
  deployProcess,
  
  // Process Instances
  startProcess,
  getProcessInstance,
  getProcessInstances,
  deleteProcessInstance,
  ensureLeaveProcessDeployed,
  ensureOvertimeProcessDeployed,
  
  // Tasks
  getTasks,
  getTask,
  completeTask,
  claimTask,
  unclaimTask,
  
  // History
  getHistoricProcessInstances,
  getHistoricTasks,
  
  // Identity
  getUsers,
  getGroups,
  
  // Form
  getFormData,
  submitForm,
  
  // Utility
  testConnection,
  createClient,
}