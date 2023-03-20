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
}

export default new UserService()
