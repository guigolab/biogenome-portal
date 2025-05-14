import { EBISample } from '../data/types';
import { ebiSubmission } from '../http-axios';

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts && parts.length === 2) return parts.pop()?.split(';').shift();
}

// Add request interceptor for CSRF handling
ebiSubmission.interceptors.request.use(
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


class EBIService {

  submitBiosample(payload: EBISample) {
    return ebiSubmission.post('/biosamples/submit', payload)
  }
  getSubmittedBioSamples(query: Record<string, any>) {
    return ebiSubmission.get('/biosamples/submit', { params: query })
  }
  getSubmittedBioSample(accession: string) {
    return ebiSubmission.get(`/biosamples/submit/${accession}`)
  }
  updateSubmittedBioSample(accession: string, payload: EBISample) {
    return ebiSubmission.get(`/biosamples/submit/${accession}`, payload)
  }
}

export default new EBIService();
