<template>
  <div class="asset-groups-panel">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-sm">Asset Groups</h3>
      <div class="flex items-center gap-2">
        <button
          @click="showSuggestions = !showSuggestions"
          :class="{ 'bg-accent': showSuggestions }"
          class="p-1 rounded hover:bg-accent text-xs"
          title="Show Relationship Suggestions"
        >
          💡
        </button>
        <button
          @click="createNewGroup"
          class="p-1 rounded hover:bg-accent text-xs"
          title="Create New Group"
        >
          ➕
        </button>
      </div>
    </div>

    <!-- Multi-selection Info -->
    <div v-if="selectedAssets.length > 1" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
      <div class="text-sm font-medium mb-2">
        {{ selectedAssets.length }} Assets Selected
      </div>
      
      <!-- Common Relationships -->
      <div v-if="commonRelationships.length > 0" class="space-y-2">
        <div class="text-xs text-muted-foreground">Common Relationships:</div>
        <div class="space-y-1">
          <div
            v-for="relationship in commonRelationships"
            :key="relationship.type"
            class="flex items-center justify-between text-xs"
          >
            <span class="capitalize">{{ relationship.type }}</span>
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground">{{ relationship.count }}/{{ selectedAssets.length }}</span>
              <button
                @click="applyBulkRelationship(relationship.type)"
                class="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Apply All
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Partial Suggestions -->
      <div v-if="partialSuggestions.length > 0" class="mt-3 space-y-2">
        <div class="text-xs text-muted-foreground">Partial Matches:</div>
        <div class="space-y-1">
          <div
            v-for="suggestion in partialSuggestions"
            :key="suggestion.id"
            class="flex items-center justify-between text-xs"
          >
            <span>{{ suggestion.description }}</span>
            <button
              @click="applyPartialSuggestion(suggestion)"
              class="px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Apply ({{ suggestion.affectedCount }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Single Asset Info -->
    <div v-else-if="selectedAsset" class="mb-4">
      <div class="space-y-3">
        <!-- Current Group -->
        <div v-if="currentGroup" class="p-3 bg-muted/30 rounded">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium">{{ currentGroup.baseName }}</div>
            <button
              @click="editGroup(currentGroup)"
              class="p-1 rounded hover:bg-accent text-xs"
              title="Edit Group"
            >
              ✏️
            </button>
          </div>
          
          <div class="space-y-2">
            <!-- Representations -->
            <div class="text-xs">
              <div class="text-muted-foreground mb-1">Representations:</div>
              <div class="space-y-1">
                <div
                  v-for="rep in currentGroup.representations"
                  :key="rep.asset.id"
                  class="flex items-center justify-between"
                  :class="{ 'font-medium': rep.asset.id === selectedAsset.id }"
                >
                  <span class="capitalize">{{ rep.type }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-muted-foreground">{{ rep.resolution || '—' }}</span>
                    <button
                      v-if="rep.asset.id !== selectedAsset.id"
                      @click="selectRelatedAsset(rep.asset)"
                      class="text-primary hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="currentGroup.tags.length > 0" class="text-xs">
              <div class="text-muted-foreground mb-1">Tags:</div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in currentGroup.tags.slice(0, 5)"
                  :key="tag"
                  class="px-2 py-1 bg-primary/10 text-primary rounded"
                >
                  {{ formatTag(tag) }}
                </span>
                <span v-if="currentGroup.tags.length > 5" class="text-muted-foreground">
                  +{{ currentGroup.tags.length - 5 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- No Group -->
        <div v-else class="p-3 border-2 border-dashed border-muted rounded text-center">
          <div class="text-sm text-muted-foreground mb-2">No group assigned</div>
          <button
            @click="createGroupForAsset"
            class="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>

    <!-- Relationship Suggestions -->
    <div v-if="showSuggestions && relationshipSuggestions.length > 0" class="space-y-3">
      <div class="text-sm font-medium">Suggested Relationships</div>
      <div class="space-y-2">
        <div
          v-for="suggestion in relationshipSuggestions"
          :key="suggestion.id"
          class="p-3 border rounded hover:bg-accent/30 cursor-pointer"
          @click="applySuggestion(suggestion)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium">{{ suggestion.title }}</div>
            <div class="flex items-center gap-1">
              <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {{ Math.round(suggestion.confidence * 100) }}%
              </span>
              <button
                @click.stop="dismissSuggestion(suggestion.id)"
                class="p-1 hover:bg-destructive/20 rounded text-xs"
              >
                ×
              </button>
            </div>
          </div>
          
          <div class="text-xs text-muted-foreground mb-2">
            {{ suggestion.description }}
          </div>
          
          <div class="flex flex-wrap gap-1">
            <span
              v-for="asset in suggestion.assets.slice(0, 3)"
              :key="asset.id"
              class="px-2 py-1 bg-muted text-xs rounded"
            >
              {{ asset.name }}
            </span>
            <span v-if="suggestion.assets.length > 3" class="text-xs text-muted-foreground">
              +{{ suggestion.assets.length - 3 }} more
            </span>
          </div>
          
          <!-- Evidence -->
          <div v-if="suggestion.evidence.length > 0" class="mt-2 text-xs">
            <div class="text-muted-foreground mb-1">Evidence:</div>
            <div class="space-y-1">
              <div
                v-for="evidence in suggestion.evidence.slice(0, 2)"
                :key="evidence.type"
                class="flex justify-between"
              >
                <span>{{ formatEvidenceType(evidence.type) }}</span>
                <span class="text-green-600">{{ Math.round(evidence.strength * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Suggestions -->
    <div v-else-if="showSuggestions" class="text-center py-4 text-muted-foreground text-sm">
      No relationship suggestions available
    </div>

    <!-- Group Actions -->
    <div v-if="selectedAssets.length > 0" class="mt-4 pt-3 border-t space-y-2">
      <button
        @click="ungroupSelected"
        :disabled="!hasGroupedAssets"
        class="w-full px-3 py-2 text-sm border rounded hover:bg-accent disabled:opacity-50"
      >
        Ungroup Selected
      </button>
      
      <button
        @click="groupSelected"
        :disabled="selectedAssets.length < 2"
        class="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
      >
        Group Selected
      </button>
    </div>
  </div>

  <!-- Group Editor Modal -->
  <GroupEditorModal
    v-if="showGroupEditor"
    :group="editingGroup"
    :available-assets="availableAssets"
    @save="saveGroupChanges"
    @cancel="showGroupEditor = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MediaGroup, MediaAsset } from '@/composables/useMediaAssets'
import type { RelationshipEvidence } from '@/composables/useMediaRelationships'
import GroupEditorModal from './GroupEditorModal.vue'

interface RelationshipSuggestion {
  id: string
  title: string
  description: string
  confidence: number
  type: 'proxy' | 'offline' | 'online' | 'master'
  assets: MediaAsset[]
  evidence: RelationshipEvidence[]
}

interface PartialSuggestion {
  id: string
  description: string
  affectedCount: number
  action: () => void
}

interface CommonRelationship {
  type: string
  count: number
  assets: MediaAsset[]
}

interface Props {
  selectedAsset?: MediaAsset | null
  selectedAssets: MediaAsset[]
  currentGroup?: MediaGroup | null
  mediaGroups: MediaGroup[]
  availableAssets: MediaAsset[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'asset-selected': [asset: MediaAsset]
  'group-created': [assets: MediaAsset[], type: string]
  'group-updated': [group: MediaGroup]
  'group-deleted': [groupId: string]
  'suggestion-applied': [suggestion: RelationshipSuggestion]
}>()

const showSuggestions = ref(false)
const showGroupEditor = ref(false)
const editingGroup = ref<MediaGroup | null>(null)
const relationshipSuggestions = ref<RelationshipSuggestion[]>([])

// Computed properties
const commonRelationships = computed(() => {
  if (props.selectedAssets.length < 2) return []
  
  const relationshipCounts = new Map<string, number>()
  const relationshipAssets = new Map<string, MediaAsset[]>()
  
  props.selectedAssets.forEach(asset => {
    // Find group for this asset
    const group = props.mediaGroups.find(g => 
      g.representations.some(r => r.asset.id === asset.id)
    )
    
    if (group) {
      const rep = group.representations.find(r => r.asset.id === asset.id)
      if (rep) {
        const type = rep.type
        relationshipCounts.set(type, (relationshipCounts.get(type) || 0) + 1)
        if (!relationshipAssets.has(type)) {
          relationshipAssets.set(type, [])
        }
        relationshipAssets.get(type)!.push(asset)
      }
    }
  })
  
  return Array.from(relationshipCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([type, count]) => ({
      type,
      count,
      assets: relationshipAssets.get(type) || []
    }))
})

const partialSuggestions = computed(() => {
  const suggestions: PartialSuggestion[] = []
  
  if (props.selectedAssets.length > 2) {
    // Find assets that could be grouped by format
    const formatGroups = new Map<string, MediaAsset[]>()
    props.selectedAssets.forEach(asset => {
      const format = asset.format
      if (!formatGroups.has(format)) {
        formatGroups.set(format, [])
      }
      formatGroups.get(format)!.push(asset)
    })
    
    formatGroups.forEach((assets, format) => {
      if (assets.length > 1 && assets.length < props.selectedAssets.length) {
        suggestions.push({
          id: `group_by_format_${format}`,
          description: `Group ${format.toUpperCase()} assets`,
          affectedCount: assets.length,
          action: () => groupAssetsByFormat(assets, format)
        })
      }
    })
  }
  
  return suggestions
})

const hasGroupedAssets = computed(() => 
  props.selectedAssets.some(asset => 
    props.mediaGroups.some(group => 
      group.representations.some(r => r.asset.id === asset.id)
    )
  )
)

// Methods
function selectRelatedAsset(asset: MediaAsset) {
  emit('asset-selected', asset)
}

function editGroup(group: MediaGroup) {
  editingGroup.value = group
  showGroupEditor.value = true
}

function createNewGroup() {
  editingGroup.value = null
  showGroupEditor.value = true
}

function createGroupForAsset() {
  if (props.selectedAsset) {
    emit('group-created', [props.selectedAsset], 'manual')
  }
}

function groupSelected() {
  if (props.selectedAssets.length >= 2) {
    emit('group-created', props.selectedAssets, 'manual')
  }
}

function ungroupSelected() {
  props.selectedAssets.forEach(asset => {
    const group = props.mediaGroups.find(g => 
      g.representations.some(r => r.asset.id === asset.id)
    )
    if (group) {
      emit('group-deleted', group.id)
    }
  })
}

function applyBulkRelationship(type: string) {
  const assets = commonRelationships.value.find(r => r.type === type)?.assets
  if (assets) {
    emit('group-created', assets, type)
  }
}

function applyPartialSuggestion(suggestion: PartialSuggestion) {
  suggestion.action()
}

function groupAssetsByFormat(assets: MediaAsset[], format: string) {
  emit('group-created', assets, format)
}

function applySuggestion(suggestion: RelationshipSuggestion) {
  emit('suggestion-applied', suggestion)
}

function dismissSuggestion(suggestionId: string) {
  relationshipSuggestions.value = relationshipSuggestions.value.filter(s => s.id !== suggestionId)
}

function saveGroupChanges(group: MediaGroup) {
  emit('group-updated', group)
  showGroupEditor.value = false
}

function formatTag(tag: string): string {
  const [category, value] = tag.split(':')
  return value || tag
}

function formatEvidenceType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Generate suggestions when selection changes
watch([() => props.selectedAsset, () => props.selectedAssets], () => {
  generateRelationshipSuggestions()
}, { immediate: true })

function generateRelationshipSuggestions() {
  relationshipSuggestions.value = []
  
  if (!props.selectedAsset && props.selectedAssets.length === 0) return
  
  const targetAssets = props.selectedAssets.length > 0 ? props.selectedAssets : [props.selectedAsset!]
  
  // Find potential relationships for selected assets
  targetAssets.forEach(asset => {
    const potentialMatches = props.availableAssets.filter(candidate => {
      if (candidate.id === asset.id) return false
      
      // Simple similarity check for demonstration
      const nameSimilarity = calculateSimpleSimilarity(asset.name, candidate.name)
      return nameSimilarity > 0.6
    })
    
    if (potentialMatches.length > 0) {
      relationshipSuggestions.value.push({
        id: `suggestion_${asset.id}_${Date.now()}`,
        title: `Group "${asset.name}" with similar assets`,
        description: `Found ${potentialMatches.length} potential matches`,
        confidence: 0.75,
        type: 'proxy',
        assets: [asset, ...potentialMatches],
        evidence: [
          { type: 'name_similarity', strength: 0.8, details: {} },
          { type: 'path_proximity', strength: 0.6, details: {} }
        ]
      })
    }
  })
}

function calculateSimpleSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}
</script>