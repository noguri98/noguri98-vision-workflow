from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from pydantic import BaseModel
from pathlib import Path
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.images_dir = Path(os.getenv("IMAGES_DIR", "./images"))
app.state.annotations_dir = Path(os.getenv("ANNOTATIONS_DIR", "./annotations"))

config_router = APIRouter(prefix="/api/config", tags=["config"])

class DirPathRequest(BaseModel):
    path: str

@config_router.get("/images-dir")
def get_images_dir(request: Request):
    return {"path": str(request.app.state.images_dir)}

@config_router.put("/images-dir")
def set_images_dir(request: Request, req: DirPathRequest):
    p = Path(req.path)
    if not p.exists():
        return {"error": "Directory not found"}, 404
    request.app.state.images_dir = p
    return {"path": str(request.app.state.images_dir)}

@config_router.delete("/images-dir")
def delete_images_dir(request: Request):
    request.app.state.images_dir = Path(os.getenv("IMAGES_DIR", "./images"))
    return {"path": str(request.app.state.images_dir)}

@config_router.get("/annotations-dir")
def get_annotations_dir(request: Request):
    return {"path": str(request.app.state.annotations_dir)}

@config_router.put("/annotations-dir")
def set_annotations_dir(request: Request, req: DirPathRequest):
    p = Path(req.path)
    p.mkdir(parents=True, exist_ok=True)
    request.app.state.annotations_dir = p
    return {"path": str(request.app.state.annotations_dir)}

app.include_router(config_router)

from api.label.view import router as label_router
app.include_router(label_router)


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
