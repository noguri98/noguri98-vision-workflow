'use client'

import { useState, useRef, useCallback, useEffect } from "react"
import Canvas from "@/components/canvas"
import LabelInfo from "@/components/label-info"

interface BBox {
  id: string
  label: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

export default function LabelingPage() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")

  // Annotations state (drawn bboxes keyed by filename)
  const [bboxesByFile, setBboxesByFile] = useState<Record<string, BBox[]>>({})
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number, height: number }>>({})

  // File System Access API state
  const [saveDirHandle, setSaveDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Derived file variables
  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  const hasFiles = imageFiles.length > 0
  const current = hasFiles ? imageFiles[selectedIdx] : null

  const currentBboxes = current ? bboxesByFile[current.name] || [] : []

  const nextImage = useCallback(() => {
    setSelectedIdx(i => Math.min(i + 1, imageFiles.length - 1))
  }, [imageFiles.length])

  const prevImage = useCallback(() => {
    setSelectedIdx(i => Math.max(i - 1, 0))
  }, [])

  const handleAddBbox = useCallback((box: Omit<BBox, 'id'>) => {
    if (!current) return
    const uniqueId = Date.now().toString() + Math.random().toString().substring(2, 6)
    const newBbox: BBox = {
      ...box,
      id: uniqueId
    }

    setBboxesByFile(prev => ({
      ...prev,
      [current.name]: [...(prev[current.name] || []), newBbox]
    }))
  }, [current])

  const handleDeleteBbox = useCallback((id: string) => {
    if (!current) return
    setBboxesByFile(prev => ({
      ...prev,
      [current.name]: (prev[current.name] || []).filter(b => b.id !== id)
    }))
  }, [current])

  // Handle local folder selection input
  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    setFiles(arr)
    setSelectedIdx(0)
  }

  // Get image dimensions asynchronously for files that might have been unviewed
  const getImageDimensions = (file: File): Promise<{ width: number, height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        resolve({ width: 640, height: 480 }) // Fallback size
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }

  // Select save directory using File System Access API
  const handleSelectSaveDir = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      setSaveDirHandle(dirHandle)
    } catch (err) {
      // User cancelled or API not supported
      console.log('Directory selection cancelled or not supported')
    }
  }

  // Save annotations to JSON file
  const saveAnnotationsToFile = async () => {
    if (!saveDirHandle) return

    setIsSaving(true)
    try {
      const categoriesList = classes.map((cls, idx) => ({
        id: idx + 1,
        name: cls,
        supercategory: "none"
      }))

      const imagesList: any[] = []
      const annotationsList: any[] = []
      let annotationId = 1

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const size = imageSizes[file.name] || await getImageDimensions(file)
        const imageId = i + 1

        imagesList.push({
          id: imageId,
          file_name: file.name,
          width: size.width,
          height: size.height
        })

        const boxes = bboxesByFile[file.name] || []
        boxes.forEach(box => {
          const catId = classes.indexOf(box.label) + 1 || 1

          const x = box.xMin * size.width
          const y = box.yMin * size.height
          const w = (box.xMax - box.xMin) * size.width
          const h = (box.yMax - box.yMin) * size.height

          annotationsList.push({
            id: annotationId++,
            image_id: imageId,
            category_id: catId,
            bbox: [
              Math.round(x * 10) / 10,
              Math.round(y * 10) / 10,
              Math.round(w * 10) / 10,
              Math.round(h * 10) / 10
            ],
            area: Math.round(w * h * 10) / 10,
            iscrowd: 0
          })
        })
      }

      const cocoJson = {
        info: {
          description: "Custom Dataset exported from Vision Workflow BBox Labeler",
          url: "",
          version: "1.0",
          year: new Date().getFullYear(),
          contributor: "User",
          date_created: new Date().toISOString()
        },
        licenses: [],
        images: imagesList,
        annotations: annotationsList,
        categories: categoriesList
      }

      const fileHandle = await saveDirHandle.getFileHandle('annotations_coco.json', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(cocoJson, null, 2))
      await writable.close()

      setLastSaved(new Date())
    } catch (err) {
      console.error('Failed to save annotations:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save when annotations change
  useEffect(() => {
    if (!saveDirHandle) return

    const timeoutId = setTimeout(() => {
      saveAnnotationsToFile()
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [bboxesByFile, classes, saveDirHandle, imageFiles, imageSizes])

  // Export annotations to JSON file conforming with COCO Format specs
  const handleExportCOCO = async () => {
    const categoriesList = classes.map((cls, idx) => ({
      id: idx + 1,
      name: cls,
      supercategory: "none"
    }))

    const imagesList: any[] = []
    const annotationsList: any[] = []
    let annotationId = 1

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const size = imageSizes[file.name] || await getImageDimensions(file)
      const imageId = i + 1

      imagesList.push({
        id: imageId,
        file_name: file.name,
        width: size.width,
        height: size.height
      })

      const boxes = bboxesByFile[file.name] || []
      boxes.forEach(box => {
        const catId = classes.indexOf(box.label) + 1 || 1

        const x = box.xMin * size.width
        const y = box.yMin * size.height
        const w = (box.xMax - box.xMin) * size.width
        const h = (box.yMax - box.yMin) * size.height

        annotationsList.push({
          id: annotationId++,
          image_id: imageId,
          category_id: catId,
          bbox: [
            Math.round(x * 10) / 10,
            Math.round(y * 10) / 10,
            Math.round(w * 10) / 10,
            Math.round(h * 10) / 10
          ],
          area: Math.round(w * h * 10) / 10,
          iscrowd: 0
        })
      })
    }

    const cocoJson = {
      info: {
        description: "Custom Dataset exported from Vision Workflow BBox Labeler",
        url: "",
        version: "1.0",
        year: new Date().getFullYear(),
        contributor: "User",
        date_created: new Date().toISOString()
      },
      licenses: [],
      images: imagesList,
      annotations: annotationsList,
      categories: categoriesList
    }

    const blob = new Blob([JSON.stringify(cocoJson, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "annotations_coco.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. Main Canvas Area */}
      <Canvas
        currentFile={current}
        imageFilesCount={imageFiles.length}
        selectedIdx={selectedIdx}
        bboxes={currentBboxes}
        selectedClass={selectedClass}
        classes={classes}
        onNextImage={nextImage}
        onPrevImage={prevImage}
        onAddBbox={handleAddBbox}
        onImageSizeLoaded={(width, height) => {
          if (current) {
            setImageSizes(prev => {
              if (prev[current.name]?.width === width && prev[current.name]?.height === height) {
                return prev
              }
              return { ...prev, [current.name]: { width, height } }
            })
          }
        }}
        onSelectFolderClick={() => inputRef.current?.click()}
      />

      <input ref={inputRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleSelect} />

      {/* 2. Controls and Metadata Panels below the Canvas */}
      <LabelInfo
        currentFile={current}
        imageFilesCount={imageFiles.length}
        bboxes={currentBboxes}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        classes={classes}
        setClasses={setClasses}
        onDeleteBbox={handleDeleteBbox}
        imageSizes={imageSizes}
        onSelectFolderClick={() => inputRef.current?.click()}
        onExportCOCO={handleExportCOCO}
        saveDirHandle={saveDirHandle}
        onSelectSaveDir={handleSelectSaveDir}
        isSaving={isSaving}
        lastSaved={lastSaved}
      />
    </div>
  )
}
