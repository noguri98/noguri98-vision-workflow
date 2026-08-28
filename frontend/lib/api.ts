const API_BASE = "http://localhost:8000/api"
const LABEL_API = `${API_BASE}/label`
const CONFIG_API = `${API_BASE}/config`

export interface BBox {
  id: string
  label: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

export interface AnnotationData {
  bboxes: BBox[]
  classes: string[]
}

// 디렉토리 설정
export async function getImagesDir(): Promise<string> {
  const res = await fetch(`${CONFIG_API}/images-dir`)
  const data = await res.json()
  return data.path
}

export async function setImagesDir(path: string): Promise<void> {
  await fetch(`${CONFIG_API}/images-dir`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  })
}

export async function deleteImagesDir(): Promise<string> {
  const res = await fetch(`${CONFIG_API}/images-dir`, {
    method: "DELETE",
  })
  const data = await res.json()
  return data.path
}

// 이미지 목록 조회
export async function fetchImageList(): Promise<string[]> {
  const res = await fetch(`${LABEL_API}/images`)
  const data = await res.json()
  return data.images
}

// 이미지 URL 생성 (스트리밍)
export function getImageUrl(filename: string): string {
  return `${LABEL_API}/images/${encodeURIComponent(filename)}`
}

// 어노테이션 조회
export async function fetchAnnotation(imageName: string): Promise<AnnotationData> {
  const res = await fetch(`${LABEL_API}/annotations/${encodeURIComponent(imageName)}`)
  if (!res.ok) {
    return { bboxes: [], classes: [] }
  }
  return res.json()
}

// 어노테이션 저장
export async function saveAnnotation(imageName: string, data: AnnotationData): Promise<void> {
  await fetch(`${LABEL_API}/annotations/${encodeURIComponent(imageName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}
