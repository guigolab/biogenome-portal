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

}

export default new SubmissionService();
