import http from "../http-axios"
// import store from "../store"

const base = http.base
const submission = http.submission
// const download = http.download

// download.interceptors.response.use(undefined, (error) => {
//   if (error) {
//     // const originalRequest = error.config;
//     if (error.response.status === 401) {
//         store.dispatch('submission/showLoginModal')
//     }
//     return Promise.reject(error)
//   }
// })
// download.interceptors.request.use(
//   (config) => {
//   const token = localStorage.getItem('token') || null
//   config.headers = {
//     'Authorization': `Bearer ${token}`,
//     'Content-Type': 'application/json'
//   }
//   return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   }
// )

// submission.interceptors.response.use(undefined, (error) => {
//   if (error) {
//     // const originalRequest = error.config;
//     if (error.response.status === 401) {
//         store.dispatch('submission/showLoginModal')
//     }
//     return Promise.reject(error)
//   }
// })
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
submission.interceptors.request.use(
  (config) => {
  config.headers = {
    'X-CSRF-TOKEN': getCookie('csrf_access_token'),
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
  logout(){
    return submission.get('/logout')
  }
  createOrganism(formData){
    return submission.post('/organisms', formData)
  }
  //user CRUD
  getUsers(params){
    return submission.get('/users',{params:params})
  }

  createUser(formData){
    return submission.post('/users',formData)
  }

  updateUser(formData, name){
    return submission.put(`/users/${name}`,formData)
  }
  
  deleteUser(name){
    return submission.delete(`/users/${name}`)
  }

  
  //local sample CRUD
  getSamples(params){} // get samples, validated and not
  importSamples(formData){} // import samples from spreadsheet
  createSample(formData){}
  updateSample(id){}
  deleteSample(id){}



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
  updateOrganism(taxid, formData){
    return submission.put(`/organisms/${taxid}`, formData)
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

  createAssemblyTrack(formData,accession){
      return submission.post(`/assemblies/${accession}`,formData)
  }

  deleteAnnotation(name){
    return submission.delete(`/annotations/${name}`)
  }

  /*
    submit samples
    CRUD local sample
    import biosample/delete biosample
    CRUD organism
    import assembly/delete assembly/create assembly track
    import experiments/delete experiments
    CRUD annotation
    
  */

}

export default new SubmissionService();
