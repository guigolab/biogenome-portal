const axios = require('axios')

const baseURL = process.env.BASE_URL + "api"
const base = axios.create({
  baseURL:baseURL,
  headers: {
    "Content-type": "application/json"
  }
});
const submitInstance = axios.create({
  baseURL:baseURL
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
  ena: ena
}
