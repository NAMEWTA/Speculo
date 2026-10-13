<script setup lang="ts">
import { computed, ref } from 'vue'
const props = defineProps<{ title: string }>()
const count = ref(0)
const label = computed(() => `${props.title}: ${count.value}`)
</script>
<template><button type="button" @click="count++">{{ label }}</button></template>
