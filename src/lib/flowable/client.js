import axios from 'axios'

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
        type: v.type || 'string',
      })),
    }
    const response = await flowableClient.post('/runtime/process-instances', payload)
    return { success: true, data: response.data }
  } catch (error) {
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
        type: v.type || 'string',
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