<template>
    <div :class="[customClass]" style="margin: 0;">
        {{ counter }}
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
    targetValue: number,
    duration: number,
    customClass?: string
}>(), {
    customClass: 'va-h4'
})

const counter = ref(0)

watch(() => props.targetValue, () => {
    counter.value = 0
    animateCounter()
}, {immediate: true})

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
