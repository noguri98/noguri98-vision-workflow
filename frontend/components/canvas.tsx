'use client'

import { useState, useEffect, useRef, useCallback } from "react"

interface BBox {
  id: string
  label: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

interface ImageRect {
  width: number
  height: number
  left: number
  top: number
}

interface CanvasProps {
  currentFile: File | null
  imageFilesCount: number
  selectedIdx: number
  bboxes: BBox[]
  selectedClass: string
  classes: string[]
  onNextImage: () => void
  onPrevImage: () => void
  onAddBbox: (box: Omit<BBox, 'id'>) => void
  onImageSizeLoaded: (width: number, height: number) => void
  onSelectFolderClick: () => void
}

export default function Canvas({
  currentFile,
  imageFilesCount,
  selectedIdx,
  bboxes,
  selectedClass,
  classes,
  onNextImage,
  onPrevImage,
  onAddBbox,
  onImageSizeLoaded,
  onSelectFolderClick
}: CanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [imageRect, setImageRect] = useState<ImageRect | null>(null)
  const [src, setSrc] = useState<string | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null)
  const [activeDraw, setActiveDraw] = useState<{ xMin: number, yMin: number, xMax: number, yMax: number } | null>(null)

  const hasFiles = currentFile !== null

  // Update layout calculation of the actual displayed image within the HTMLImgElement
  const updateImageRect = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      return
    }

    const rect = img.getBoundingClientRect()
    const parent = img.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()

    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    const containerRatio = rect.width / rect.height
    const imageRatio = naturalWidth / naturalHeight

    let actualWidth = rect.width
    let actualHeight = rect.height
    let xOffset = rect.left - parentRect.left
    let yOffset = rect.top - parentRect.top

    if (containerRatio > imageRatio) {
      actualWidth = rect.height * imageRatio
      xOffset += (rect.width - actualWidth) / 2
    } else {
      actualHeight = rect.width / imageRatio
      yOffset += (rect.height - actualHeight) / 2
    }

    setImageRect({
      width: actualWidth,
      height: actualHeight,
      left: xOffset,
      top: yOffset
    })

    onImageSizeLoaded(naturalWidth, naturalHeight)
  }, [onImageSizeLoaded])

  // Load src from file
  useEffect(() => {
    if (!currentFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSrc(null)
      setImageRect(null)
      return
    }
    const url = URL.createObjectURL(currentFile)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [currentFile])

  // Key event listeners
  useEffect(() => {
    if (!hasFiles) return
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'a') onNextImage()
      if (k === 's') onPrevImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasFiles, onNextImage, onPrevImage])

  // Watch for resize events to recalculate canvas layout overlaps
  useEffect(() => {
    window.addEventListener('resize', updateImageRect)
    return () => window.removeEventListener('resize', updateImageRect)
  }, [updateImageRect])

  // Re-run rect update when src loads
  useEffect(() => {
    updateImageRect()
  }, [src, updateImageRect])

  // Mouse drawing calculations using normalized bounding rect coordinates (0 to 1)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!selectedClass) {
      alert("라벨을 그리기 전에 하단 '라벨 클래스' 영역에서 클래스를 먼저 추가하고 선택해 주세요.")
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setIsDrawing(true)
    setDrawStart({ x, y })
    setActiveDraw({ xMin: x, yMin: y, xMax: x, yMax: y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setActiveDraw({
      xMin: Math.min(drawStart.x, x),
      yMin: Math.min(drawStart.y, y),
      xMax: Math.max(drawStart.x, x),
      yMax: Math.max(drawStart.y, y)
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !activeDraw || !currentFile) return

    const width = activeDraw.xMax - activeDraw.xMin
    const height = activeDraw.yMax - activeDraw.yMin

    // Only draw box if drag length is non-trivial (avoids accidental clicks)
    if (width > 0.005 && height > 0.005) {
      onAddBbox({
        label: selectedClass,
        xMin: activeDraw.xMin,
        yMin: activeDraw.yMin,
        xMax: activeDraw.xMax,
        yMax: activeDraw.yMax
      })
    }

    setIsDrawing(false)
    setDrawStart(null)
    setActiveDraw(null)
  }

  // Generate class color schemes dynamically
  const getClassColor = (label: string) => {
    const idx = classes.indexOf(label)
    const colors = [
      "border-red-500 bg-red-500/10 text-red-500",
      "border-blue-500 bg-blue-500/10 text-blue-500",
      "border-emerald-500 bg-emerald-500/10 text-emerald-500",
      "border-amber-500 bg-amber-500/10 text-amber-500",
      "border-violet-500 bg-violet-500/10 text-violet-500",
      "border-pink-500 bg-pink-500/10 text-pink-500",
      "border-orange-500 bg-orange-500/10 text-orange-500",
      "border-cyan-500 bg-cyan-500/10 text-cyan-500"
    ]
    return colors[idx % colors.length] || "border-zinc-400 bg-zinc-400/10 text-zinc-400"
  }

  return (
    <div className="rounded-xl border border-zinc-300 bg-card shadow-sm overflow-hidden flex flex-col w-full">
      {/* Header */}
      <div className="border-b border-zinc-300 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate max-w-[60%] font-medium">{hasFiles && currentFile ? currentFile.name : 'Canvas'}</span>
        <span className="tabular-nums">{hasFiles ? `${selectedIdx + 1} / ${imageFilesCount}` : '0 / 0'}</span>
      </div>

      {/* Main Canvas view with interactive drawing overlay */}
      <div className={`relative flex-1 flex items-center justify-center overflow-hidden bg-zinc-950/5 dark:bg-zinc-100/5 p-4 ${!hasFiles ? 'min-h-[400px] border border-dashed border-zinc-305 m-4 rounded-lg' : ''}`}>
        {!hasFiles ? (
          <div className="text-center space-y-3 p-8 cursor-pointer" onClick={onSelectFolderClick}>
            <div className="text-muted-foreground">파일을 선택해주세요</div>
            <div className="text-xs text-muted-foreground">클릭하여 폴더 선택</div>
          </div>
        ) : src ? (
          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
            {/* Image element */}
            <img
              ref={imgRef}
              src={src}
              alt="canvas"
              onLoad={updateImageRect}
              className="max-w-full max-h-[80vh] object-contain select-none pointer-events-none rounded border border-zinc-200"
            />

            {/* Bounding box interactive overlay */}
            {imageRect && (
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute cursor-crosshair select-none"
                style={{
                  left: `${imageRect.left}px`,
                  top: `${imageRect.top}px`,
                  width: `${imageRect.width}px`,
                  height: `${imageRect.height}px`
                }}
              >
                {/* Saved boxes in current image */}
                {bboxes.map((box) => (
                  <div
                    key={box.id}
                    className={`absolute border-2 ${getClassColor(box.label).split(' ')[0]} ${getClassColor(box.label).split(' ')[1]}`}
                    style={{
                      left: `${box.xMin * 100}%`,
                      top: `${box.yMin * 100}%`,
                      width: `${(box.xMax - box.xMin) * 100}%`,
                      height: `${(box.yMax - box.yMin) * 100}%`
                    }}
                  >
                    <span className={`absolute top-0 left-0 -translate-y-full text-[9px] font-bold px-1 rounded-t border-t border-x ${getClassColor(box.label).split(' ')[0]} ${getClassColor(box.label).split(' ')[2]} bg-background`}>
                      {box.label}
                    </span>
                  </div>
                ))}

                {/* Draw box rendering dynamically during drag event */}
                {activeDraw && (
                  <div
                    className={`absolute border-2 border-dashed ${getClassColor(selectedClass).split(' ')[0]} bg-black/10`}
                    style={{
                      left: `${activeDraw.xMin * 100}%`,
                      top: `${activeDraw.yMin * 100}%`,
                      width: `${(activeDraw.xMax - activeDraw.xMin) * 100}%`,
                      height: `${(activeDraw.yMax - activeDraw.yMin) * 100}%`
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-300 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          {hasFiles ? (
            <button
              onClick={onSelectFolderClick}
              className="text-zinc-660 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium cursor-pointer transition-colors"
            >
              폴더 변경...
            </button>
          ) : (
            <span className="text-zinc-400">선택된 폴더 없음</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[11px] text-zinc-400">단축키:</span>
          <div className="flex items-center gap-1.5">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-300 bg-zinc-100 px-1.5 font-mono text-[10px] font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">S</kbd>
            <span>이전 이미지</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-300 bg-zinc-100 px-1.5 font-mono text-[10px] font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">A</kbd>
            <span>다음 이미지</span>
          </div>
        </div>
      </div>
    </div>
  )
}
