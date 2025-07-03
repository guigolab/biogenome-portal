import { AxiosInstance } from 'axios';
import { submission } from '../http-axios';
import { DataModels } from '../data/types';
import { useGlobalStore } from '../stores/global-store';
import router from '../router';
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
  (error: any) => {
    return Promise.reject(error);
  }
);

// Track if we're already handling a 401 error to prevent multiple redirects
let isHandling401 = false

submission.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('Response interceptor error:', error)
    
    if (error.response && error.response.status === 401 && !isHandling401) {
      isHandling401 = true
      
      const gStore = useGlobalStore()
      gStore.setAuth(false)
      
      // Clear any existing auth data
      gStore.userName = ''
      gStore.userRole = ''
      gStore.userSpecies = []
      
      // Only redirect if not already on login page
      if (router.currentRoute.value.name !== 'login') {
        router.push('/login').finally(() => {
          isHandling401 = false
        })
      } else {
        isHandling401 = false
      }
    }
    
    return Promise.reject(error)
  }
)

// Define data structures for better typing (adjust as needed)
interface LoginPayload {
  name: string;
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
    return this.submission.post('/local_samples/upload', formData, {
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
  getSubProjects(params: Record<string, any>) {
    return this.submission.get('/sub_projects', { params })
  }
  createSubProject(data: FormData) {
    return this.submission.post('/sub_projects', data)
  }
  getSubProject(name: string) {
    return this.submission.get(`/sub_projects/${name}`)
  }
  updateSubProject(name: string) {
    return this.submission.put(`/sub_projects/${name}`)
  }
  updateSubProjectSpecies(name: string) {
    return this.submission.put(`/sub_projects/${name}/species`)
  }
  updateSubProjectUsers(name: string) {
    return this.submission.put(`/sub_projects/${name}/users`)
  }
  deletSubProject(name: string) {
    return this.submission.delete(`/sub_projects/${name}`)
  }
  getUsers(params: Record<string, any>) {
    return this.submission.get('/users', { params });
  }
  getUserRelatedData(name: string) {
    return this.submission.get(`/users/${name}/lookup`)
  }
  deleteUser(name: string) {
    return this.submission.delete(`/users/${name}`);
  }

  getUser(name: string) {
    return this.submission.get(`/users/${name}`);
  }
  // hanldeOrganismToUser(name: string, taxid: string, operation: 'add' | 'remove') {
  //   return this.submission.patch(`/users/${name}/organisms/${taxid}`, { params: { operation } })
  // }
  updateUser(name: string, data: FormData) {
    return this.submission.put(`/users/${name}`, data);
  }

  getUserSpecies(name: string, params: UserParams) {
    return this.submission.get(`/users/${name}/organisms`, { params });
  }

  getUserSamples(name: string, params: UserParams) {
    return this.submission.get(`/users/${name}/local_samples`, { params });
  }
  createOrganismToDeleteRequest(taxid: string) {
    return this.submission.post(`/organism_deletion_requests/${taxid}`)
  }
  getOrganismsToDelete(params: Record<string, any>) {
    return this.submission.get('/organism_deletion_requests', { params })
  }
  deleteOrganismsToDeleteRequest(taxid: string) {
    return this.submission.delete(`organism_deletion_requests/${taxid}`)
  }
}

export default new AuthService(submission);
