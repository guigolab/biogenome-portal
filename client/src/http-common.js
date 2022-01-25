import axios from "axios";

const base = axios.create({
  baseURL: process.env.BASE_URL + "api",
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
  ena: ena,
  base: base
}
