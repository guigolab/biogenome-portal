import { ref, reactive } from 'vue';
import { useItemStore } from '../stores/items-store';
import filtersConfig from '../../configs/filters.json';
import { ConfigFilter } from '../data/types';

interface ResultStructure {
    [key: string]: {
        [innerKey: string]: number;
    };
}

interface DataStructure {
    [key: string]: ConfigFilter[];
}

const configs = filtersConfig as DataStructure

export function useFilters() {
    const itemStore = useItemStore();
    const currentFilters = ref<ConfigFilter[]>([]);

    //store select values frequencies
    const initFreq: ResultStructure = Object.keys(filtersConfig).reduce((acc: ResultStructure, key: string) => {
        // Filter out items with type 'select'
        const selects = configs[key].filter((item: ConfigFilter) => item.type === 'select');

        if (selects.length > 0) {
            // Create a sub-object with the 'key' mapped to 0
            acc[key] = selects.reduce((subAcc: { [innerKey: string]: number }, item: ConfigFilter) => {
                subAcc[item.key] = 0;
                return subAcc;
            }, {});
        }

        return acc;
    }, {});

    const frequencies = reactive<Record<string, any>>({ ...initFreq })

    async function createFilters(model: keyof typeof filtersConfig) {
        const filters = filtersConfig[model] as ConfigFilter[];

        if (!filters) return

        currentFilters.value = [...filters]

        await fetchFrequencies(model);
    }

    async function fetchFrequencies(model: keyof typeof filtersConfig) {

        const selectFields = currentFilters.value
            .filter((field: ConfigFilter) => field.type === 'select')
            .map((field: ConfigFilter) => field.key);
        for (const field of selectFields) {
            const data = await itemStore.getStats(model, field);
            frequencies[model][field] = { ...data };
        }
    }

    return { currentFilters, frequencies, fetchFrequencies, createFilters };
}
