<template>
    <h4 class="va-h4">
        {{ counter }}
    </h4>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
    targetValue: number,
    duration: number
}>()

const counter = ref(0)

onMounted(() => {
    animateCounter()
})

function animateCounter() {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime < props.duration) {
            counter.value = Math.min(
                Math.round((elapsedTime / props.duration) * props.targetValue),
                props.targetValue
            );
            requestAnimationFrame(animate);
        } else {
            counter.value = props.targetValue;
        }
    };
    requestAnimationFrame(animate);
}
</script>
