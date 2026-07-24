import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from typing import Optional
from app.core.config import settings
import uuid
import os
import io
from PIL import Image

def get_s3_client():
    if not settings.S3_BUCKET_NAME or not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        return None
        
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def validate_and_compress_image(file_bytes: bytes, max_size_mb: int = 5) -> tuple[bytes, str, str]:
    """
    Validates that the file is an image using Pillow (preventing malicious files).
    Checks file size to prevent resource exhaustion.
    Preserves PNGs and GIFs untouched.
    Compresses/converts others to a web-friendly format (WebP).
    """
    # 1. Size check
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise ValueError(f"File size exceeds {max_size_mb}MB limit")

    # 2. Magic byte / format validation via Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()  # Verify it's structurally an image
    except Exception:
        raise ValueError("Invalid image file")

    # Re-open for processing because verify() closes the file
    image = Image.open(io.BytesIO(file_bytes))
    
    if image.format == "PNG":
        return file_bytes, "png", "image/png"
    elif image.format == "GIF":
        return file_bytes, "gif", "image/gif"
    
    # 3. Strip EXIF data (privacy) & convert to RGB (if RGBA/P)
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
        
    # 4. Save to buffer as WebP
    output_buffer = io.BytesIO()
    image.save(output_buffer, format="WEBP", quality=85)
    return output_buffer.getvalue(), "webp", "image/webp"

async def upload_file_to_s3(file: UploadFile, folder: str, user_id: str) -> str:
    """
    Uploads a validated image to S3 and returns the public URL or CDN URL.
    """
    file_bytes = await file.read()
    
    # Validate and process
    try:
        processed_bytes, ext, content_type = validate_and_compress_image(file_bytes)
    except ValueError as e:
        raise e
        
    # Generate secure random filename
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    s3_client = get_s3_client()
    
    if not s3_client or not settings.S3_BUCKET_NAME:
        print("S3 Upload Error: S3 client or bucket name is not configured.")
        raise Exception("S3 configuration is missing")

    bucket_name = settings.S3_BUCKET_NAME.lower()

    try:
        s3_key = f"{folder}/{user_id}/{filename}"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=processed_bytes,
            ContentType=content_type
        )
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "NoSuchBucket":
            print(f"Bucket {bucket_name} does not exist. Attempting to create...")
            try:
                if settings.AWS_REGION == "us-east-1":
                    s3_client.create_bucket(Bucket=bucket_name)
                else:
                    s3_client.create_bucket(
                        Bucket=bucket_name,
                        CreateBucketConfiguration={'LocationConstraint': settings.AWS_REGION}
                    )
                
                # Make bucket public so images are viewable
                s3_client.delete_public_access_block(Bucket=bucket_name)
                import json
                s3_client.put_bucket_policy(
                    Bucket=bucket_name,
                    Policy=json.dumps({
                        "Version": "2012-10-17",
                        "Statement": [{
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{bucket_name}/*"
                        }]
                    })
                )

                # Retry upload
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=s3_key,
                    Body=processed_bytes,
                    ContentType=content_type
                )
            except ClientError as create_e:
                print("S3 Bucket Creation Error:", create_e)
                raise Exception("Failed to create S3 bucket and upload")
        else:
            print("S3 Upload Error:", e)
            raise Exception("Failed to upload to S3")

    if settings.CDN_DOMAIN:
        return f"https://{settings.CDN_DOMAIN}/{s3_key}"
    return f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
