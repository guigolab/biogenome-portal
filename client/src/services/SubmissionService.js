import http from "../utils/http-axios"
import store from "../store"

const base = http.base
const submission = http.submission

submission.interceptors.response.use(undefined, (error) => {
  if (error) {
    // const originalRequest = error.config;
    console.log(error.response)
    if (error.response.status === 401) {
        store.dispatch('submission/showLoginModal').then(value => {
          console.log(value)
        })
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
  // submitSamples(url, formData, auth){
  //   return ena.submitXML(url,formData,auth)
  // }
  login(formData){
    return base.post('/login',formData)
  }
  createSample(formData){
    return submission.post('/organisms', formData)
  }
  updateSample(accession, formData){
    return submission.put(`/organisms/${accession}`,formData)
  }
  deleteSamples(params){
    return submission.delete('/organisms', {
      params:params
    })
  }

}

export default new SubmissionService();
