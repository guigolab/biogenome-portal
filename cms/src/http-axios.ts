import axios from 'axios'

const baseURL = import.meta.env.VITE_API_PATH ? import.meta.env.VITE_API_PATH + '/api' : '/api'

export const download = axios.create({
  baseURL: baseURL,
  responseType: 'blob'
})

export const base = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-type': 'application/json',
  },
})

export const ena = axios.create({
  baseURL: 'https://www.ebi.ac.uk',
  headers: {
    'Content-type': 'application/json',
  },
})

export const submission = axios.create({
  baseURL: baseURL,
  withCredentials: true,

})

