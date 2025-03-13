import axios from 'axios'

const baseURL = import.meta.env.VITE_API_PATH ?
  import.meta.env.VITE_API_PATH : import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL + 'api' : import.meta.env.BASE_URL + '/api'

export const base = axios.create({
  baseURL,
  headers: {
    'Content-type': 'application/json',
  },
})


export const download = axios.create({
  baseURL,
  responseType: 'blob'
})

export const ncbi = axios.create({
  baseURL: 'https://api.ncbi.nlm.nih.gov/datasets/v2',
  headers: {
    'Content-type': 'application/json',
  },
})


export const ebiSubmission = axios.create({
  baseURL,
  withCredentials: true,
})

export const submission = axios.create({
  baseURL: baseURL,
  withCredentials: true,
})