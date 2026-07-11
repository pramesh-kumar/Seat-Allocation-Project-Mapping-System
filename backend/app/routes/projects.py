from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import crud, schemas, models
from app.database import get_db
from app.auth import RoleChecker

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[schemas.ProjectOut])
def read_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_projects(db, skip=skip, limit=limit, search=search)

@router.get("/{project_id}", response_model=schemas.ProjectOut)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_proj = crud.get_project(db, project_id)
    if db_proj is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_proj

@router.post("", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Project Lead", "Admin"}))
):
    if crud.get_project_by_code(db, project.project_code):
        raise HTTPException(status_code=400, detail="Project code already exists")
    return crud.create_project(db, project)

@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Project Lead", "Admin"}))
):
    db_proj = crud.get_project(db, project_id)
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.update_project(db, project_id, project_update)

@router.post("/{project_id}/assign", status_code=status.HTTP_200_OK)
def assign_employee(
    project_id: int,
    employee_id: int = Query(..., description="ID of the employee to assign"),
    is_primary: bool = Query(True, description="Whether this is the primary project for the employee"),
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Project Lead", "Admin"}))
):
    # Verify employee and project exist
    db_employee = crud.get_employee(db, employee_id)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    db_proj = crud.get_project(db, project_id)
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    crud.assign_employee_to_project(db, employee_id, project_id, is_primary)
    return {"message": f"Successfully assigned employee {db_employee.full_name} to project {db_proj.name}."}

@router.post("/{project_id}/remove", status_code=status.HTTP_200_OK)
def remove_employee(
    project_id: int,
    employee_id: int = Query(..., description="ID of the employee to remove"),
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Project Lead", "Admin"}))
):
    # Verify employee and project exist
    db_employee = crud.get_employee(db, employee_id)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    db_proj = crud.get_project(db, project_id)
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    success = crud.remove_employee_from_project(db, employee_id, project_id)
    if not success:
        raise HTTPException(status_code=400, detail="Employee is not mapped to this project")
    return {"message": f"Successfully removed employee {db_employee.full_name} from project {db_proj.name}."}
