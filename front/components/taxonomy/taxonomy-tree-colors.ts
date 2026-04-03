export function getTreeGeneColors(isDark: boolean) {
   return isDark
      ? {
           coding: '#38bdf8',
           non_coding: '#a3e635',
           pseudogene: '#fb923c',
        }
      : {
           coding: '#0284c7',
           non_coding: '#65a30d',
           pseudogene: '#ea580c',
        }
}

export function getTreeTranscriptColors(isDark: boolean) {
   return isDark
      ? {
           mRNA: '#22d3ee',
           lncRNA: '#c084fc',
           tRNA: '#4ade80',
           miRNA: '#f472b6',
        }
      : {
           mRNA: '#0891b2',
           lncRNA: '#7c3aed',
           tRNA: '#16a34a',
           miRNA: '#db2777',
        }
}

export function getTreeBuscoColors(isDark: boolean) {
   return isDark
      ? {
           single_copy: '#4ade80',
           duplicated: '#38bdf8',
           fragmented: '#fb923c',
           missing: '#f87171',
        }
      : {
           single_copy: '#16a34a',
           duplicated: '#0284c7',
           fragmented: '#ea580c',
           missing: '#ef4444',
        }
}

export function getCatalogOrganismColor(isDark: boolean) {
   return isDark ? '#4ade80' : '#16a34a'
}
