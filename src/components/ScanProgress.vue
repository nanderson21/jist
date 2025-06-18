<template>
  <div class="scan-progress">
    <div class="flex items-center gap-3">
      <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
      <div class="flex-1">
        <div class="text-sm font-medium truncate">Scanning: {{ currentPath }}</div>
        <div class="text-xs text-muted-foreground">
          {{ fileCount }} files • {{ folderCount }} folders found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentPath: string
  fileCount: number
  folderCount: number
  scanTree?: FileNode | null // Optional since we're not using it anymore
}

defineProps<Props>()
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.scanning-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}
</style>