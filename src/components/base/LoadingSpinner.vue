<template><span class="loading-spinner" aria-hidden="true" /></template>
<style scoped>
.loading-spinner { display: inline-block; flex-shrink: 0; width: 16px; height: 16px; border: 2px solid var(--color-border-default); border-top-color: var(--color-border-focus); border-radius: 50%; animation: spinner-turn .8s linear infinite; }
@keyframes spinner-turn { to { transform: rotate(360deg); } }
</style>
