import { useRef, useState } from 'react'
import { downloadBackup } from '../lib/api'

export function SettingsPage() {
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)
    const [exportDone, setExportDone] = useState(false)

    const fileRef = useRef<HTMLInputElement>(null)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null)
    const [importError, setImportError] = useState<string | null>(null)

    async function handleExport() {
        setExporting(true)
        setExportError(null)
        setExportDone(false)
        try {
            await downloadBackup()
            setExportDone(true)
            setTimeout(() => setExportDone(false), 3000)
        } catch (e) {
            setExportError(e instanceof Error ? e.message : 'Export failed')
        } finally {
            setExporting(false)
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setImportFile(file)
        setImportError(null)
        setImportPreview(null)

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string)
                if (typeof data !== 'object' || !data.version) {
                    setImportError('Invalid backup file — must be a PersonalOS backup JSON.')
                    setImportFile(null)
                    return
                }
                const counts: Record<string, number> = {}
                for (const [key, val] of Object.entries(data)) {
                    if (Array.isArray(val)) counts[key] = val.length
                }
                setImportPreview(counts)
            } catch {
                setImportError('Failed to parse file — is it a valid JSON?')
                setImportFile(null)
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <div className="text-lg font-semibold">Settings</div>
                <div className="mt-0.5 text-sm text-zinc-500">App configuration and data management</div>
            </div>

            {/* Backup section */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-4">
                <div className="text-sm font-semibold text-zinc-200">Backup & Restore</div>

                <div className="space-y-2">
                    <div className="text-xs text-zinc-400">Export all data as JSON</div>
                    <div className="text-xs text-zinc-600">Downloads a single JSON file containing all your tasks, habits, notes, finance, sleep, reflections, and more.</div>
                    <button
                        type="button"
                        onClick={() => void handleExport()}
                        disabled={exporting}
                        className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900/30 disabled:opacity-50"
                    >
                        {exporting ? 'Exporting…' : exportDone ? 'Downloaded ✓' : '↓ Export Backup'}
                    </button>
                    {exportError ? <div className="text-xs text-red-400">{exportError}</div> : null}
                </div>

                <div className="border-t border-zinc-800" />

                <div className="space-y-2">
                    <div className="text-xs text-zinc-400">Import backup (preview only)</div>
                    <div className="text-xs text-zinc-600">
                        Select a previously exported backup file to preview its contents. Full restore (overwrite/merge) is coming in a future update.
                    </div>
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm transition hover:bg-zinc-800"
                    >
                        Choose file
                    </button>
                    <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                    {importError ? <div className="text-xs text-red-400">{importError}</div> : null}

                    {importPreview && importFile && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-1">
                            <div className="text-xs font-semibold text-zinc-300 mb-2">{importFile.name}</div>
                            {Object.entries(importPreview).map(([key, count]) => (
                                <div key={key} className="flex justify-between text-xs">
                                    <span className="text-zinc-400">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-zinc-300">{count} records</span>
                                </div>
                            ))}
                            <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-600">
                                Full restore coming soon. For now, keep this file safe.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* App info */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-2">
                <div className="text-sm font-semibold text-zinc-200">About</div>
                <div className="text-xs text-zinc-500">PersonalOS — your self-hosted life OS</div>
                <div className="text-xs text-zinc-600">Stack: FastAPI + MySQL + React + Tailwind</div>
                <div className="text-xs text-zinc-600">All data stored in your own MySQL database.</div>
            </div>
        </div>
    )
}
