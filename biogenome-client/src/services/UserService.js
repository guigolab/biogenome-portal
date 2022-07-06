import http from "../http-axios"

const submission = http.submission


class UserService {

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

}

export default new UserService();
