from pydantic import BaseModel

class JunctionResponse(BaseModel):
    id: int
    name: str
    region: str
    latitude: float
    longitude: float
    conflict_score: float
    pedestrian_exposure: float
    vehicle_exposure: float
    infrastructure_score: float
    historical_crashes: float
    peak_hour_score: float
    explanation: str

    class Config:
        from_attributes = True

class InterventionRequest(BaseModel):
    junction_id: int
    intervention_type: str