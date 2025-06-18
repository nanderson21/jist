<template>
  <div class="media-timeline p-4">
    <div class="text-center text-muted-foreground">
      <div class="text-lg mb-2">📅 Timeline View</div>
      <div class="text-sm">Timeline view coming soon...</div>
      <div class="mt-4 text-xs">
        This will show media organized by capture date and time
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaGroup } from '@/composables/useMediaRepresentations'

interface Props {
  groups: MediaGroup[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select': [group: MediaGroup]
  'tag-click': [tag: string]
}>()
</script>