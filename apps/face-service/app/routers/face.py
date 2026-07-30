from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.security import verify_internal_key
from app.services.recognition import encode_face, verify_face

router = APIRouter(prefix="", tags=["Face Recognition"])


class EncodeRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image string")


class VerifyRequest(BaseModel):
    image: str = Field(..., description="Candidate Base64 encoded image string")
    known_encoding: List[float] = Field(..., description="Registered 128-dimensional face encoding vector")


@router.post("/encode")
async def encode(
    payload: EncodeRequest,
    internal_key: str = Depends(verify_internal_key)
):
    """
    Generate 128-d face encoding from a base64 encoded image.
    Requires X-Internal-Key header.
    """
    result = encode_face(payload.image)
    return result


@router.post("/verify")
async def verify(
    payload: VerifyRequest,
    internal_key: str = Depends(verify_internal_key)
):
    """
    Perform 1:1 face verification comparing candidate image against registered known_encoding.
    Requires X-Internal-Key header.
    """
    result = verify_face(payload.image, payload.known_encoding)
    return result
