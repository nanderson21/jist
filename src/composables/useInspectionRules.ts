import { ref, computed } from 'vue'
import { useAdvancedMetadata } from './useAdvancedMetadata'
import type { FileNode } from '@/types'
import type { InspectionRule, ExtractedMetadata, MetadataProperty } from './useAdvancedMetadata'

export function useInspectionRules() {
  const { extractMetadata } = useAdvancedMetadata()
  
  const rules = ref<InspectionRule[]>([])
  const ruleExecutionLog = ref<Array<{
    ruleId: string
    ruleName: string
    file: string
    timestamp: Date
    success: boolean
    extractedProperties: number
    error?: string
  }>>([])

  // Load rules from localStorage on initialization
  const loadRules = () => {
    try {
      const savedRules = localStorage.getItem('jist-inspection-rules')
      if (savedRules) {
        rules.value = JSON.parse(savedRules)
      }
      
      // Add default rules if none exist
      if (rules.value.length === 0) {
        addDefaultRules()
      }
    } catch (error) {
      console.warn('Failed to load inspection rules:', error)
      addDefaultRules()
    }
  }

  // Save rules to localStorage
  const saveRules = () => {
    try {
      localStorage.setItem('jist-inspection-rules', JSON.stringify(rules.value))
    } catch (error) {
      console.warn('Failed to save inspection rules:', error)
    }
  }

  // Add default inspection rules
  const addDefaultRules = () => {
    const defaultRules: InspectionRule[] = [
      {
        id: 'default-media-extraction',
        name: 'Professional Media Files',
        description: 'Extract metadata from professional video and audio formats',
        enabled: true,
        priority: 1,
        triggers: ['scan'],
        conditions: [
          {
            type: 'file_extension',
            operator: 'equals',
            value: 'r3d,braw,mov,mp4,mxf,avi,mkv,wav,aif,mp3',
            required: true,
            caseSensitive: false
          },
          {
            type: 'file_size',
            operator: 'greater_than',
            value: '1MB',
            required: false,
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'extract_metadata',
            priority: 1
          },
          {
            type: 'set_property',
            targetProperty: 'media_category',
            value: 'professional',
            priority: 2
          }
        ]
      },
      {
        id: 'default-red-camera',
        name: 'RED Camera Files',
        description: 'Extract RED-specific metadata and organize by camera system',
        enabled: true,
        priority: 1,
        triggers: ['scan'],
        conditions: [
          {
            type: 'file_extension',
            operator: 'equals',
            value: 'r3d,rdc,rmd',
            required: true,
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'extract_metadata',
            priority: 1
          },
          {
            type: 'set_property',
            targetProperty: 'camera_system',
            value: 'RED Digital Cinema',
            priority: 1
          },
          {
            type: 'create_hierarchy',
            hierarchyPath: 'RED/{project_name}/{shoot_date}/{camera_roll}',
            priority: 2
          }
        ]
      },
      {
        id: 'default-blackmagic',
        name: 'Blackmagic BRAW Files',
        description: 'Extract BRAW metadata and organize by camera model',
        enabled: true,
        priority: 1,
        triggers: ['scan'],
        conditions: [
          {
            type: 'file_extension',
            operator: 'equals',
            value: 'braw',
            required: true,
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'extract_metadata',
            priority: 1
          },
          {
            type: 'set_property',
            targetProperty: 'camera_system',
            value: 'Blackmagic Design',
            priority: 1
          },
          {
            type: 'create_hierarchy',
            hierarchyPath: 'Blackmagic/{camera_model}/{capture_date}',
            priority: 2
          }
        ]
      },
      {
        id: 'default-image-metadata',
        name: 'Image Metadata Extraction',
        description: 'Extract EXIF data from image files',
        enabled: true,
        priority: 2,
        triggers: ['scan'],
        conditions: [
          {
            type: 'file_extension',
            operator: 'equals',
            value: 'jpg,jpeg,png,tiff,tif,cr2,cr3,nef,arw,dng',
            required: true,
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'extract_metadata',
            priority: 1
          },
          {
            type: 'set_property',
            targetProperty: 'media_category',
            value: 'image',
            priority: 1
          }
        ]
      }
    ]

    rules.value = defaultRules
    saveRules()
  }

  // Add a new rule
  const addRule = (rule: InspectionRule) => {
    rules.value.push(rule)
    saveRules()
  }

  // Update an existing rule
  const updateRule = (ruleId: string, updatedRule: Partial<InspectionRule>) => {
    const index = rules.value.findIndex(r => r.id === ruleId)
    if (index >= 0) {
      rules.value[index] = { ...rules.value[index], ...updatedRule }
      saveRules()
    }
  }

  // Remove a rule
  const removeRule = (ruleId: string) => {
    const index = rules.value.findIndex(r => r.id === ruleId)
    if (index >= 0) {
      rules.value.splice(index, 1)
      saveRules()
    }
  }

  // Toggle rule enabled state
  const toggleRule = (ruleId: string) => {
    const rule = rules.value.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = !rule.enabled
      saveRules()
    }
  }

  // Get active rules for a specific trigger
  const getActiveRules = (trigger: 'scan' | 'select' | 'manual') => {
    return rules.value
      .filter(rule => rule.enabled && rule.triggers.includes(trigger))
      .sort((a, b) => a.priority - b.priority)
  }

  // Evaluate if a rule applies to a file
  const evaluateRule = (rule: InspectionRule, file: FileNode, metadata?: ExtractedMetadata): boolean => {
    return rule.conditions.every(condition => {
      switch (condition.type) {
        case 'file_extension':
          const ext = file.name.split('.').pop()?.toLowerCase()
          const extensions = condition.value?.toLowerCase().split(',').map((e: string) => e.trim())
          return extensions?.includes(ext || '') || false

        case 'file_path':
          const path = condition.caseSensitive ? file.path : file.path.toLowerCase()
          const value = condition.caseSensitive ? condition.value : condition.value?.toLowerCase()

          switch (condition.operator) {
            case 'contains': return path.includes(value || '')
            case 'starts_with': return path.startsWith(value || '')
            case 'ends_with': return path.endsWith(value || '')
            case 'regex': return new RegExp(condition.value || '').test(file.path)
            default: return path === value
          }

        case 'file_size':
          const fileSize = file.size || 0
          const targetSize = parseSizeString(condition.value || '0')
          
          switch (condition.operator) {
            case 'greater_than': return fileSize > targetSize
            case 'less_than': return fileSize < targetSize
            case 'equals': return fileSize === targetSize
            default: return false
          }

        case 'metadata_property':
          if (!metadata) return false
          const prop = metadata.properties.find(p => p.key === condition.property)
          if (!prop) return condition.operator === 'exists' ? false : true

          switch (condition.operator) {
            case 'exists': return true
            case 'equals': return prop.value === condition.value
            case 'contains': return String(prop.value).includes(String(condition.value))
            case 'greater_than': return Number(prop.value) > Number(condition.value)
            case 'less_than': return Number(prop.value) < Number(condition.value)
            default: return false
          }

        case 'metadata_exists':
          if (!metadata) return false
          return metadata.properties.some(p => p.key === condition.property)

        default:
          return false
      }
    })
  }

  // Execute a rule on a file
  const executeRule = async (rule: InspectionRule, file: FileNode): Promise<ExtractedMetadata | null> => {
    try {
      let metadata: ExtractedMetadata | null = null

      // Check if rule should extract metadata
      const needsMetadata = rule.actions.some(action => 
        action.type === 'extract_metadata' || 
        action.type === 'copy_property' || 
        action.type === 'transform_property'
      )

      if (needsMetadata) {
        metadata = await extractMetadata(file)
      }

      // Execute actions
      for (const action of rule.actions.sort((a, b) => (a.priority || 1) - (b.priority || 1))) {
        await executeAction(action, file, metadata)
      }

      // Log execution
      ruleExecutionLog.value.push({
        ruleId: rule.id,
        ruleName: rule.name,
        file: file.name,
        timestamp: new Date(),
        success: true,
        extractedProperties: metadata?.properties.length || 0
      })

      return metadata

    } catch (error) {
      console.error(`Failed to execute rule "${rule.name}" on file "${file.name}":`, error)
      
      ruleExecutionLog.value.push({
        ruleId: rule.id,
        ruleName: rule.name,
        file: file.name,
        timestamp: new Date(),
        success: false,
        extractedProperties: 0,
        error: String(error)
      })

      return null
    }
  }

  // Execute an action
  const executeAction = async (action: any, file: FileNode, metadata: ExtractedMetadata | null) => {
    switch (action.type) {
      case 'extract_metadata':
        // Metadata extraction is handled in executeRule
        break

      case 'set_property':
        if (metadata && action.targetProperty && action.value) {
          const property: MetadataProperty = {
            id: `custom_${action.targetProperty}`,
            category: 'custom',
            key: action.targetProperty,
            value: action.value,
            displayName: action.targetProperty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'string',
            source: 'custom'
          }
          metadata.properties.push(property)
        }
        break

      case 'copy_property':
        if (metadata && action.sourceProperty && action.targetProperty) {
          const sourceProp = metadata.properties.find(p => p.key === action.sourceProperty)
          if (sourceProp) {
            const property: MetadataProperty = {
              id: `copied_${action.targetProperty}`,
              category: 'custom',
              key: action.targetProperty,
              value: sourceProp.value,
              displayName: action.targetProperty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: sourceProp.type,
              source: 'custom'
            }
            metadata.properties.push(property)
          }
        }
        break

      case 'transform_property':
        if (metadata && action.sourceProperty && action.transform) {
          const sourceProp = metadata.properties.find(p => p.key === action.sourceProperty)
          if (sourceProp) {
            let transformedValue = sourceProp.value

            switch (action.transform) {
              case 'uppercase':
                transformedValue = String(sourceProp.value).toUpperCase()
                break
              case 'lowercase':
                transformedValue = String(sourceProp.value).toLowerCase()
                break
              case 'format_duration':
                if (typeof sourceProp.value === 'number') {
                  transformedValue = formatDuration(sourceProp.value)
                }
                break
              case 'format_size':
                if (typeof sourceProp.value === 'number') {
                  transformedValue = formatFileSize(sourceProp.value)
                }
                break
              case 'regex_extract':
                if (action.transformPattern) {
                  const match = String(sourceProp.value).match(new RegExp(action.transformPattern))
                  transformedValue = match ? match[1] || match[0] : sourceProp.value
                }
                break
            }

            const property: MetadataProperty = {
              id: `transformed_${action.targetProperty || sourceProp.key}`,
              category: 'custom',
              key: action.targetProperty || `${sourceProp.key}_transformed`,
              value: transformedValue,
              displayName: (action.targetProperty || sourceProp.key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: sourceProp.type,
              source: 'custom'
            }
            metadata.properties.push(property)
          }
        }
        break

      case 'create_hierarchy':
        // This would integrate with the hierarchy system
        console.log('Creating hierarchy:', action.hierarchyPath, 'for file:', file.name)
        break
    }
  }

  // Apply rules during file scanning
  const applyRulesDuringScanning = async (files: FileNode[]): Promise<Map<string, ExtractedMetadata>> => {
    const results = new Map<string, ExtractedMetadata>()
    const scanRules = getActiveRules('scan')

    for (const file of files) {
      if (file.type !== 'file') continue

      for (const rule of scanRules) {
        const metadata = await executeRule(rule, file)
        if (metadata) {
          results.set(file.path, metadata)
          
          // Stop processing other rules if stopOnMatch is true
          if (rule.stopOnMatch) {
            break
          }
        }
      }
    }

    return results
  }

  // Utility functions
  const parseSizeString = (sizeStr: string): number => {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 }
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{1,2})$/i)
    if (match) {
      const [, size, unit] = match
      return parseFloat(size) * (units[unit.toUpperCase() as keyof typeof units] || 1)
    }
    return parseFloat(sizeStr) || 0
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Computed properties
  const enabledRules = computed(() => rules.value.filter(r => r.enabled))
  const recentExecutions = computed(() => 
    ruleExecutionLog.value
      .slice(-50) // Keep last 50 executions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  )

  // Initialize on first use
  loadRules()

  return {
    rules: computed(() => rules.value),
    enabledRules,
    recentExecutions,
    addRule,
    updateRule,
    removeRule,
    toggleRule,
    getActiveRules,
    evaluateRule,
    executeRule,
    applyRulesDuringScanning,
    loadRules,
    saveRules
  }
}