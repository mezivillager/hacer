import { useRef, useState } from 'react'
import { Save, Trash2, Download, Upload, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Input } from '@/components/ui-kit/input'
import { Label } from '@/components/ui-kit/label'
import { Separator } from '@/components/ui-kit/separator'
import { ScrollArea } from '@/components/ui-kit/scroll-area'
import { circuitActions } from '@/store/circuitStore'
import type { SavedCircuitSummary } from '@/store/types'

export function CircuitLibrary() {
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<SavedCircuitSummary[]>(() => circuitActions.listSavedCircuits())
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setEntries(circuitActions.listSavedCircuits())

  const handleSave = () => {
    circuitActions.saveCircuit(name)
    refresh()
  }

  const handleLoad = (entry: SavedCircuitSummary) => {
    circuitActions.loadCircuit(entry.name)
  }

  const handleDelete = (entry: SavedCircuitSummary) => {
    circuitActions.deleteSavedCircuit(entry.name)
    refresh()
  }

  const handleExport = () => {
    circuitActions.exportCircuitJSON(name)
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    circuitActions.importCircuitJSON(text)
    refresh()
    event.target.value = ''
  }

  return (
    <div data-testid="circuit-library" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="library-name-input" className="text-xs text-muted-foreground">
          Circuit name
        </Label>
        <div className="flex gap-2">
          <Input
            id="library-name-input"
            data-testid="library-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. not, mux4way16"
            className="h-8 text-sm"
          />
          <Button data-testid="library-save" size="sm" onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="library-export"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleExport}
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
          <Button
            data-testid="library-import"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleImportClick}
          >
            <Upload className="w-3 h-3 mr-1" /> Import
          </Button>
          <input
            ref={fileRef}
            data-testid="library-import-input"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      </div>

      <Separator />

      <ScrollArea className="max-h-72 pr-1">
        {entries.length === 0 ? (
          <div
            data-testid="library-empty-state"
            className="flex flex-col items-center justify-center py-8 text-muted-foreground"
          >
            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No saved circuits</p>
            <p className="text-xs">Save the current circuit above</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li
                key={entry.name}
                data-testid={`library-entry-${entry.name}`}
                className="flex items-center justify-between gap-2 rounded-md bg-secondary/30 border border-border px-2 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.savedAt).toLocaleString()}</p>
                </div>
                <Button
                  data-testid={`library-load-${entry.name}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleLoad(entry)}
                >
                  Load
                </Button>
                <Button
                  data-testid={`library-delete-${entry.name}`}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleDelete(entry)}
                  aria-label={`Delete ${entry.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
