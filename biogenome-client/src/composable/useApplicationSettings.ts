import { ref } from 'vue';
import ConfigService from '../services/ConfigService';
import { AppConfig, ConfigModel, DataModels, dataModels } from '../data/types';

const generalConfigs = ['general','ui']

export function useAppSettings() {
  const configs = ref<AppConfig | null>(null);
  const error = ref<string | null>(null);

  const fetchSettings = async () => {
    let settings
    try {
      const { data } = await ConfigService.getConfig()
      settings = { ...data }
    } catch (err) {
      error.value = (err as Error).message;
    }
    //load defaults as a fallback
    if (error.value) {
      settings = await loadJsonFiles()
    }
    const modelEntries = Object.entries(settings).filter(([k, v]) => dataModels.includes(k as DataModels))
    const configEntries = Object.entries(settings).filter(([k, v]) => generalConfigs.includes(k))
    //map settings to app configuration
    configs.value = {
      models: Object.fromEntries(modelEntries) as Record<DataModels, ConfigModel>,
      ...Object.fromEntries(configEntries) as any

    }
  };

  return {
    configs,
    error,
    fetchSettings,
  };
}


async function loadJsonFiles(): Promise<Record<string, any>> {
  // Dynamically import all JSON files in the folder
  const modules = import.meta.glob('../data/configs/*.json');
  const result: Record<string, any> = {};

  for (const [filePath, module] of Object.entries(modules)) {
    // Extract the file name without the path and extension
    const fileName = filePath.split('/').pop()?.replace('.json', '') || '';
    result[fileName] = await module();
  }

  return result;
}