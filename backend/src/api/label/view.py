from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pathlib import Path

from .models import AnnotationData, BBox
from . import crud

router = APIRouter(prefix="/api/label", tags=["label"])


@router.get("/images")
def list_images(request: Request) -> dict:
    images_dir: Path = request.app.state.images_dir
    extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    if not images_dir.exists():
        return {"images": []}

    images = [
        str(f.relative_to(images_dir))
        for f in images_dir.rglob("*")
        if f.is_file() and f.suffix.lower() in extensions
    ]
    images.sort()
    return {"images": images}


@router.get("/images/{filename:path}")
def stream_image(request: Request, filename: str):
    images_dir: Path = request.app.state.images_dir
    file_path = images_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    def iter_file():
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    media_type = "image/jpeg"
    if filename.lower().endswith(".png"):
        media_type = "image/png"
    elif filename.lower().endswith(".webp"):
        media_type = "image/webp"

    return StreamingResponse(iter_file(), media_type=media_type)


@router.get("/annotations/{image_name:path}")
def get_annotation(request: Request, image_name: str) -> AnnotationData:
    annotation = crud.get_annotation(request, image_name)
    if annotation is None:
        return AnnotationData(bboxes=[], classes=[])
    return annotation


@router.put("/annotations/{image_name:path}")
def save_annotation(request: Request, image_name: str, data: AnnotationData):
    crud.save_annotation(request, image_name, data)
    return {"status": "ok"}
