import os
from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers.face import router as face_router

load_dotenv()

app = FastAPI(
    title="Face Recognition Microservice",
    version="1.0.0",
    description="Internal microservice for face encoding & verification"
)

app.include_router(face_router)


@app.get("/health")
async def health_check():
    """
    Public health check endpoint.
    Returns 200 OK with status ok.
    """
    return {"status": "ok"}
