import axios from "axios";

const baseURL = process.env.BASE_URL + "api"
const base = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-type": "application/json"
  }
});

const submission = {
  submission(token){
    return axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }
}

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
  submission: submission,
  base: base,
  ena: ena
}
