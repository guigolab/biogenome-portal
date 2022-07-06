import axios from 'axios'

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const baseURL = "/api"
const base = axios.create({
  baseURL:baseURL,
  headers: {
    "Content-type": "application/json"
  }
});
const submitInstance = axios.create({
  baseURL:baseURL,
})

submitInstance.interceptors.request.use(
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


const download =  axios.create({
  baseURL: process.env.BASE_URL + "api",
  responseType: 'blob'
});

const ncbi = axios.create({
  baseURL:"https://api.ncbi.nlm.nih.gov/datasets/v1",
  headers: {
    "Content-type": "application/json"
  }
})

const ena = {
  enaApi : axios.create({
  baseURL: "https://www.ebi.ac.uk"
  }),
  
  submitXML(url, formData,auth){
    return axios.post(url, formData, {
      auth: {
          username: auth.user,
          password: auth.password
      }
    })
  }
}


export default {
  submission: submitInstance,
  base: base,
  download: download,
  ena: ena,
  ncbi: ncbi

}
