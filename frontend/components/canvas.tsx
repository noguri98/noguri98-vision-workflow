'use client'

import { useState, useEffect, useRef, useCallback } from "react"

export default function Canvas() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  const hasFiles = imageFiles.length > 0
  const current = hasFiles ? imageFiles[selectedIdx] : null
  const [src, setSrc] = useState<string | null>(null)

  const nextImage = useCallback(() => setSelectedIdx(i => Math.min(i + 1, imageFiles.length - 1)), [imageFiles.length])
  const prevImage = useCallback(() => setSelectedIdx(i => Math.max(i - 1, 0)), [])

  useEffect(() => {
    if (!current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSrc(null)
      return
    }
    const url = URL.createObjectURL(current)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [current])

  useEffect(() => {
    if (!hasFiles) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'a') nextImage()
      if (k === 's') prevImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasFiles, nextImage, prevImage])

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList) return
    const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    setFiles(arr)
    setSelectedIdx(0)
  }

  return (
    <div className="rounded-xl border border-zinc-300 bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-300 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate max-w-[60%] font-medium">{hasFiles && current ? current.name : 'Canvas'}</span>
        <span className="tabular-nums">{hasFiles ? `${selectedIdx + 1} / ${imageFiles.length}` : '0 / 0'}</span>
      </div>

      <input ref={inputRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleSelect} />

      {/* Main Content Area */}
      <div className={`relative flex-1 flex items-center justify-center overflow-hidden ${!hasFiles ? 'min-h-[400px] border border-dashed border-zinc-300 m-4 rounded-lg' : ''}`}>
        {!hasFiles ? (
          <div className="text-center space-y-3 p-8 cursor-pointer" onClick={() => inputRef.current?.click()}>
            <div className="text-muted-foreground">파일을 선택해주세요</div>
            <div className="text-xs text-muted-foreground">클릭하여 폴더 선택</div>
          </div>
        ) : src ? (
          <img src={src} alt="canvas" className="max-w-full max-h-[80vh] object-contain p-4" />
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-300 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          {hasFiles ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium cursor-pointer transition-colors"
            >
              폴더 변경...
            </button>
          ) : (
            <span className="text-zinc-400">선택된 폴더 없음</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[11px] text-zinc-450">단축키:</span>
          <div className="flex items-center gap-1.5">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-300 bg-zinc-100 px-1.5 font-mono text-[10px] font-bold text-zinc-805 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">S</kbd>
            <span>이전 이미지</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-300 bg-zinc-100 px-1.5 font-mono text-[10px] font-bold text-zinc-805 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">A</kbd>
            <span>다음 이미지</span>
          </div>
        </div>
      </div>
    </div>
  )
}
