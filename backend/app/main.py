from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import patients, alerts, analytics, ai_insights, auth

# Create FastAPI application
app = FastAPI(
    title="CarePulse — AI-Enhanced Smart Diaper Monitoring API",
    description=(
        "CarePulse Backend API providing real-time smart diaper telemetry, patient status "
        "tracking, alert escalation systems, historical analytics, and AI health insights. "
        "Designed for geriatric, rehabilitation, and long-term care facilities."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── Configure CORS Middleware ─────────────────────────────────
# Allow access from the React frontend running locally
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ──────────────────────────────────────────
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(analytics.dashboard_router)
app.include_router(ai_insights.router)

# ── Endpoints ─────────────────────────────────────────────────

@app.get("/", tags=["system"])
def read_root():
    """
    API Root Endpoint showing service metadata.
    """
    return {
        "title": "CarePulse API",
        "description": "Smart Diaper Monitoring & AI Analytics System",
        "version": "1.0.0",
        "status": "active",
        "docs_url": "/docs"
    }

@app.get("/health", tags=["system"])
def read_health():
    """
    Basic health check endpoint to confirm API service status.
    """
    return {
        "status": "healthy",
        "database": "connected"
    }
