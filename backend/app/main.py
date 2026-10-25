"""InsureSight FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DATA_PATH
from app.services.model_service import init_registry
from app.routers import predict, explain, dashboard, models, eda, profiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("insuresight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Train models on startup, clean up on shutdown."""
    logger.info("=== InsureSight startup: training models from %s ===", DATA_PATH)
    init_registry(DATA_PATH)
    logger.info("=== Models ready ===")
    yield
    logger.info("=== InsureSight shutdown ===")


app = FastAPI(
    title="InsureSight API",
    description="Explainable AI-Based Insurance Claim Prediction and Risk Assessment",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(predict.router)
app.include_router(explain.router)
app.include_router(dashboard.router)
app.include_router(models.router)
app.include_router(eda.router)
app.include_router(profiles.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "service": "InsureSight"}
