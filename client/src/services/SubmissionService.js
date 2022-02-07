import http from "../http-axios";
import store from "../store";

const base = http.base
const submission = http.submission.submission(store.getters['submission/getToken'])
submission.interceptors.response.use(undefined, function (error) {
  if (error) {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        store.dispatch('submission/showLoginModal')
    }
  }
})
class SubmissionService {
  generateXML(form) {
      return base.post("/xml", form)
    }
  getSubmissionFile(value) {
    return base.get(`/xml/${value}`)
  }
  parseExcel(formData) {
    return base.post('/excel',formData)
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
    return submission.put(`/organismis/${accession}`,formData)
  }
  deleteSamples(samples){
    return submission.delete('/organisms', samples)
  }

}

export default new SubmissionService();
