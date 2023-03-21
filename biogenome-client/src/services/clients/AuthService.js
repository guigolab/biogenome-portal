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

// auth.interceptors.response.use(
//   function (response) {
//     return response
//   },
//   async function (error) {
//     const originalRequest = error.config

//     if (401 === error.response.status) {
//       console.log('here')
//       const globalStore = useGlobalStore()
//       if(globalStore.isAuthenticated){
//         await globalStore.login()
//         return auth(originalRequest)

//       }

//     } else {
//       return Promise.reject(error)
//     }
//   },
// )

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

  deleteOrganism(taxid) {
    return auth.delete(`/organisms/${taxid}`)
  }
  importSpreadsheet(formData) {
    return auth.post('/spreadsheet_upload', formData)
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
    return auth.post(`/reads/${accession}`)
  }
  deleteRead(accession) {
    return auth.delete(`/reads/${accession}`)
  }
  createUser(data) {
    return auth.post('/users', data)
  }
  deleteUser(name) {
    return auth.delete(`/users/${name}`)
  }
  updateUser(name, data) {
    return auth.post(`/users/${name}`, data)
  }
}

export default new AuthService()
