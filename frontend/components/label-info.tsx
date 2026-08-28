'use client'

import { useState } from "react"

interface BBox {
  id: string
  label: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

interface ImageFile {
  name: string
  type: string
  url?: string
}

interface LabelInfoProps {
  currentFile: ImageFile | null
  imageFilesCount: number
  bboxes: BBox[]
  selectedClass: string
  setSelectedClass: (cls: string) => void
  classes: string[]
  setClasses: (classes: string[]) => void
  onDeleteBbox: (id: string) => void
  imageSizes: Record<string, { width: number, height: number }>
  imagesDir: string
  onSetImagesDir: (path: string) => void
  onDeleteImagesDir: () => void
  onExportCOCO: () => void
  isSaving: boolean
  lastSaved: Date | null
  onRefreshImages: () => void
}

// Generate circular colors next to class labels
const getClassDotColor = (cls: string, classes: string[]) => {
  const idx = classes.indexOf(cls)
  const dotColors = [
    "bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-violet-500", "bg-pink-500", "bg-orange-500", "bg-cyan-500"
  ]
  return dotColors[idx % dotColors.length] || "bg-zinc-400"
}

// Dynamic tag coloring based on the category's index
const getSelectedClassStyle = (cls: string, classes: string[], isSelected: boolean) => {
  if (!isSelected) {
    return "bg-background text-zinc-555 border-zinc-200 hover:bg-zinc-50 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-200"
  }
  const idx = classes.indexOf(cls)
  const activeStyles = [
    "bg-red-500/10 text-red-650 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-900/40 font-semibold",
    "bg-blue-500/10 text-blue-650 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-900/40 font-semibold",
    "bg-emerald-500/10 text-emerald-650 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-900/40 font-semibold",
    "bg-amber-500/10 text-amber-650 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-900/40 font-semibold",
    "bg-violet-500/10 text-violet-650 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-900/40 font-semibold",
    "bg-pink-500/10 text-pink-650 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-900/40 font-semibold",
    "bg-orange-500/10 text-orange-650 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-900/40 font-semibold",
    "bg-cyan-500/10 text-cyan-650 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-900/40 font-semibold"
  ]
  return activeStyles[idx % activeStyles.length] || "bg-zinc-950 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-950"
}

export default function LabelInfo({
  currentFile,
  imageFilesCount,
  bboxes,
  selectedClass,
  setSelectedClass,
  classes,
  setClasses,
  onDeleteBbox,
  imageSizes,
  imagesDir,
  onSetImagesDir,
  onDeleteImagesDir,
  onExportCOCO,
  isSaving,
  lastSaved,
  onRefreshImages
}: LabelInfoProps) {
  const [newClassInput, setNewClassInput] = useState("")
  const [dirInput, setDirInput] = useState(imagesDir)

  const hasFiles = currentFile !== null

  if (!hasFiles) {
    return (
      <div className="border border-dashed border-zinc-300 rounded-xl p-10 text-center bg-card shadow-sm flex flex-col items-center justify-center gap-4 transition-all">
        <div className="p-3 bg-zinc-100 dark:bg-zinc-950 rounded-full text-zinc-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5M5 19v-2a2 2 0 00-2-2H3m14 4h2a2 2 0 002-2v-3M9 9h.01M13 12h.01M17 9h.01M9 13h.01M13 16h.01M17 13h.01" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">이미지가 없습니다</p>
          <p className="text-xs text-muted-foreground mt-1">아래에 이미지 디렉토리 경로를 입력하고 적용 버튼을 클릭하세요.</p>
        </div>
        <div className="flex gap-2 w-full max-w-md">
          <input
            type="text"
            value={dirInput}
            onChange={(e) => setDirInput(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-background px-3 py-1.5 text-xs shadow-sm placeholder:text-zinc-400 transition-colors focus-visible:outline-none focus:border-zinc-450 dark:focus:border-zinc-700"
            placeholder="/path/to/images"
          />
          <button
            onClick={() => onSetImagesDir(dirInput)}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-100 dark:text-zinc-955 cursor-pointer shadow transition-all duration-200"
          >
            적용
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 bg-card border border-zinc-250 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      {/* Top Section: File Info and Classes (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        {/* Column 1: Local file info & controls */}
        <div className="space-y-4 flex flex-col justify-between md:border-r border-zinc-200 dark:border-zinc-800 md:pr-6 pb-4 md:pb-0">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">현재 파일 정보</h3>
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg dark:text-blue-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-150 truncate" title={currentFile.name}>
                  {currentFile.name}
                </p>
                {imageSizes[currentFile.name] ? (
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono tabular-nums">
                    {imageSizes[currentFile.name].width} × {imageSizes[currentFile.name].height} px
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-1 italic">크기 로드 중...</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">이미지 디렉토리</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                className="flex-1 h-8 rounded-lg border border-zinc-250 dark:border-zinc-800 bg-background px-3 py-1.5 text-xs shadow-sm placeholder:text-zinc-400 transition-colors focus-visible:outline-none focus:border-zinc-450 dark:focus:border-zinc-700"
                placeholder="/path/to/images"
              />
              <button
                onClick={() => onSetImagesDir(dirInput)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-background hover:bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:border-zinc-750 dark:bg-zinc-900/30 dark:hover:bg-zinc-900 dark:text-zinc-300 cursor-pointer transition-colors shadow-sm whitespace-nowrap"
              >
                적용
              </button>
              <button
                onClick={onRefreshImages}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-background hover:bg-zinc-50 w-8 h-8 text-zinc-700 dark:border-zinc-750 dark:bg-zinc-900/30 dark:hover:bg-zinc-900 dark:text-zinc-300 cursor-pointer transition-colors shadow-sm"
                title="새로고침"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onDeleteImagesDir}
                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 w-8 h-8 text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 cursor-pointer transition-colors shadow-sm"
                title="디렉토리 설정 초기화"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">현재: {imagesDir}</p>
          </div>
        </div>

        {/* Column 2: Label category classes panels */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">라벨 클래스</h3>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto align-content-start pr-1">
              {classes.length === 0 ? (
                <div className="text-xs text-zinc-400 py-6 text-center w-full">추가된 클래스가 없습니다. 아래에서 클래스를 추가해주세요.</div>
              ) : (
                classes.map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all cursor-pointer ${getSelectedClassStyle(cls, classes, selectedClass === cls)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getClassDotColor(cls, classes)}`} />
                    <span className="capitalize">{cls}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const trim = newClassInput.trim().toLowerCase()
            if (trim && !classes.includes(trim)) {
              setClasses([...classes, trim])
              setSelectedClass(trim)
            }
            setNewClassInput("")
          }} className="flex gap-2">
            <input
              type="text"
              value={newClassInput}
              onChange={(e) => setNewClassInput(e.target.value)}
              placeholder="새 클래스 추가..."
              className="flex h-8 w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-background px-3 py-1.5 text-xs shadow-sm shadow-black/[0.02] placeholder:text-zinc-400 transition-colors focus-visible:outline-none focus:border-zinc-450 dark:focus:border-zinc-700"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold border border-zinc-250 dark:border-zinc-800 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 px-3.5 h-8 text-zinc-700 dark:text-zinc-300 cursor-pointer shadow-sm transition-colors"
            >
              추가
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Section: Annotation list (Full-width) */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
          <span>어노테이션 목록</span>
          <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full font-bold text-zinc-600 dark:text-zinc-400">{bboxes.length}</span>
        </h3>

        <div className="space-y-1.5 max-h-[240px] overflow-y-auto border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10 rounded-lg p-3 divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
          {bboxes.length === 0 ? (
            <div className="text-xs text-zinc-400 text-center py-10">드래그해서 라벨을 그려보세요</div>
          ) : (
            bboxes.map((box, index) => {
              const wPct = Math.round((box.xMax - box.xMin) * 100)
              const hPct = Math.round((box.yMax - box.yMin) * 100)
              return (
                <div key={box.id} className={`group flex items-center justify-between py-2 first:pt-0 ${index > 0 ? 'pt-2' : ''}`}>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-[10px] text-zinc-400 font-mono tabular-nums shrink-0">{String(index + 1).padStart(2, '0')}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getClassDotColor(box.label, classes)}`} />
                        <span className="font-semibold text-[11px] text-zinc-800 dark:text-zinc-200 capitalize truncate">{box.label}</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                        크기: {wPct}% × {hPct}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteBbox(box.id)}
                    className="text-zinc-400 hover:text-red-500 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-all cursor-pointer p-1"
                    title="삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Save Section */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">저장</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                저장 중...
              </span>
            ) : lastSaved ? (
              <span>자동 저장됨: {lastSaved.toLocaleTimeString()}</span>
            ) : (
              <span className="text-zinc-400">변경 시 자동 저장</span>
            )}
          </div>
        </div>
        
        <button
          onClick={onExportCOCO}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-100 dark:text-zinc-955 cursor-pointer shadow transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          COCO JSON 다운로드
        </button>
      </div>
    </div>
  )
}
