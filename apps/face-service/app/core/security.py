import os
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv()

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "secret_internal_key_change_me_in_production")


async def verify_internal_key(x_internal_key: str = Header(..., alias="X-Internal-Key")):
    """
    Validates that incoming requests contain the correct X-Internal-Key header.
    Used to secure internal API endpoints accessed by Laravel backend.
    """
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Key header"
        )
    return x_internal_key
