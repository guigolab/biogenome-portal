import { AxiosInstance } from 'axios';
import { submission } from '../http-axios';
import { DataModels } from '../data/types';

// Utility function to get a cookie value
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts && parts.length === 2) return parts.pop()?.split(';').shift();
}

// Add request interceptor for CSRF handling
submission.interceptors.request.use(
  (config: any) => {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['X-CSRF-TOKEN'] = getCookie('csrf_access_token') || '';
    config.xsrfCookieName = 'csrf_access_token';
    config.xsrfHeaderName = 'X-CSRF-TOKEN';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Define data structures for better typing (adjust as needed)
interface LoginPayload {
  username: string;
  password: string;
}

interface FormData {
  [key: string]: any; // Replace with specific structure if known
}

interface UserParams {
  [key: string]: any; // Replace with specific structure if known
}

class AuthService {
  private submission: AxiosInstance;

  constructor(submission: AxiosInstance) {
    this.submission = submission;
  }

  login(payload: LoginPayload) {
    return this.submission.post('/login', payload);
  }

  logout() {
    return this.submission.get('/logout');
  }

  check() {
    console.log(this.submission);
    return this.submission.get('/login');
  }

  createOrganism(formData: FormData) {
    return this.submission.post('/organisms', formData);
  }

  updateOrganism(taxid: string, formData: FormData) {
    return this.submission.put(`/organisms/${taxid}`, formData);
  }

  getCronjobs() {
    return this.submission.get('/cronjobs');
  }

  createCronjob(model: string) {
    return this.submission.post(`/cronjobs/${model}`);
  }

  deleteCronjob(model: string) {
    return this.submission.delete(`/cronjobs/${model}`);
  }
  deleteItem(model: DataModels, id: string) {
    return this.submission.delete(`/${model}/${id}`);

  }
  importSpreadsheet(formData: FormData) {
    return this.submission.post('/spreadsheet_upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
  importGoatReport(formData: FormData) {
    return this.submission.post('/goat_report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
    )
  }
  taskStatus(id: string) {
    return this.submission.get(`/tasks/${id}`);
  }
  createAnnotation(formData: FormData) {
    return this.submission.post('/annotations', formData);
  }

  updateAnnotation(name: string, formData: FormData) {
    return this.submission.put(`/annotations/${name}`, formData);
  }

  importAssembly(accession: string) {
    return this.submission.post(`/assemblies/${accession}`);
  }

  importBioSample(accession: string) {
    return this.submission.post(`/biosamples/${accession}`);
  }
  importRead(accession: string) {
    return this.submission.post(`/experiments/${accession}`);
  }

  createUser(data: FormData) {
    return this.submission.post('/users', data);
  }

  getUsers() {
    return this.submission.get('/users');
  }

  deleteUser(name: string) {
    return this.submission.delete(`/users/${name}`);
  }

  getUser(name: string) {
    return this.submission.get(`/users/${name}`);
  }

  updateUser(name: string, data: FormData) {
    return this.submission.put(`/users/${name}`, data);
  }

  getUserSpecies(name: string, params: UserParams) {
    return this.submission.get(`/users/${name}/organisms`, { params });
  }

  getUserSamples(name: string, params: UserParams) {
    return this.submission.get(`/users/${name}/local_samples`, { params });
  }
}

export default new AuthService(submission);
