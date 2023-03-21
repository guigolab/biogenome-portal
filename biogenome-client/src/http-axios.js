import axios from 'axios'

const baseURL = import.meta.env.VITE_BASE_PATH? import.meta.env.VITE_BASE_PATH + 'api' : 'http://localhost:91/api'

const base = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-type': 'application/json',
  },
})

const download =  axios.create({
  baseURL: baseURL,
  responseType: 'blob'
})

const submitInstance = axios.create({
  baseURL: baseURL,
  // withCredentials:true,
  headers: {
    'Content-type': 'application/json',
  },
})

const ncbi = axios.create({
  baseURL: 'https://api.ncbi.nlm.nih.gov/datasets/v1',
  headers: {
    'Content-type': 'application/json',
  },
})

const ena = {
  enaApi: axios.create({
    baseURL: 'https://www.ebi.ac.uk',
  }),

  submitXML(url, formData, auth) {
    return axios.post(url, formData, {
      auth: {
        username: auth.user,
        password: auth.password,
      },
    })
  },
}

export default {
  submission: submitInstance,
  base: base,
  ena: ena,
  ncbi: ncbi,
  download:download
}
