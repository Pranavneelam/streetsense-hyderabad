from sqlalchemy import Column, Integer, String, Float
from backend.database import Base

class Junction(Base):
    __tablename__ = "junctions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    region = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    conflict_score = Column(Float)
    pedestrian_exposure = Column(Float)
    vehicle_exposure = Column(Float)
    infrastructure_score = Column(Float)
    historical_crashes = Column(Float)
    peak_hour_score = Column(Float)
    explanation = Column(String)