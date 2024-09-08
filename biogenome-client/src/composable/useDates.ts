


export function useDateMapper(storeFormSearch: Record<string, any>) {
    const dates = {} as Record<string, any>;

    Object.entries(storeFormSearch)
        .filter(([k]) => k.includes('__gte') || k.includes('__lte'))
        .forEach(([k, v]) => {
            const key = k.replace(/__(gte|lte)$/, '');
            const type = k.includes('__gte') ? 'start' : 'end';
            const formattedDate = v ? new Date(v) : null;
            dates[key] = { ...dates[key], [type]: formattedDate };
        });

    return dates;
}
