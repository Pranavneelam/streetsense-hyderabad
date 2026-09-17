from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import engine, Base, get_db
from backend.models import Junction
from backend.schemas import JunctionResponse, InterventionRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StreetSense Hyderabad API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to StreetSense Hyderabad & Telangana API - Cyberabad Mobility Datajam"}

@app.get("/api/junctions", response_model=List[JunctionResponse])
def get_junctions(
    region: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Junction)
    if region:
        query = query.filter(Junction.region.ilike(f"%{region}%"))
    if min_score is not None:
        query = query.filter(Junction.conflict_score >= min_score)
    return query.all()

@app.post("/api/simulate-intervention")
def simulate_intervention(payload: InterventionRequest, db: Session = Depends(get_db)):
    junction = db.query(Junction).filter(Junction.id == payload.junction_id).first()
    if not junction:
        raise HTTPException(status_code=404, detail="Junction not found")
    
    current_score = junction.conflict_score
    new_score = current_score
    
    if payload.intervention_type == "Add pedestrian crossing":
        new_score = max(10.0, current_score - 18.0)
    elif payload.intervention_type == "Add pedestrian signal":
        new_score = max(10.0, current_score - 24.0)
    elif payload.intervention_type == "Relocate bus stop":
        new_score = max(10.0, current_score - 11.0)
    elif payload.intervention_type == "Signal + crossing":
        new_score = max(10.0, current_score - 38.0)

    return {
        "junction_id": junction.id,
        "junction_name": junction.name,
        "original_score": current_score,
        "intervention": payload.intervention_type,
        "simulated_score": round(new_score, 1)
    }