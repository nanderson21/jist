import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PathVariable {
  id: string
  name: string
  pattern: string // Regex pattern
  description: string
  examples: string[]
  color: string
}

export interface TemplateNode {
  id: string
  name: string // Can include variables like "{day}_footage"
  type: 'fixed' | 'variable' | 'pattern'
  pattern?: string // Regex for matching
  variables?: string[] // Variable IDs used in this node
  context?: {
    category: string
    tags: string[]
    metadata?: Record<string, any>
  }
  children?: TemplateNode[]
}

export interface FolderTemplate {
  id: string
  name: string
  description: string
  industry: 'film' | 'broadcast' | 'commercial' | 'documentary' | 'custom'
  structure: TemplateNode
  variables: PathVariable[]
  examples: string[] // Example project paths that use this template
  createdAt: Date
  updatedAt: Date
}

export interface TemplateMatch {
  templateId: string
  confidence: number
  matchedPaths: {
    path: string
    node: TemplateNode
    variables: Record<string, string> // Extracted variable values
  }[]
}

// Common industry-standard variables
const defaultVariables: PathVariable[] = [
  {
    id: 'projectName',
    name: 'Project Name',
    pattern: '[A-Za-z0-9_\\-\\s]+',
    description: 'The name of the project',
    examples: ['MyProject', 'Commercial_2024', 'Feature_Film'],
    color: '#3B82F6'
  },
  {
    id: 'date',
    name: 'Date',
    pattern: '\\d{4}[-_]?\\d{2}[-_]?\\d{2}',
    description: 'Date in YYYY-MM-DD format',
    examples: ['2024-03-15', '20240315', '2024_03_15'],
    color: '#10B981'
  },
  {
    id: 'day',
    name: 'Shoot Day',
    pattern: 'DAY[-_]?\\d{1,3}|D\\d{1,3}',
    description: 'Shooting day number',
    examples: ['DAY_001', 'DAY001', 'D001'],
    color: '#F59E0B'
  },
  {
    id: 'captureRoll',
    name: 'Capture Roll',
    pattern: '[A-Z]\\d{3}',
    description: 'Camera roll identifier',
    examples: ['A001', 'B002', 'C003'],
    color: '#8B5CF6'
  },
  {
    id: 'camera',
    name: 'Camera Unit',
    pattern: 'CAM[-_]?[A-Z]|CAMERA[-_]?[A-Z]|[A-Z][-_]?CAM',
    description: 'Camera unit identifier',
    examples: ['CAM_A', 'CAMERA_B', 'A_CAM'],
    color: '#EC4899'
  },
  {
    id: 'scene',
    name: 'Scene Number',
    pattern: 'SC[-_]?\\d+[A-Z]?|SCENE[-_]?\\d+[A-Z]?',
    description: 'Scene number with optional suffix',
    examples: ['SC_001', 'SCENE_12A', 'SC001'],
    color: '#14B8A6'
  },
  {
    id: 'take',
    name: 'Take Number',
    pattern: 'T\\d{1,3}|TAKE[-_]?\\d{1,3}',
    description: 'Take number',
    examples: ['T01', 'TAKE_003', 'T1'],
    color: '#F97316'
  }
]

// Industry-standard templates
const defaultTemplates: Partial<FolderTemplate>[] = [
  {
    name: 'RED Camera Production',
    industry: 'film',
    description: 'Standard RED camera folder structure for film production',
    structure: {
      id: 'root',
      name: '{projectName}',
      type: 'variable',
      children: [
        {
          id: 'source',
          name: '00_SOURCE',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['source', 'original', 'camera-original']
          },
          children: [
            {
              id: 'cam-originals',
              name: 'CAM_ORIGINALS',
              type: 'fixed',
              context: {
                category: 'Media Type',
                tags: ['camera-files', 'raw']
              },
              children: [
                {
                  id: 'shoot-day',
                  name: '{day}',
                  type: 'variable',
                  pattern: 'DAY[-_]?\\d{3}',
                  variables: ['day'],
                  context: {
                    category: 'Production Day',
                    tags: ['shoot-day']
                  },
                  children: [
                    {
                      id: 'camera-unit',
                      name: '{camera}',
                      type: 'variable',
                      variables: ['camera'],
                      context: {
                        category: 'Camera Unit',
                        tags: ['camera']
                      },
                      children: [
                        {
                          id: 'capture-roll',
                          name: '{captureRoll}',
                          type: 'variable',
                          variables: ['captureRoll'],
                          context: {
                            category: 'Capture Roll',
                            tags: ['roll', 'reel']
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: 'audio-originals',
              name: 'AUDIO_ORIGINALS',
              type: 'fixed',
              context: {
                category: 'Media Type',
                tags: ['audio', 'sound', 'original']
              }
            }
          ]
        },
        {
          id: 'dailies',
          name: '01_DAILIES',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['dailies', 'proxies', 'review']
          }
        },
        {
          id: 'editorial',
          name: '02_EDITORIAL',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['editorial', 'edit', 'post-production']
          }
        },
        {
          id: 'vfx',
          name: '03_VFX',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['vfx', 'visual-effects', 'post-production']
          }
        },
        {
          id: 'color',
          name: '04_COLOR',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['color', 'grade', 'di', 'post-production']
          }
        },
        {
          id: 'finishing',
          name: '05_FINISHING',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['finishing', 'delivery', 'final']
          }
        }
      ]
    }
  },
  {
    name: 'Commercial Production',
    industry: 'commercial',
    description: 'Standard folder structure for commercial productions',
    structure: {
      id: 'root',
      name: '{projectName}',
      type: 'variable',
      children: [
        {
          id: 'production',
          name: 'PRODUCTION',
          type: 'fixed',
          children: [
            {
              id: 'shoot-date',
              name: '{date}',
              type: 'variable',
              variables: ['date'],
              children: [
                {
                  id: 'raw',
                  name: 'RAW',
                  type: 'fixed',
                  context: {
                    category: 'Media Type',
                    tags: ['raw', 'original']
                  }
                },
                {
                  id: 'proxy',
                  name: 'PROXY',
                  type: 'fixed',
                  context: {
                    category: 'Media Type',
                    tags: ['proxy', 'preview']
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'post',
          name: 'POST',
          type: 'fixed',
          children: [
            {
              id: 'edit',
              name: 'EDIT',
              type: 'fixed'
            },
            {
              id: 'graphics',
              name: 'GRAPHICS',
              type: 'fixed'
            },
            {
              id: 'audio',
              name: 'AUDIO',
              type: 'fixed'
            }
          ]
        },
        {
          id: 'delivery',
          name: 'DELIVERY',
          type: 'fixed',
          context: {
            category: 'Production Stage',
            tags: ['delivery', 'final', 'output']
          }
        }
      ]
    }
  }
]

export const useTemplateStore = defineStore('templates', () => {
  // State
  const templates = ref<FolderTemplate[]>([])
  const variables = ref<PathVariable[]>([...defaultVariables])
  const activeTemplate = ref<string | null>(null)
  
  // Initialize with default templates
  function initializeDefaults() {
    if (templates.value.length === 0) {
      templates.value = defaultTemplates.map((t, index) => ({
        ...t,
        id: `template-${Date.now()}-${index}`,
        variables: defaultVariables,
        examples: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as FolderTemplate))
    }
  }
  
  // Template matching
  function matchPath(path: string, node: TemplateNode, variables: PathVariable[]): { matches: boolean; extracted: Record<string, string> } {
    const extracted: Record<string, string> = {}
    
    if (node.type === 'fixed') {
      // Fixed nodes must match exactly
      const parts = path.split('/')
      return { 
        matches: parts.includes(node.name), 
        extracted 
      }
    } else if (node.type === 'variable' && node.variables) {
      // Build regex from node name with variables
      let pattern = node.name
      
      node.variables.forEach(varId => {
        const variable = variables.find(v => v.id === varId)
        if (variable) {
          pattern = pattern.replace(`{${varId}}`, `(${variable.pattern})`)
        }
      })
      
      const regex = new RegExp(pattern, 'i')
      const match = path.match(regex)
      
      if (match) {
        node.variables.forEach((varId, index) => {
          extracted[varId] = match[index + 1]
        })
        return { matches: true, extracted }
      }
    } else if (node.type === 'pattern' && node.pattern) {
      const regex = new RegExp(node.pattern, 'i')
      return { 
        matches: regex.test(path), 
        extracted 
      }
    }
    
    return { matches: false, extracted }
  }
  
  function findMatchingTemplates(rootPath: string, projectStructure: any[]): TemplateMatch[] {
    const matches: TemplateMatch[] = []
    
    templates.value.forEach(template => {
      const matchedPaths: any[] = []
      let totalConfidence = 0
      
      // Recursive function to match template nodes with project structure
      function matchNode(templateNode: TemplateNode, projectPaths: string[], depth = 0) {
        projectPaths.forEach(path => {
          const { matches, extracted } = matchPath(path, templateNode, template.variables)
          
          if (matches) {
            matchedPaths.push({
              path,
              node: templateNode,
              variables: extracted
            })
            totalConfidence += 1 / (depth + 1) // Higher weight for top-level matches
          }
          
          // Check children
          if (templateNode.children) {
            const childPaths = projectPaths.filter(p => p.startsWith(path + '/'))
            templateNode.children.forEach(child => {
              matchNode(child, childPaths, depth + 1)
            })
          }
        })
      }
      
      // Start matching from root
      const allPaths = flattenProjectStructure(projectStructure)
      matchNode(template.structure, allPaths)
      
      if (matchedPaths.length > 0) {
        matches.push({
          templateId: template.id,
          confidence: Math.min(totalConfidence / 10, 1), // Normalize confidence
          matchedPaths
        })
      }
    })
    
    return matches.sort((a, b) => b.confidence - a.confidence)
  }
  
  function flattenProjectStructure(nodes: any[]): string[] {
    const paths: string[] = []
    
    function traverse(node: any, parentPath = '') {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name
      paths.push(currentPath)
      
      if (node.children) {
        node.children.forEach((child: any) => traverse(child, currentPath))
      }
    }
    
    nodes.forEach(node => traverse(node))
    return paths
  }
  
  // Create custom template from selection
  function createTemplateFromSelection(
    name: string,
    description: string,
    selectedPaths: Array<{ path: string; variables: Array<{ start: number; end: number; variableId: string }> }>,
    industry: FolderTemplate['industry'] = 'custom'
  ): FolderTemplate {
    // Build template structure from selected paths
    const structure = buildTemplateStructure(selectedPaths)
    
    const template: FolderTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      industry,
      structure,
      variables: variables.value,
      examples: selectedPaths.map(p => p.path),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    templates.value.push(template)
    return template
  }
  
  function buildTemplateStructure(
    selectedPaths: Array<{ path: string; variables: Array<{ start: number; end: number; variableId: string }> }>
  ): TemplateNode {
    // This is a simplified version - you'd want more sophisticated tree building
    const root: TemplateNode = {
      id: 'root',
      name: 'root',
      type: 'fixed',
      children: []
    }
    
    // Build tree structure from paths
    // TODO: Implement sophisticated tree building with variable extraction
    
    return root
  }
  
  // Variable management
  function createVariable(variable: Omit<PathVariable, 'id'>): PathVariable {
    const newVar: PathVariable = {
      ...variable,
      id: `var-${Date.now()}`
    }
    variables.value.push(newVar)
    return newVar
  }
  
  function updateVariable(id: string, updates: Partial<PathVariable>) {
    const index = variables.value.findIndex(v => v.id === id)
    if (index >= 0) {
      variables.value[index] = { ...variables.value[index], ...updates }
    }
  }
  
  // Template management
  function updateTemplate(id: string, updates: Partial<FolderTemplate>) {
    const index = templates.value.findIndex(t => t.id === id)
    if (index >= 0) {
      templates.value[index] = { 
        ...templates.value[index], 
        ...updates,
        updatedAt: new Date()
      }
    }
  }
  
  function deleteTemplate(id: string) {
    templates.value = templates.value.filter(t => t.id !== id)
  }
  
  function setActiveTemplate(templateId: string | null) {
    activeTemplate.value = templateId
  }
  
  // Apply template to path
  function applyTemplate(templateId: string, rootPath: string, extractedVariables: Record<string, string>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return []
    
    const appliedContexts: Array<{ path: string; context: any }> = []
    
    function applyNode(node: TemplateNode, parentPath: string) {
      let nodeName = node.name
      
      // Replace variables in node name
      if (node.variables) {
        node.variables.forEach(varId => {
          if (extractedVariables[varId]) {
            nodeName = nodeName.replace(`{${varId}}`, extractedVariables[varId])
          }
        })
      }
      
      const currentPath = `${parentPath}/${nodeName}`
      
      if (node.context) {
        appliedContexts.push({
          path: currentPath,
          context: node.context
        })
      }
      
      if (node.children) {
        node.children.forEach(child => applyNode(child, currentPath))
      }
    }
    
    applyNode(template.structure, rootPath)
    return appliedContexts
  }
  
  return {
    // State
    templates: computed(() => templates.value),
    variables: computed(() => variables.value),
    activeTemplate: computed(() => activeTemplate.value),
    
    // Actions
    initializeDefaults,
    findMatchingTemplates,
    createTemplateFromSelection,
    createVariable,
    updateVariable,
    updateTemplate,
    deleteTemplate,
    setActiveTemplate,
    applyTemplate,
    matchPath
  }
})