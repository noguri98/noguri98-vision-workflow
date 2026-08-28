import json
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import Request
from .models import AnnotationData, BBox


def _find_coco_json(images_dir: Path) -> Optional[Path]:
    """이미지 디렉토리에서 COCO 형식 JSON 파일 찾기"""
    for f in images_dir.glob("*.json"):
        try:
            with open(f, "r") as fp:
                data = json.load(fp)
            if "images" in data and "annotations" in data and "categories" in data:
                return f
        except (json.JSONDecodeError, KeyError):
            continue
    return None


def _load_coco_data(images_dir: Path) -> Dict[str, Any]:
    """COCO JSON에서 전체 데이터 로드"""
    coco_path = _find_coco_json(images_dir)
    if not coco_path:
        return {"images": [], "annotations": [], "categories": [], "path": None}

    with open(coco_path, "r") as f:
        data = json.load(f)
    data["path"] = str(coco_path)
    return data


def _coco_to_bbox(annotation: dict, images: list) -> Optional[tuple]:
    """COCO annotation을 BBox 형식으로 변환 (image_name, BBox)"""
    image = next((img for img in images if img["id"] == annotation["image_id"]), None)
    if not image:
        return None

    img_w = image["width"]
    img_h = image["height"]
    x, y, w, h = annotation["bbox"]

    return (
        image["file_name"],
        BBox(
            id=str(annotation["id"]),
            label="",  # category_id로 나중에 매핑
            xMin=round(x / img_w, 6),
            yMin=round(y / img_h, 6),
            xMax=round((x + w) / img_w, 6),
            yMax=round((y + h) / img_h, 6),
        ),
    )


def get_annotation(request: Request, image_name: str) -> Optional[AnnotationData]:
    """특정 이미지의 어노테이션 조회 (COCO JSON에서 로드)"""
    images_dir: Path = request.app.state.images_dir
    coco_data = _load_coco_data(images_dir)

    if not coco_data["annotations"]:
        # 기존 annotations 서버 디렉토리도 확인
        return _get_from_server_dir(request, image_name)

    images = coco_data["images"]
    categories = {cat["id"]: cat["name"] for cat in coco_data["categories"]}

    bboxes = []
    for ann in coco_data["annotations"]:
        result = _coco_to_bbox(ann, images)
        if result and result[0] == image_name:
            bbox = result[1]
            bbox.label = categories.get(ann["category_id"], "unknown")
            bboxes.append(bbox)

    classes = list(categories.values())
    return AnnotationData(bboxes=bboxes, classes=classes)


def _get_from_server_dir(request: Request, image_name: str) -> Optional[AnnotationData]:
    """서버 annotations 디렉토리에서 로드 (fallback)"""
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
    """어노테이션 저장 (기존 COCO JSON과 병합)"""
    images_dir: Path = request.app.state.images_dir
    coco_data = _load_coco_data(images_dir)

    if coco_data["path"]:
        _merge_and_save_coco(coco_data, image_name, data)
    else:
        _save_to_server_dir(request, image_name, data)


def _merge_and_save_coco(coco_data: dict, image_name: str, new_data: AnnotationData) -> None:
    """COCO JSON에 새 어노테이션 병합 저장"""
    coco_path = Path(coco_data["path"])
    images = coco_data["images"]
    categories = {cat["name"]: cat["id"] for cat in coco_data["categories"]}

    # 새 클래스가 있으면 카테고리에 추가
    for cls in new_data.classes:
        if cls not in categories:
            new_id = max(categories.values(), default=0) + 1
            categories[cls] = new_id
            coco_data["categories"].append({
                "id": new_id,
                "name": cls,
                "supercategory": "none"
            })

    # 기존 해당 이미지의 어노테이션 제거
    image = next((img for img in images if img["file_name"] == image_name), None)
    if image:
        coco_data["annotations"] = [
            ann for ann in coco_data["annotations"]
            if ann["image_id"] != image["id"]
        ]

        # 새 어노테이션 추가
        max_ann_id = max((ann["id"] for ann in coco_data["annotations"]), default=0)
        img_w = image["width"]
        img_h = image["height"]

        for bbox in new_data.bboxes:
            max_ann_id += 1
            x = bbox.xMin * img_w
            y = bbox.yMin * img_h
            w = (bbox.xMax - bbox.xMin) * img_w
            h = (bbox.yMax - bbox.yMin) * img_h

            coco_data["annotations"].append({
                "id": max_ann_id,
                "image_id": image["id"],
                "category_id": categories.get(bbox.label, 1),
                "bbox": [round(x, 1), round(y, 1), round(w, 1), round(h, 1)],
                "area": round(w * h, 1),
                "iscrowd": 0
            })

    # 저장
    categories_list = [
        {"id": cat["id"], "name": cat["name"], "supercategory": cat.get("supercategory", "none")}
        for cat in coco_data["categories"]
    ]

    output = {
        "info": coco_data.get("info", {}),
        "licenses": coco_data.get("licenses", []),
        "images": images,
        "annotations": coco_data["annotations"],
        "categories": categories_list
    }

    with open(coco_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def _save_to_server_dir(request: Request, image_name: str, data: AnnotationData) -> None:
    """서버 annotations 디렉토리에 저장 (COCO JSON이 없을 때 fallback)"""
    annotations_dir: Path = request.app.state.annotations_dir
    annotations_dir.mkdir(exist_ok=True)
    json_name = Path(image_name).stem + ".json"
    annotation_path = annotations_dir / json_name

    # 기존 파일이 있으면 병합
    existing = {}
    if annotation_path.exists():
        with open(annotation_path, "r") as f:
            existing = json.load(f)

    existing_bboxes = existing.get("bboxes", [])
    existing_ids = {b["id"] for b in existing_bboxes}

    # 새 bbox 추가 (기존 ID와 충돌 방지)
    merged_bboxes = list(existing_bboxes)
    for bbox in data.bboxes:
        if bbox.id not in existing_ids:
            merged_bboxes.append(bbox.model_dump())

    merged_classes = list(set(existing.get("classes", []) + data.classes))

    with open(annotation_path, "w") as f:
        json.dump({"bboxes": merged_bboxes, "classes": merged_classes}, f, indent=2)
