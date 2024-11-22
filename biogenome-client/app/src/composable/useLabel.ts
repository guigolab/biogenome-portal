export function useLabel(key: string) {
    return key.includes('metadata.') ? key.split('.').pop()?.replace(/_/g, ' ') || key : key.replace(/_/g, ' ')
}