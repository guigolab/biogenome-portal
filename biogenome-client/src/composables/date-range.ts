import { ref } from 'vue';
import { Filter,DateRange } from '../data/types';

export function useDateModelsAndLabels(props: { filters: Array<Filter>, searchForm: Record<string, any> }) {
    const dateModels = ref<Record<string, DateRange>>({});
    const dateLabels = ref<Record<string, any>>({});

    const dateInputs = props.filters.filter(f => f.key.includes('__gte') || f.key.includes('__lte'));

    dateInputs.forEach(f => {
        const indexGte = f.key.indexOf('__gte');
        const indexLte = f.key.indexOf('__lte');

        // Determine whether it's __gte or __lte and set the appropriate property accordingly
        const index = indexGte !== -1 ? indexGte : indexLte;
        const keyValue = f.key.substring(0, index);
        const startDate = props.searchForm[f.key] ? new Date(props.searchForm[f.key]) : null;
        const endDate = props.searchForm[f.key] ? new Date(props.searchForm[f.key]) : null;

        // Assign values to the dateModels and dateLabels
        if (indexGte !== -1) {
            dateModels.value[keyValue] = { start: startDate, end: dateModels.value[keyValue]?.end };
        } else {
            dateModels.value[keyValue] = { start: dateModels.value[keyValue]?.start, end: endDate };
        }

        dateLabels.value[keyValue] = f.label;
    });


    return { dateModels, dateLabels };
}
