'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Card, CardContent, CardFooter } from '@nusoma/design-system/components/ui/card'
import { Input } from '@nusoma/design-system/components/ui/input'
import { CircleXIcon, Plus, Search } from 'lucide-react'
import { useEnvironmentStore } from '@/stores/settings/environment/store'
import type { EnvironmentVariable as StoreEnvironmentVariable } from '@/stores/settings/environment/types'

// Constants
const _GRID_COLS = 'grid grid-cols-[minmax(0,1fr),minmax(0,1fr),40px] gap-4'
const INITIAL_ENV_VAR: UIEnvironmentVariable = { key: '', value: '' }

// interface Guide {
//   icon: ReactNode
//   iconBg: string
//   iconColor: string
//   title: string
//   description: string
// }

interface UIEnvironmentVariable extends StoreEnvironmentVariable {
  id?: number
}

export default function EnvironmentSettingsPage() {
  const { variables } = useEnvironmentStore()
  const [envVars, setEnvVars] = useState<UIEnvironmentVariable[]>([])
  const [focusedValueIndex, setFocusedValueIndex] = useState<number | null>(null)
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pendingClose = useRef(false)
  const initialVarsRef = useRef<UIEnvironmentVariable[]>([])

  // Derived state
  const hasChanges = useMemo(() => {
    const initialVars = initialVarsRef.current.filter((v) => v.key || v.value)
    const currentVars = envVars.filter((v) => v.key || v.value)

    const initialMap = new Map(initialVars.map((v) => [v.key, v.value]))
    const currentMap = new Map(currentVars.map((v) => [v.key, v.value]))

    if (initialMap.size !== currentMap.size) {
      return true
    }

    for (const [key, value] of currentMap) {
      const initialValue = initialMap.get(key)
      if (initialValue !== value) {
        return true
      }
    }

    for (const key of initialMap.keys()) {
      if (!currentMap.has(key)) {
        return true
      }
    }

    return false
  }, [envVars])

  // Initialization effect
  useEffect(() => {
    const existingVars = Object.values(variables)
    const initialVars = existingVars.length ? existingVars : [INITIAL_ENV_VAR]
    initialVarsRef.current = JSON.parse(JSON.stringify(initialVars))
    setEnvVars(JSON.parse(JSON.stringify(initialVars)))
    pendingClose.current = false
  }, [variables])

  // Filter environment variables based on search term
  const filteredEnvVars = useMemo(() => {
    if (!searchTerm.trim()) {
      return envVars.map((envVar, index) => ({ envVar, originalIndex: index }))
    }

    return envVars
      .map((envVar, index) => ({ envVar, originalIndex: index }))
      .filter(({ envVar }) => envVar.key.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [envVars, searchTerm])

  // Scroll effect
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [envVars.length])

  // Variable management functions
  const addEnvVar = () => {
    const newVar = { key: '', value: '', id: Date.now() }
    setEnvVars([...envVars, newVar])
    // Clear search to ensure the new variable is visible
    setSearchTerm('')
  }

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars]
    if (field === 'key') {
      let formattedKey = value.toUpperCase()
      // Step 1: Replace individual spaces and hyphens with an underscore.
      formattedKey = formattedKey.replace(/[-\s]/g, '_')
      // Step 2: Remove any characters that are not uppercase letters, numbers, or underscore.
      formattedKey = formattedKey.replace(/[^A-Z0-9_]/g, '')
      // Step 3: Consolidate multiple consecutive underscores into a single underscore.
      formattedKey = formattedKey.replace(/_{2,}/g, '_')
      // Step 4: Remove leading underscores, but only if the key isn't just a single underscore.
      // Trailing underscores will persist.
      if (formattedKey.length > 1) {
        formattedKey = formattedKey.replace(/^_+/, '')
      }
      newEnvVars[index][field] = formattedKey
    } else {
      newEnvVars[index][field] = value
    }
    setEnvVars(newEnvVars)
  }

  const removeEnvVar = (index: number) => {
    const newEnvVars = envVars.filter((_, i) => i !== index)
    setEnvVars(newEnvVars.length ? newEnvVars : [INITIAL_ENV_VAR])
  }

  // Input event handlers
  const handleValueFocus = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedValueIndex(index)
    e.target.scrollLeft = 0
  }

  const handleValueClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.currentTarget.scrollLeft = 0
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text').trim()
    if (!text) {
      return
    }

    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length === 0) {
      return
    }

    e.preventDefault()

    const inputType = (e.target as HTMLInputElement).getAttribute('data-input-type') as
      | 'key'
      | 'value'
    const containsKeyValuePair = text.includes('=')

    if (inputType && !containsKeyValuePair) {
      handleSingleValuePaste(text, index, inputType)
      return
    }

    handleKeyValuePaste(lines)
  }

  const handleSingleValuePaste = (text: string, index: number, inputType: 'key' | 'value') => {
    const newEnvVars = [...envVars]
    newEnvVars[index][inputType] = text
    setEnvVars(newEnvVars)
  }

  const handleKeyValuePaste = (lines: string[]) => {
    const parsedVars = lines
      .map((line) => {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').trim()
        return {
          key: key.trim(),
          value,
          id: Date.now() + Math.random(),
        }
      })
      .filter(({ key, value }) => key && value)

    if (parsedVars.length > 0) {
      const existingVars = envVars.filter((v) => v.key || v.value)
      setEnvVars([...existingVars, ...parsedVars])
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedChanges(true)
      pendingClose.current = true
    }
  }

  const handleCancel = () => {
    setEnvVars(JSON.parse(JSON.stringify(initialVarsRef.current)))
    setShowUnsavedChanges(false)
  }

  const handleSave = () => {
    try {
      // Close modal immediately for optimistic updates
      setShowUnsavedChanges(false)

      // Convert valid env vars to Record<string, string>
      const validVariables = envVars
        .filter((v) => v.key && v.value)
        .reduce(
          (acc, { key, value }) => ({
            ...acc,
            [key]: value,
          }),
          {}
        )

      // Single store update that triggers sync
      useEnvironmentStore.getState().setVariables(validVariables)
    } catch (_error) {}
  }

  // UI rendering
  const renderEnvVarRow = (envVar: UIEnvironmentVariable, originalIndex: number) => (
    <div key={envVar.id || originalIndex} className='flex items-center'>
      <Input
        id={`env-var-key-${envVar.id || originalIndex}`}
        className='flex-1 rounded-e-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
        data-input-type='key'
        value={envVar.key}
        onChange={(e) => updateEnvVar(originalIndex, 'key', e.target.value)}
        onPaste={(e) => handlePaste(e, originalIndex)}
        placeholder='API_KEY'
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck='false'
        name={`env-var-key-${envVar.id || originalIndex}`}
      />
      <Input
        id={`env-var-value-${envVar.id || originalIndex}`}
        className='-ms-px flex-1 rounded-s-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
        data-input-type='value'
        value={envVar.value}
        onChange={(e) => updateEnvVar(originalIndex, 'value', e.target.value)}
        type={focusedValueIndex === originalIndex ? 'text' : 'password'}
        onFocus={(e) => handleValueFocus(originalIndex, e)}
        onClick={handleValueClick}
        onBlur={() => setFocusedValueIndex(null)}
        onPaste={(e) => handlePaste(e, originalIndex)}
        placeholder='Enter value'
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck='false'
        name={`env-var-value-${envVar.id || originalIndex}`}
      />
      <Button
        variant='ghost'
        className='text-muted-foreground'
        size='icon'
        onClick={() => removeEnvVar(originalIndex)}
      >
        <CircleXIcon />
      </Button>
    </div>

    // <div key={envVar.id || index} className={`flex items-center`}>
    //   <div>
    //     <div className="flex items-center">
    //       <Label htmlFor={`env-var-key-${envVar.id || index}-${Math.random()}`}>Key</Label>
    //       <Input
    //         data-input-type="key"
    //         value={envVar.key}
    //         onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
    //         onPaste={(e) => handlePaste(e, index)}
    //         placeholder="API_KEY"
    //         autoComplete="off"
    //         autoCorrect="off"
    //         autoCapitalize="off"
    //         spellCheck="false"
    //         name={`env-var-key-${envVar.id || index}-${Math.random()}`}
    //       />
    //     </div>
    //     <div className="flex items-center">
    //       <Label htmlFor={`env-var-value-${envVar.id || index}-${Math.random()}`}>Value</Label>
    //       <Input
    //         data-input-type="value"
    //         value={envVar.value}
    //         onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
    //         type={focusedValueIndex === index ? 'text' : 'password'}
    //         onFocus={(e) => handleValueFocus(index, e)}
    //         onClick={handleValueClick}
    //         onBlur={() => setFocusedValueIndex(null)}
    //         onPaste={(e) => handlePaste(e, index)}
    //         placeholder="Enter value"
    //         className="allow-scroll"
    //         autoComplete="off"
    //         autoCorrect="off"
    //         autoCapitalize="off"
    //         spellCheck="false"
    //         name={`env-var-value-${envVar.id || index}-${Math.random()}`}
    //       />
    //     </div>
    //   </div>
    //   <Button variant="ghost" size="icon" onClick={() => removeEnvVar(index)} className="h-10 w-10">
    //     ×
    //   </Button>
    // </div>
  )

  // const guides: Guide[] = [
  //   {
  //     icon: <BookOpen size={20} />,
  //     iconBg: 'bg-blue-50',
  //     iconColor: 'text-blue-600',
  //     title: 'Start guide',
  //     description: 'Quick tips for beginners',
  //   },
  //   {
  //     icon: <FileText size={20} />,
  //     iconBg: 'bg-indigo-50',
  //     iconColor: 'text-indigo-600',
  //     title: 'Feature guide',
  //     description: 'How Linear works',
  //   },
  //   {
  //     icon: <GraduationCap size={20} />,
  //     iconBg: 'bg-purple-50',
  //     iconColor: 'text-purple-600',
  //     title: 'Linear method',
  //     description: 'Best practices for building',
  //   },
  //   {
  //     icon: <SiSlack size={20} />,
  //     iconBg: 'bg-blue-50',
  //     iconColor: 'text-blue-600',
  //     title: 'Join our Slack community',
  //     description: 'Ask questions and meet others',
  //   },
  // ]

  // const GuideCard = ({ guide }: { guide: Guide }) => {
  //   return (
  //     <div className="bg-card rounded-lg border p-5 flex items-start gap-3">
  //       <div className="shrink-0">{guide.icon}</div>
  //       <div className="w-full -mt-1">
  //         <h3 className="font-medium text-sm text-card-foreground">{guide.title}</h3>
  //         <p className="text-xs line-clamp-1 text-muted-foreground mt-1">{guide.description}</p>
  //       </div>
  //       <Button variant="ghost" size="icon" className="shrink-0">
  //         <ArrowRight size={16} />
  //       </Button>
  //     </div>
  //   )
  // }

  return (
    <div className='mx-auto mt-12 flex w-full max-w-3xl flex-col justify-center py-8'>
      <div className='mb-10 w-full'>
        <h1 className='mb-1 font-semibold text-2xl'>Environment variables</h1>
        <p className='text-muted-foreground'>Manage your environment variables.</p>
      </div>

      {/* Search Input */}
      <div className='relative w-48'>
        <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='h-9 pl-9 text-sm'
        />
      </div>

      <div className='flex w-full flex-col'>
        <Card className='rounded-b-none'>
          {/* Scrollable Content */}
          <CardContent>
            <div
              ref={scrollContainerRef}
              className='scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/25 scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto'
            >
              <div className='space-y-2 py-2'>
                {filteredEnvVars.map(({ envVar, originalIndex }) =>
                  renderEnvVarRow(envVar, originalIndex)
                )}
                {/* Show message when search has no results but there are variables */}
                {searchTerm.trim() && filteredEnvVars.length === 0 && envVars.length > 0 && (
                  <div className='py-8 text-center text-muted-foreground text-sm'>
                    No environment variables found matching "{searchTerm}"
                  </div>
                )}
              </div>
              <Button variant='ghost' size='sm' onClick={addEnvVar}>
                <Plus className='mr-1' /> Add Variable
              </Button>
            </div>
          </CardContent>

          {/* Fixed Footer */}
          <CardFooter className='flex justify-end'>
            <Button variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <Button size='sm' onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </CardFooter>

          <AlertDialog open={showUnsavedChanges} onOpenChange={setShowUnsavedChanges}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Do you want to save them before closing?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancel}>Discard Changes</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave}>Save Changes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>

      {/* <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Go further</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {guides.map((guide, index) => (
            <GuideCard key={index} guide={guide} />
          ))}
        </div>
      </div> */}
    </div>
  )
}
