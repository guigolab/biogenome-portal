import http from '../../http-axios'

const base = http.base

class UserService {
  getUsers(params) {
    return base.get('/users', {
      params: params,
    })
  }

  getUser(name) {
    return base.get(`/users/${name}`)
  }

  createUser(data) {
    return base.post('/users', data)
  }

  deleteUser(name) {
    return base.delete(`/users/${name}`)
  }

  updateUser(name, data) {
    return base.post(`/users/${name}`, data)
  }
}

export default new UserService()
