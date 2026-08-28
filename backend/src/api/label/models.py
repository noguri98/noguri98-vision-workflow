from pydantic import BaseModel
from typing import List


class BBox(BaseModel):
    id: str
    label: str
    xMin: float
    yMin: float
    xMax: float
    yMax: float


class AnnotationData(BaseModel):
    bboxes: List[BBox]
    classes: List[str]
