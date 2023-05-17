import { defineAsyncComponent } from 'vue'

export const defaultConfig = {
  plugins: {
    legend: {
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
    tooltip: {
      bodyFont: {
        size: 14,
        family: 'sans-serif',
      },
      boxPadding: 4,
    },
  },
  datasets: {
    line: {
      borderColor: '#2c82e0',
      tension: 0.1
    },
    bubble: {
      borderColor: 'transparent',
    },
    bar: {
      borderColor: 'transparent',
    },
  },
  maintainAspectRatio: false,
  animation: true,
}

export const chartTypesMap = {
  pie: defineAsyncComponent(() => import('./chart-types/PieChart.vue')),
  doughnut: defineAsyncComponent(() => import('./chart-types/DoughnutChart.vue')),
  bubble: defineAsyncComponent(() => import('./chart-types/BubbleChart.vue')),
  line: defineAsyncComponent(() => import('./chart-types/LineChart.vue')),
  bar: defineAsyncComponent(() => import('./chart-types/BarChart.vue')),
  'horizontal-bar': defineAsyncComponent(() => import('./chart-types/HorizontalBarChart.vue')),
}
