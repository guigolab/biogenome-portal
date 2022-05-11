import http from "../utils/http-axios"
import store from "../store"

const base = http.base
const submission = http.submission
const download = http.download

download.interceptors.response.use(undefined, (error) => {
  if (error) {
    // const originalRequest = error.config;
    if (error.response.status === 401) {
        store.dispatch('submission/showLoginModal')
    }
    return Promise.reject(error)
  }
})
download.interceptors.request.use(
  (config) => {
  const token = localStorage.getItem('token') || null
  config.headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
  return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

submission.interceptors.response.use(undefined, (error) => {
  if (error) {
    // const originalRequest = error.config;
    if (error.response.status === 401) {
        store.dispatch('submission/showLoginModal')
    }
    return Promise.reject(error)
  }
})
submission.interceptors.request.use(
  (config) => {
  const token = localStorage.getItem('token') || null
  config.headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
  return config
  },
  (error) => {
    return Promise.reject(error)
  }
)
class SubmissionService {
  generateXML(form) {
      return base.post("/xml", form)
  }
  getSubmissionFile(value) {
    return base.get(`/xml/${value}`)
  }
  parseExcel(formData) {
    return submission.post('/excel',formData)
  }
  downloadExcel(){
    return download.get('/excel')
  }
  login(formData){
    return base.post('/login',formData)
  }
  deleteAll(){
    return submission.delete('/login')
  }
  createSample(formData){
    return submission.post('/organisms', formData)
  }
  insertBioSample(formData){
    return submission.post('/biosamples', formData)
  }
  getSamples(accession){
    return submission.get(`/organisms/${accession}`)
  }
  updateSample(accession, formData){
    return submission.put(`/organisms/${accession}`,formData)
  }
  updateOrganism(name, formData){
    return submission.post(`/root_organisms/${name}`, formData)
  }
  deleteSamples(params){
    return submission.delete('/organisms', {
      params:params
    })
  }
  deleteOrganisms(params){
    return submission.delete('/root_organisms', {
      params:params
    })
  }
  

}

export default new SubmissionService();
