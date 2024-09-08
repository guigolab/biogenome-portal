import { ChartType } from '../../data/types';


const colors = [
    '#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec', '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff',
    '#c9cbcf', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#1abc9c', '#9b59b6', '#34495e', '#95a5a6',
    '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#f39c12', '#d35400', '#2c3e50', '#bdc3c7', '#7f8c8d', '#e74c3c',
    '#2980b9', '#f1c40f', '#2ecc71', '#9b59b6'
];

export function processChartData(data: Record<string, number>, label: string) {
    const orderedValues = Object.fromEntries(Object.entries(data).sort(([, v], [, v1]) => v - v1));
    return {
        labels: Object.keys(orderedValues),
        datasets: [
            {
                label,
                backgroundColor: colors,
                data: Object.values(orderedValues),
            },
        ],
    };
}

export function getChartOptions(type: ChartType, total: number) {
    let legend
    let datalabels
    let scales
    if (type === 'pie') {
        legend = {
            position: 'bottom',
            labels: {
                font: {
                    color: '#34495e',
                    family: 'sans-serif',
                    size: 14,
                },
                usePointStyle: true,
            },
        },
            datalabels = {
                display: 'auto',
                font: {
                    size: 18
                }
            }
    } else {
        legend = {
            display: false
        }
        scales = {
            x: { type: 'category' },
            y: { display: false },
        }
    }
    return {
        scales,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend, datalabels,
            tooltip: {
                callbacks: {
                    footer: () => 'Total: ' + total
                }
            }
        },
        datasets: {
            bar: {
                borderColor: 'transparent',
            },
        },
        maintainAspectRatio: false,
    };
}
