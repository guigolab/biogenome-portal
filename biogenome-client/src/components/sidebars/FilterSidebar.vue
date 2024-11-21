<template>
    <div class="sidebar-container">
        <!-- Overlay -->
        <transition name="fade">
            <div v-if="itemStore.showFilters" class="overlay" @click="itemStore.showFilters = !itemStore.showFilters">
            </div>
        </transition>
        <!-- Sidebar -->
        <transition name="slide">
            <div v-if="itemStore.showFilters" class="sidebar">
                <slot></slot>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { useItemStore } from '../../stores/items-store';

const itemStore = useItemStore()


</script>
<style scoped>
/* Container Styling */
.sidebar-container {
    position: relative;
    z-index: 1000;
}

/* Overlay Styling */
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1001;
}

/* Sidebar Styling */
.sidebar {
    position: fixed;
    top: 70px;
    left: 0;
    /* Changed from right: 0 to left: 0 */
    width: 30rem;
    height: 100vh;
    background-color: #f4f4f4;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
    /* Shadow to the right */
    padding: 20px;
    overflow-y: auto;
    z-index: 1003;
}

/* Transition for Sidebar Slide from Left */
.slide-left-enter-active,
.slide-left-leave-active {
    transition: transform 0.3s ease;
}

.slide-left-enter-from {
    transform: translateX(-100%);
}

.slide-left-leave-to {
    transform: translateX(-100%);
}

/* Transition for Overlay Fade */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>u