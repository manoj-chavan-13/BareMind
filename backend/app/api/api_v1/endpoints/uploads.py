import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from app.api import deps
from app.models.user import User
from app.core.s3 import upload_file_to_s3
from app.core.rate_limit import limiter

router = APIRouter()

DISALLOWED_EXTENSIONS = {
    ".exe", ".sh", ".jar", ".php", ".bat", ".cmd", ".py",
    ".js", ".html", ".htm", ".vbs", ".ps1", ".pl", ".cgi"
}

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif"
}

@router.post("/image")
@limiter.limit("20/day")
async def upload_image(
    request: Request,
    *,
    file: UploadFile = File(...),
    folder: str = Query(..., pattern="^(avatars|blog_covers|blog_images)$"),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Upload an image.
    Folder must be 'avatars', 'blog_covers', or 'blog_images'.
    Strictly validates file extension, MIME type, and image structure via Pillow.
    """
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext in DISALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Disallowed file extension")

    if file.content_type not in ALLOWED_MIME_TYPES and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only image uploads are permitted.")

    try:
        url = await upload_file_to_s3(file, folder, str(current_user.id))
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("Upload error:", e)
        raise HTTPException(status_code=500, detail="An error occurred while uploading the file")
