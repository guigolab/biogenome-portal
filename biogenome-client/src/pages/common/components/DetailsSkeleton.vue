<template>
    <div>
        <VaSkeleton tag="h1" variant="text" class="va-h1" />
        <VaSkeleton variant="text" :lines="1" />
        <VaDivider style="margin-top: 0;" />
        <VaSkeleton height="500px">
        </VaSkeleton>
    </div>
</template>