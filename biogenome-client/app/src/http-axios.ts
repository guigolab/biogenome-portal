import axios from 'axios'

const baseURL = import.meta.env.VITE_API_PATH ? import.meta.env.VITE_API_PATH + '/api' : '/api'

export const base = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-type': 'application/json',
  },
})

export const download = axios.create({
  baseURL: baseURL,
  responseType: 'blob'
})

export const ncbi = axios.create({
  baseURL: 'https://api.ncbi.nlm.nih.gov/datasets/v2',
  headers: {
    'Content-type': 'application/json',
  },
})

export const wikipedia = (lang:string) =>  axios.create({
  baseURL: `https://${lang}.m.wikipedia.org/api/rest_v1/page/summary`,
  headers: {
    'Content-type': 'application/json',
  },
})

export const ena = {
  enaApi: axios.create({
    baseURL: 'https://www.ebi.ac.uk',
  })
}
