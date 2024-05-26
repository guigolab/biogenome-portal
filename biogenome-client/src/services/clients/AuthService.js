import http from '../../http-axios'

const base = http.base

const auth = http.submission

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

auth.interceptors.request.use(
  (config) => {
    config.headers = {
      'X-CSRF-TOKEN': getCookie('csrf_access_token'),
      'Content-Type': 'application/json',
    }
    config.xsrfCookieName = 'csrf_access_token'
    config.xsrfHeaderName = 'X-CSRF-TOKEN'
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)


class AuthService {
  login(payload) {
    return base.post('/login', payload)
  }
  logout() {
    return base.get('/logout')
  }
  createOrganism(formData) {
    return auth.post('/organisms', formData)
  }
  updateOrganism(taxid, formData) {
    return auth.put(`/organisms/${taxid}`, formData)
  }
  getCronjobs(){
    return auth.get('/cronjobs')
  }
  createCronjob(model){
    return auth.post(`/cronjobs/${model}`)
  }
  deleteCronjob(model){
    return auth.delete(`/cronjobs/${model}`)
  }
  deleteOrganism(taxid) {
    return auth.delete(`/organisms/${taxid}`)
  }
  importSpreadsheetStatus(id){
    return auth.get(`/spreadsheet_upload/${id}`)
  }
  importSpreadsheet(formData) {
    return auth.post('/spreadsheet_upload', formData)
  }
  importGoatReport(formData){
    return auth.post('/goat_report',formData)
  }
  importGoatReportStatus(id){
    return auth.get(`/goat_report/${id}`)
  }
  createAnnotation(formData) {
    return auth.post('/annotations', formData)
  }
  updateAnnotation(name, formData) {
    return auth.put(`/annotations/${name}`, formData)
  }
  deleteAnnotation(name) {
    return auth.delete(`/annotations/${name}`)
  }
  importAssembly(accession) {
    return auth.post(`/assemblies/${accession}`)
  }
  uploadRefNameAliases(accession, formData) {
    return auth.post(`/assemblies/${accession}/chr_aliases`,formData)
  }
  deleteAssembly(accession) {
    return auth.delete(`/assemblies/${accession}`)
  }
  importBioSample(accession) {
    return auth.post(`/biosamples/${accession}`)
  }
  deleteBioSample(accession) {
    return auth.delete(`/biosamples/${accession}`)
  }
  deleteLocalSample(local_id) {
    return auth.delete(`/local_samples/${local_id}`)
  }
  importRead(accession) {
    return auth.post(`/experiments/${accession}`)
  }
  deleteRead(accession) {
    return auth.delete(`/experiments/${accession}`)
  }
  createUser(data) {
    return auth.post('/users', data)
  }
  getUsers(){
    return auth.get('/users')
  }
  deleteUser(name) {
    return auth.delete(`/users/${name}`)
  }
  getUser(name) {
    return auth.get(`/users/${name}`)
  }
  updateUser(name, data) {
    return auth.put(`/users/${name}`, data)
  }
}

export default new AuthService()
