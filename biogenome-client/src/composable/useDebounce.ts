export function useDebounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(async () => {
                const result = await fn(...args);
                resolve(result);
            }, delay);
        });
    };
} 