import http from "../http-common";

const base = http.base
const ena = http.ena

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
  submitSamples(url, formData, auth){
    return ena.submitXML(url,formData,auth)
  }
  login(formData){
    return base.post('/login',formData)
  }
  createSample(formData, token){
    return base.put('/organisms', formData, {
        headers: {
          Authorization: `Bearer ${token}` 
        }
    })
  }
  updateSample(accession, token){
    return base.put(`/organisms/${accession}`, {
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      }
    )
  }

}

export default new SubmissionService();
