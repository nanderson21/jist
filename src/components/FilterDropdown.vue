<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent"
    >
      {{ label }}
      <span v-if="modelValue.length > 0" class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
        {{ modelValue.length }}
      </span>
      <span class="text-xs">{{ isOpen ? '▲' : '▼' }}</span>
    </button>
    
    <div
      v-if="isOpen"
      class="absolute top-full mt-1 left-0 z-50 bg-background border rounded-md shadow-lg min-w-[200px] max-h-60 overflow-auto"
    >
      <div class="p-2 space-y-1">
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
        >
          <input
            type="checkbox"
            :value="option.value"
            :checked="modelValue.includes(option.value)"
            @change="handleChange(option.value, $event)"
            class="rounded"
          />
          <span class="text-sm">{{ option.label }}</span>
        </label>
      </div>
    </div>
  </div>
  
  <!-- Click outside to close -->
  <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-40"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  options: Option[]
  modelValue: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'change': [value: string[]]
}>()

const isOpen = ref(false)

function handleChange(value: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  let newValue = [...props.modelValue]
  
  if (checked) {
    if (!newValue.includes(value)) {
      newValue.push(value)
    }
  } else {
    newValue = newValue.filter(v => v !== value)
  }
  
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>