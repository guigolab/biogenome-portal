import { AxiosInstance } from 'axios';
import { base } from '../http-axios';
import { DataModels } from '../data/types';

// Define the type for assembly parameters (adjust as needed)
interface ItemParams {
  [key: string]: any; // Replace `any` with a specific type if known
}

class ItemsService {
  private base: AxiosInstance;

  constructor(baseInstance: AxiosInstance) {
    this.base = baseInstance;
  }

  getItems(model: DataModels, params: ItemParams) {
    return this.base.get(`/${model}`, { params });
  }

  getItem(model:DataModels, id: string) {
    return this.base.get(`/${model}/${id}`);
  }

}

export default new ItemsService(base);
