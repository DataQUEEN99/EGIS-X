from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import ServiceModel, ServiceDependencyModel
from app.schemas.schemas import ServiceResponse, DependencyResponse
from app.services.telemetry_service import seed_initial_topology_if_empty

router = APIRouter(prefix="/services", tags=["Services & Topology Graph"])

@router.get("", response_model=List[ServiceResponse])
def get_all_services(db: Session = Depends(get_db)):
    seed_initial_topology_if_empty(db)
    return db.query(ServiceModel).all()

@router.get("/dependencies", response_model=List[DependencyResponse])
def get_all_dependencies(db: Session = Depends(get_db)):
    seed_initial_topology_if_empty(db)
    return db.query(ServiceDependencyModel).all()

@router.get("/graph")
def get_dependency_graph_format(db: Session = Depends(get_db)):
    seed_initial_topology_if_empty(db)
    services = db.query(ServiceModel).all()
    deps = db.query(ServiceDependencyModel).all()
    
    nodes = []
    for s in services:
        nodes.append({
            "id": s.id,
            "name": s.name,
            "display_name": s.display_name,
            "type": s.type,
            "tier": s.tier,
            "status": s.status,
            "cpu_limit": s.cpu_limit,
            "memory_limit_mb": s.memory_limit_mb
        })
        
    edges = []
    for d in deps:
        edges.append({
            "id": d.id,
            "source": d.source_service_id,
            "target": d.target_service_id,
            "type": d.dependency_type,
            "criticality": d.criticality,
            "is_inferred": d.is_inferred
        })
        
    return {"nodes": nodes, "edges": edges}
