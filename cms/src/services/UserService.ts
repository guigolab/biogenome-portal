import { AxiosInstance } from 'axios';
import { base } from '../http-axios';

// Define the type for user query parameters (adjust as needed)
interface UserParams {
  [key: string]: any; // Replace `any` with a more specific type if known
}

class UserService {
  private base: AxiosInstance;

  constructor(baseInstance: AxiosInstance) {
    this.base = baseInstance;
  }

  getUsers(params: UserParams) {
    return this.base.get('/users', { params });
  }

  getUser(name: string) {
    return this.base.get(`/users/${name}`);
  }
}

export default new UserService(base);
