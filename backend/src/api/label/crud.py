import json
from pathlib import Path
from typing import Optional
from fastapi import Request
from .models import AnnotationData


def get_annotation(request: Request, image_name: str) -> Optional[AnnotationData]:
    annotations_dir: Path = request.app.state.annotations_dir
    annotations_dir.mkdir(exist_ok=True)
    json_name = Path(image_name).stem + ".json"
    annotation_path = annotations_dir / json_name

    if not annotation_path.exists():
        return None

    with open(annotation_path, "r") as f:
        data = json.load(f)
        return AnnotationData(**data)


def save_annotation(request: Request, image_name: str, data: AnnotationData) -> None:
    annotations_dir: Path = request.app.state.annotations_dir
    annotations_dir.mkdir(exist_ok=True)
    json_name = Path(image_name).stem + ".json"
    annotation_path = annotations_dir / json_name

    with open(annotation_path, "w") as f:
        json.dump(data.model_dump(), f, indent=2)
