'use client'

import { useState, useCallback, useEffect } from "react"
import Canvas from "@/components/canvas"
import LabelInfo from "@/components/label-info"
import { fetchImageList, getImageUrl, fetchAnnotation, saveAnnotation, getImagesDir, setImagesDir as apiSetImagesDir, deleteImagesDir as apiDeleteImagesDir, BBox } from "@/lib/api"

export default function LabelingPage() {
  const [imageNames, setImageNames] = useState<string[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")

  // Annotations state (drawn bboxes keyed by filename)
  const [bboxesByFile, setBboxesByFile] = useState<Record<string, BBox[]>>({})
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number, height: number }>>({})

  // Images directory state
  const [imagesDir, setImagesDir] = useState<string>("")

  // Auto-save state
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const hasFiles = imageNames.length > 0
  const currentName = hasFiles ? imageNames[selectedIdx] : null

  const currentBboxes = currentName ? bboxesByFile[currentName] || [] : []

  // Load images dir and image list from backend
  useEffect(() => {
    getImagesDir().then(path => {
      setImagesDir(path)
      return fetchImageList()
    }).then(names => {
      setImageNames(names)
      setSelectedIdx(0)
    })
  }, [])

  // Handle set images dir
  const handleSetImagesDir = async (path: string) => {
    await apiSetImagesDir(path)
    setImagesDir(path)
    const names = await fetchImageList()
    setImageNames(names)
    setSelectedIdx(0)
  }

  // Refresh images list
  const handleRefreshImages = async () => {
    const names = await fetchImageList()
    setImageNames(names)
  }

  // Delete images dir setting
  const handleDeleteImagesDir = async () => {
    await apiDeleteImagesDir()
    const path = await getImagesDir()
    setImagesDir(path)
    const names = await fetchImageList()
    setImageNames(names)
    setSelectedIdx(0)
  }

  // Load annotation when current image changes
  useEffect(() => {
    if (!currentName) return

    fetchAnnotation(currentName).then(data => {
      setBboxesByFile(prev => ({ ...prev, [currentName]: data.bboxes }))
      if (data.classes.length > 0) {
        setClasses(prev => {
          const merged = [...new Set([...prev, ...data.classes])]
          return merged
        })
      }
    })
  }, [currentName])

  const nextImage = useCallback(() => {
    setSelectedIdx(i => Math.min(i + 1, imageNames.length - 1))
  }, [imageNames.length])

  const prevImage = useCallback(() => {
    setSelectedIdx(i => Math.max(i - 1, 0))
  }, [])

  const handleAddBbox = useCallback((box: Omit<BBox, 'id'>) => {
    if (!currentName) return
    const uniqueId = Date.now().toString() + Math.random().toString().substring(2, 6)
    const newBbox: BBox = {
      ...box,
      id: uniqueId
    }

    setBboxesByFile(prev => ({
      ...prev,
      [currentName]: [...(prev[currentName] || []), newBbox]
    }))
  }, [currentName])

  const handleDeleteBbox = useCallback((id: string) => {
    if (!currentName) return
    setBboxesByFile(prev => ({
      ...prev,
      [currentName]: (prev[currentName] || []).filter(b => b.id !== id)
    }))
  }, [currentName])

  // Auto-save to backend when annotations change
  useEffect(() => {
    if (!currentName) return

    const timeoutId = setTimeout(() => {
      const bboxes = bboxesByFile[currentName]
      if (bboxes !== undefined) {
        setIsSaving(true)
        saveAnnotation(currentName, { bboxes, classes })
          .then(() => setLastSaved(new Date()))
          .finally(() => setIsSaving(false))
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [bboxesByFile, classes, currentName])

  // Export COCO format
  const handleExportCOCO = async () => {
    const categoriesList = classes.map((cls, idx) => ({
      id: idx + 1,
      name: cls,
      supercategory: "none"
    }))

    const imagesList: any[] = []
    const annotationsList: any[] = []
    let annotationId = 1

    for (let i = 0; i < imageNames.length; i++) {
      const name = imageNames[i]
      const size = imageSizes[name] || { width: 640, height: 480 }
      const imageId = i + 1

      imagesList.push({
        id: imageId,
        file_name: name,
        width: size.width,
        height: size.height
      })

      const boxes = bboxesByFile[name] || []
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

  // Build File-like object for Canvas compatibility
  const currentFile = currentName ? {
    name: currentName,
    type: "image/jpeg",
    url: getImageUrl(currentName)
  } : null

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. Main Canvas Area */}
      <Canvas
        currentFile={currentFile}
        imageFilesCount={imageNames.length}
        selectedIdx={selectedIdx}
        bboxes={currentBboxes}
        selectedClass={selectedClass}
        classes={classes}
        onNextImage={nextImage}
        onPrevImage={prevImage}
        onAddBbox={handleAddBbox}
        onImageSizeLoaded={(width, height) => {
          if (currentName) {
            setImageSizes(prev => {
              if (prev[currentName]?.width === width && prev[currentName]?.height === height) {
                return prev
              }
              return { ...prev, [currentName]: { width, height } }
            })
          }
        }}
      />

      {/* 2. Controls and Metadata Panels below the Canvas */}
      <LabelInfo
        currentFile={currentFile}
        imageFilesCount={imageNames.length}
        bboxes={currentBboxes}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        classes={classes}
        setClasses={setClasses}
        onDeleteBbox={handleDeleteBbox}
        imageSizes={imageSizes}
        imagesDir={imagesDir}
        onSetImagesDir={handleSetImagesDir}
        onDeleteImagesDir={handleDeleteImagesDir}
        onExportCOCO={handleExportCOCO}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRefreshImages={handleRefreshImages}
      />
    </div>
  )
}
