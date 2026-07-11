import re
import datetime
import urllib.request
import json
import os
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models, crud, schemas

def call_gemini_api(query_text: str, api_key: str) -> dict:
    """
    Calls Google's Gemini API betav1 endpoint to parse query intent and entities as a structured JSON object.
    Uses standard urllib to avoid requiring external client SDK installations.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
    
    system_instruction = (
        "You are a structured intent and entity extractor for a Seat Allocation & Project Mapping System. "
        "Read the user's natural language query and output a JSON object containing the matched intent and extracted entities. "
        "Do not return any markdown formatting, extra comments, or code block wrappers. Output raw JSON only.\n\n"
        "Available Intents and their entity fields:\n"
        "- 'find_employee_seat': Look up where an employee is sitting. Entities: 'target' (employee ID like EMP-xxxxx or full name)\n"
        "- 'find_seat_occupant': Look up who sits at a specific seat code. Entities: 'seat_code' (standard format FLx-Z-y-Szzz)\n"
        "- 'project_proximity': Recommend available seats near a project team. Entities: 'project_query' (project code like PRJ-xxxx or name)\n"
        "- 'floor_occupancy': Get utilization stats of a floor. Entities: 'floor' (number 1-5)\n"
        "- 'department_occupancy': Get utilization stats of a department. Entities: 'department' (name of department)\n"
        "- 'list_onboarding': List onboarding staff or new joiners. Entities: {}\n"
        "- 'assign_seat': Allocate a seat to an employee. Entities: 'seat_code', 'target'\n"
        "- 'release_seat': Release/vacate a seat. Entities: 'seat_code'\n"
        "- 'project_manager': Look up who is the manager or lead of a project. Entities: 'project_query' (project name or code like PRJ-xxxx)\n\n"
        "Output JSON Format:\n"
        "{\n"
        "  \"intent\": \"intent_name_or_unknown\",\n"
        "  \"entities\": {\n"
        "     \"target\": \"Ronald Ward\",\n"
        "     \"seat_code\": \"FL1-Z-B-S002\",\n"
        "     \"project_query\": \"APOLLO\",\n"
        "     \"floor\": 3,\n"
        "     \"department\": \"Engineering\"\n"
        "  }\n"
        "}"
    )
    
    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"User Query: \"{query_text}\""
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {
                    "text": system_instruction
                }
            ]
        },
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        req_data = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        # 3 seconds timeout to prevent blocking server threads
        with urllib.request.urlopen(req, timeout=3) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            text_out = res_json['candidates'][0]['content']['parts'][0]['text']
            parsed_intent = json.loads(text_out.strip())
            return parsed_intent
    except Exception as e:
        print(f"[AI Assistant] LLM parse failed: {e}. Falling back to Regex parser.")
        return None

def parse_and_execute_query(db: Session, query_text: str, user_role: str = "Employee") -> schemas.AIQueryResponse:
    # Pre-clean query string: remove bullets, hyphens, surrounding quotes
    query_clean = query_text.strip()
    query_clean = re.sub(r'^[\s\-•*#\d\.\(\)]+', '', query_clean)
    query_clean = query_clean.strip('"\'')
    
    query_lower = query_clean.lower().strip()
    
    intent = None
    entities = {}
    
    # Check for active Google Gemini API key
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        llm_res = call_gemini_api(query_clean, api_key)
        if llm_res and isinstance(llm_res, dict):
            intent = llm_res.get("intent")
            entities = llm_res.get("entities") or {}
            print(f"[AI Assistant] LLM Parsed - Intent: {intent}, Entities: {entities}")

    # ---------------------------------------------------------
    # 1. ACTION: Assign Seat to Employee
    # ---------------------------------------------------------
    assign_seat = None
    assign_target = None
    
    if intent == "assign_seat":
        assign_seat = entities.get("seat_code")
        assign_target = entities.get("target")
    else:
        assign_match1 = re.search(r'(?:assign|allocate)\s+(?:seat\s+)?(fl[1-5]-z-[a-d]-s\d{3})\s+to\s+([a-zA-Z0-9\-\s\.\']+)', query_lower)
        assign_match2 = re.search(r'(?:assign|allocate)\s+([a-zA-Z0-9\-\s\.\']+)\s+to\s+(?:seat\s+)?(fl[1-5]-z-[a-d]-s\d{3})', query_lower)
        if assign_match1:
            assign_seat = assign_match1.group(1).upper()
            assign_target = assign_match1.group(2).strip()
        elif assign_match2:
            assign_target = assign_match2.group(1).strip()
            assign_seat = assign_match2.group(2).upper()
            
    if assign_seat and assign_target:
        if user_role not in ["HR", "Admin"]:
            return schemas.AIQueryResponse(
                response_text=f"Unauthorized: Your role ({user_role}) does not have permission to allocate seats. Only HR and Admin can perform seat allocations.",
                intent="assign_seat",
                entities={"seat_code": assign_seat, "target": assign_target},
                data=None
            )
            
        seat = crud.get_seat_by_code(db, assign_seat)
        if not seat:
            return schemas.AIQueryResponse(
                response_text=f"Seat {assign_seat} was not found in the system.",
                intent="assign_seat",
                entities={"seat_code": assign_seat, "target": assign_target},
                data=None
            )
        if seat.status in ["OCCUPIED", "MAINTENANCE"]:
            occupant_text = ""
            if seat.status == "OCCUPIED":
                alloc = db.query(models.SeatAllocation).filter(models.SeatAllocation.seat_id == seat.id, models.SeatAllocation.released_at.is_(None)).first()
                if alloc and alloc.employee_id:
                    emp = db.query(models.Employee).filter(models.Employee.id == alloc.employee_id).first()
                    if emp:
                        occupant_text = f" (currently occupied by {emp.full_name})"
            return schemas.AIQueryResponse(
                response_text=f"Cannot allocate seat {assign_seat} because it is currently {seat.status}{occupant_text}.",
                intent="assign_seat",
                entities={"seat_code": assign_seat, "target": assign_target},
                data=None
            )
            
        employee = None
        if str(assign_target).upper().startswith("EMP-"):
            employee = crud.get_employee_by_code(db, str(assign_target).upper())
        else:
            parts = str(assign_target).split()
            if len(parts) >= 2:
                first = parts[0]
                last = " ".join(parts[1:])
                employee = db.query(models.Employee).filter(
                    models.Employee.first_name.ilike(first),
                    models.Employee.last_name.ilike(last)
                ).first()
            if not employee:
                employee = db.query(models.Employee).filter(
                    or_(
                        models.Employee.first_name.ilike(str(assign_target)),
                        models.Employee.last_name.ilike(str(assign_target))
                    )
                ).first()
                
        if not employee:
            return schemas.AIQueryResponse(
                response_text=f"Could not find an employee matching '{assign_target}'. Try using their unique Employee ID (e.g. EMP-10001).",
                intent="assign_seat",
                entities={"seat_code": assign_seat, "target": assign_target},
                data=None
            )
            
        if employee.status == "EXITED":
            return schemas.AIQueryResponse(
                response_text=f"Employee {employee.full_name} has status EXITED and cannot be assigned a seat.",
                intent="assign_seat",
                entities={"seat_code": assign_seat, "target": assign_target},
                data=None
            )
            
        alloc = crud.allocate_seat(db, employee_id=employee.id, seat_id=seat.id, allocated_by=user_role)
        if employee.status == "ONBOARDING":
            employee.status = "ACTIVE"
            db.commit()
            
        return schemas.AIQueryResponse(
            response_text=f"Successfully allocated seat {assign_seat} to {employee.full_name} ({employee.employee_id}). Their status has been updated to ACTIVE.",
            intent="assign_seat",
            entities={"seat_code": assign_seat, "employee_id": employee.employee_id, "employee_name": employee.full_name},
            data=[{"seat_code": assign_seat, "employee_id": employee.employee_id, "name": employee.full_name, "status": employee.status}]
        )

    # ---------------------------------------------------------
    # 2. ACTION: Release Seat
    # ---------------------------------------------------------
    release_seat_code = None
    if intent == "release_seat":
        release_seat_code = entities.get("seat_code")
    else:
        release_match = re.search(r'(?:release|free|vacate)\s+(?:seat\s+)?(fl[1-5]-z-[a-d]-s\d{3})', query_lower)
        if release_match:
            release_seat_code = release_match.group(1).upper()
            
    if release_seat_code:
        release_seat_code = str(release_seat_code).upper()
        if user_role not in ["HR", "Admin"]:
            return schemas.AIQueryResponse(
                response_text=f"Unauthorized: Your role ({user_role}) does not have permission to release seats. Only HR and Admin can perform seat releases.",
                intent="release_seat",
                entities={"seat_code": release_seat_code},
                data=None
            )
            
        seat = crud.get_seat_by_code(db, release_seat_code)
        if not seat:
            return schemas.AIQueryResponse(
                response_text=f"Seat {release_seat_code} was not found in the system.",
                intent="release_seat",
                entities={"seat_code": release_seat_code},
                data=None
            )
            
        if seat.status != "OCCUPIED":
            return schemas.AIQueryResponse(
                response_text=f"Seat {release_seat_code} is already vacant (current status: {seat.status}).",
                intent="release_seat",
                entities={"seat_code": release_seat_code},
                data=None
            )
            
        occupant_name = "Employee"
        alloc = db.query(models.SeatAllocation).filter(models.SeatAllocation.seat_id == seat.id, models.SeatAllocation.released_at.is_(None)).first()
        if alloc and alloc.employee_id:
            emp = db.query(models.Employee).filter(models.Employee.id == alloc.employee_id).first()
            if emp:
                occupant_name = emp.full_name
                
        crud.release_seat(db, seat.id)
        return schemas.AIQueryResponse(
            response_text=f"Successfully released seat {release_seat_code} (previously occupied by {occupant_name}). It is now AVAILABLE.",
            intent="release_seat",
            entities={"seat_code": release_seat_code, "previous_occupant": occupant_name},
            data=[{"seat_code": release_seat_code, "status": "AVAILABLE"}]
        )

    # ---------------------------------------------------------
    # 3. QUERY: Proximity / Recommendations
    # ---------------------------------------------------------
    proj_target = None
    if intent == "project_proximity":
        proj_target = entities.get("project_query")
    else:
        proj_seat_match = re.search(r'(?:find|recommend|suggest)\s+(?:a\s+)?(?:free\s+)?seat\s+near\s+(?:project\s+)?([a-zA-Z0-9\-]+)', query_lower)
        proj_location_match = re.search(r'where\s+(?:do|does)\s+(?:project|members\s+of\s+project)?\s*([a-zA-Z0-9\-]+)\s+(?:sit|sitting|located)', query_lower)
        if proj_seat_match:
            proj_target = proj_seat_match.group(1).upper()
        elif proj_location_match:
            proj_target = proj_location_match.group(1).upper()
            
    if proj_target:
        proj_code = str(proj_target).upper()
        if not proj_code.startswith("PRJ-"):
            proj_code = f"PRJ-{proj_code}"
            
        project = crud.get_project_by_code(db, proj_code)
        if not project:
            project = db.query(models.Project).filter(models.Project.name.ilike(str(proj_target))).first()
            if not project:
                project = db.query(models.Project).filter(models.Project.name.ilike(f"Project {proj_target}")).first()
                
        if not project:
            return schemas.AIQueryResponse(
                response_text=f"Could not find a project matching '{proj_target}'. Make sure the project code or name is correct.",
                intent="project_proximity",
                entities={"project_query": proj_target},
                data=None
            )
            
        members_count = db.query(models.EmployeeProject).filter(models.EmployeeProject.project_id == project.id).count()
        member_seats = db.query(models.Seat).join(models.SeatAllocation).join(models.Employee).join(models.EmployeeProject).filter(
            models.EmployeeProject.project_id == project.id,
            models.SeatAllocation.released_at.is_(None)
        ).all()
        
        location_counts = {}
        for s in member_seats:
            key = f"Floor {s.floor}, Zone {s.zone}"
            location_counts[key] = location_counts.get(key, 0) + 1
            
        location_summary = ", ".join([f"{k} ({v} members)" for k, v in sorted(location_counts.items(), key=lambda x: x[1], reverse=True)])
        if not location_summary:
            location_summary = "no mapped seats yet"
            
        recommended_seats = []
        if member_seats:
            popular_loc = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[0][0]
            m = re.match(r'Floor\s+([1-5]),\s+Zone\s+([A-D])', popular_loc)
            if m:
                fl = int(m.group(1))
                zn = m.group(2)
                
                avail = db.query(models.Seat).filter(
                    models.Seat.floor == fl,
                    models.Seat.zone == zn,
                    models.Seat.status == "AVAILABLE"
                ).limit(5).all()
                recommended_seats.extend(avail)
                
        if len(recommended_seats) < 5:
            remaining = db.query(models.Seat).filter(models.Seat.status == "AVAILABLE").filter(
                ~models.Seat.id.in_([s.id for s in recommended_seats])
            ).limit(5 - len(recommended_seats)).all()
            recommended_seats.extend(remaining)
            
        recommended_codes = [s.seat_code for s in recommended_seats]
        
        return schemas.AIQueryResponse(
            response_text=f"Project '{project.name}' ({project.project_code}) has {members_count} members. Active seating is clustered in: {location_summary}. "
                          f"Recommended available seats nearby: {', '.join(recommended_codes[:3])}.",
            intent="project_proximity",
            entities={"project_id": project.id, "project_code": project.project_code, "project_name": project.name, "recommendations": recommended_codes},
            data=[{"id": s.id, "seat_code": s.seat_code, "floor": s.floor, "zone": s.zone, "status": s.status} for s in recommended_seats]
        )

    # ---------------------------------------------------------
    # 4. QUERY: Where is employee sitting?
    # ---------------------------------------------------------
    lookup_target = None
    if intent == "find_employee_seat":
        lookup_target = entities.get("target")
    else:
        where_match1 = re.search(r'where\s+(?:does|is)\s+([a-zA-Z0-9\-\s\.\']+)\s+(?:sit|sitting|located)', query_lower)
        where_match2 = re.search(r'find\s+([a-zA-Z0-9\-\s\.\']+)\s*(?:\'s)?\s*(?:seat|location)', query_lower)
        where_match3 = re.search(r'where\s+is\s+([a-zA-Z0-9\-\s\.\'\:]+)', query_lower)
        where_match4 = re.search(r'where\s+sits\s+([a-zA-Z0-9\-\s\.\'\:]+)', query_lower)
        
        if where_match1:
            lookup_target = where_match1.group(1).strip()
        elif where_match2:
            lookup_target = where_match2.group(1).strip()
        elif where_match3 and not query_lower.startswith("where is seat"):
            lookup_target = where_match3.group(1).strip()
        elif where_match4:
            lookup_target = where_match4.group(1).strip()
            
        if lookup_target:
            lookup_target = lookup_target.rstrip('?').strip()
            if lookup_target.lower() in ["a free", "free", "vacant", "a vacant", "seat", "desk"]:
                lookup_target = None
                
    if lookup_target and not str(lookup_target).upper().startswith("FL"):
        employee = None
        if str(lookup_target).upper().startswith("EMP-"):
            employee = crud.get_employee_by_code(db, str(lookup_target).upper())
        else:
            parts = str(lookup_target).split()
            if len(parts) >= 2:
                first = parts[0]
                last = " ".join(parts[1:])
                employee = db.query(models.Employee).filter(
                    models.Employee.first_name.ilike(first),
                    models.Employee.last_name.ilike(last)
                ).first()
            if not employee:
                employee = db.query(models.Employee).filter(
                    or_(
                        models.Employee.first_name.ilike(str(lookup_target)),
                        models.Employee.last_name.ilike(str(lookup_target))
                    )
                ).first()
                
        if not employee:
            return schemas.AIQueryResponse(
                response_text=f"Could not find an employee matching '{lookup_target}' in the database.",
                intent="find_employee_seat",
                entities={"target": lookup_target},
                data=None
            )
            
        alloc = db.query(models.SeatAllocation).filter(
            models.SeatAllocation.employee_id == employee.id,
            models.SeatAllocation.released_at.is_(None)
        ).first()
        
        if not alloc:
            status_text = ""
            if employee.status == "ONBOARDING":
                status_text = " (Onboarding - requires seat assignment)"
            elif employee.status == "EXITED":
                status_text = " (Exited from the company)"
            return schemas.AIQueryResponse(
                response_text=f"Employee {employee.full_name} ({employee.employee_id}) does not currently have an active seat allocation{status_text}.",
                intent="find_employee_seat",
                entities={"employee_id": employee.employee_id, "name": employee.full_name, "status": employee.status},
                data=[{"employee_id": employee.employee_id, "name": employee.full_name, "status": employee.status, "seat_code": None}]
            )
            
        seat = db.query(models.Seat).filter(models.Seat.id == alloc.seat_id).first()
        return schemas.AIQueryResponse(
            response_text=f"Employee {employee.full_name} ({employee.employee_id}) is sitting at seat {seat.seat_code} on Floor {seat.floor}, Zone {seat.zone}.",
            intent="find_employee_seat",
            entities={"employee_id": employee.employee_id, "name": employee.full_name, "seat_code": seat.seat_code, "floor": seat.floor, "zone": seat.zone},
            data=[{
                "employee_id": employee.employee_id,
                "name": employee.full_name,
                "seat_code": seat.seat_code,
                "floor": seat.floor,
                "zone": seat.zone,
                "department": employee.department,
                "role": employee.role
            }]
        )

    # ---------------------------------------------------------
    # 5. QUERY: Who sits at seat X?
    # ---------------------------------------------------------
    seat_code = None
    if intent == "find_seat_occupant":
        seat_code = entities.get("seat_code")
    else:
        seat_match = re.search(r'(?:who\s+(?:sits|is)\s+at|where\s+is\s+seat)\s+(?:seat\s+)?(fl[1-5]-z-[a-d]-s\d{3})', query_lower)
        if seat_match:
            seat_code = seat_match.group(1).upper()
            
    if seat_code:
        seat_code = str(seat_code).upper()
        seat = crud.get_seat_by_code(db, seat_code)
        if not seat:
            return schemas.AIQueryResponse(
                response_text=f"Seat {seat_code} was not found in the system. Make sure you use the format FL1-Z-A-S001.",
                intent="find_seat_occupant",
                entities={"seat_code": seat_code},
                data=None
            )
            
        if seat.status != "OCCUPIED":
            return schemas.AIQueryResponse(
                response_text=f"Seat {seat_code} is currently {seat.status}. There is no active occupant.",
                intent="find_seat_occupant",
                entities={"seat_code": seat_code, "status": seat.status},
                data=[{"seat_code": seat_code, "status": seat.status, "occupant": None}]
            )
            
        alloc = db.query(models.SeatAllocation).filter(
            models.SeatAllocation.seat_id == seat.id,
            models.SeatAllocation.released_at.is_(None)
        ).first()
        
        if not alloc or not alloc.employee_id:
            return schemas.AIQueryResponse(
                response_text=f"Seat {seat_code} is marked OCCUPIED but has no valid employee assigned.",
                intent="find_seat_occupant",
                entities={"seat_code": seat_code, "status": seat.status},
                data=None
            )
            
        emp = db.query(models.Employee).filter(models.Employee.id == alloc.employee_id).first()
        return schemas.AIQueryResponse(
            response_text=f"Seat {seat_code} is occupied by {emp.full_name} ({emp.employee_id}), a {emp.role} in the {emp.department} department.",
            intent="find_seat_occupant",
            entities={"seat_code": seat_code, "status": seat.status, "employee_id": emp.employee_id, "employee_name": emp.full_name},
            data=[{
                "seat_code": seat_code,
                "status": seat.status,
                "employee_id": emp.employee_id,
                "name": emp.full_name,
                "department": emp.department,
                "role": emp.role
            }]
        )

    # ---------------------------------------------------------
    # 6. QUERY: Occupancy / Metrics on Floors or Departments
    # ---------------------------------------------------------
    floor_num = None
    if intent == "floor_occupancy":
        try:
            floor_num = int(entities.get("floor"))
        except:
            pass
    else:
        occ_floor_match = re.search(r'occupancy.*floor\s*([1-5])|floor\s*([1-5]).*occupancy', query_lower)
        if occ_floor_match:
            floor_num = int(occ_floor_match.group(1) or occ_floor_match.group(2))
            
    if floor_num:
        total = db.query(models.Seat).filter(models.Seat.floor == floor_num).count()
        occupied = db.query(models.Seat).filter(models.Seat.floor == floor_num, models.Seat.status == "OCCUPIED").count()
        avail = db.query(models.Seat).filter(models.Seat.floor == floor_num, models.Seat.status == "AVAILABLE").count()
        rate = round((occupied / total * 100), 2) if total > 0 else 0.0
        
        return schemas.AIQueryResponse(
            response_text=f"Floor {floor_num} has a total of {total} seats. Currently, {occupied} are occupied, {avail} are available, and the occupancy rate is {rate}%.",
            intent="floor_occupancy",
            entities={"floor": floor_num},
            data=[{"floor": floor_num, "total_seats": total, "occupied_seats": occupied, "available_seats": avail, "occupancy_rate": rate}]
        )
        
    # Department Occupancy
    dept_name = None
    if intent == "department_occupancy":
        dept_name = entities.get("department")
    else:
        occ_dept_match_1 = re.search(r'occupancy.*(?:of|for|in)\s+(?:the\s+)?([a-zA-Z]+)', query_lower)
        occ_dept_match_2 = re.search(r'([a-zA-Z]+)\s+department\s+occupancy', query_lower)
        if occ_dept_match_1:
            dept_name = occ_dept_match_1.group(1).strip()
        elif occ_dept_match_2:
            dept_name = occ_dept_match_2.group(1).strip()
            
    if dept_name and str(dept_name).lower() not in ["floor", "seat", "desk"]:
        dept_name = str(dept_name).title()
        exists = db.query(models.Employee).filter(models.Employee.department.ilike(dept_name)).first()
        if exists:
            dept_name = exists.department
            emp_count = db.query(models.Employee).filter(models.Employee.department == dept_name).count()
            allocated = db.query(models.SeatAllocation).join(models.Employee).filter(
                models.Employee.department == dept_name,
                models.SeatAllocation.released_at.is_(None)
            ).count()
            
            rate = round((allocated / emp_count * 100), 2) if emp_count > 0 else 0.0
            return schemas.AIQueryResponse(
                response_text=f"The {dept_name} department has {emp_count} employees. Currently, {allocated} of them have assigned seats, representing a {rate}% utilization rate.",
                intent="department_occupancy",
                entities={"department": dept_name},
                data=[{"department": dept_name, "employee_count": emp_count, "allocated_seats": allocated, "occupancy_rate": rate}]
            )

    # ---------------------------------------------------------
    # 7. QUERY: List Onboarding Employees (New Joiners)
    # ---------------------------------------------------------
    is_onboarding_query = False
    if intent == "list_onboarding":
        is_onboarding_query = True
    else:
        if "onboarding" in query_lower or "new joiner" in query_lower or "needs a seat" in query_lower or "need a seat" in query_lower:
            is_onboarding_query = True
            
    if is_onboarding_query:
        onboarding_emps = db.query(models.Employee).filter(models.Employee.status == "ONBOARDING").all()
        total_onboarding = len(onboarding_emps)
        
        names_list = [f"{e.full_name} ({e.employee_id} - {e.department})" for e in onboarding_emps]
        names_text = "; ".join(names_list)
        if not names_text:
            return schemas.AIQueryResponse(
                response_text="There are currently no onboarding employees pending seat allocation.",
                intent="list_onboarding",
                entities={},
                data=[]
            )
            
        return schemas.AIQueryResponse(
            response_text=f"There are {total_onboarding} onboarding employees pending seat assignment: {names_text}.",
            intent="list_onboarding",
            entities={"count": total_onboarding},
            data=[{"id": e.id, "employee_id": e.employee_id, "name": e.full_name, "department": e.department, "role": e.role} for e in onboarding_emps]
        )

    # ---------------------------------------------------------
    # 8. QUERY: Project Manager / Lead Info
    # ---------------------------------------------------------
    proj_manager_target = None
    if intent == "project_manager":
        proj_manager_target = entities.get("project_query")
    else:
        manager_match1 = re.search(r'who\s+(?:is\s+)?(?:the\s+)?manager\s+of\s+(?:project\s+)?([a-zA-Z0-9\-]+)', query_lower)
        manager_match2 = re.search(r'who\s+manages\s+(?:project\s+)?([a-zA-Z0-9\-]+)', query_lower)
        manager_match3 = re.search(r'([a-zA-Z0-9\-]+)\s+(?:project\s+)?manager', query_lower)
        
        if manager_match1:
            proj_manager_target = manager_match1.group(1).upper()
        elif manager_match2:
            proj_manager_target = manager_match2.group(1).upper()
        elif manager_match3:
            proj_manager_target = manager_match3.group(1).upper()
            
    if proj_manager_target:
        # Strip generic qualifiers like "Project" or "PRJ-" to prevent false generic prefix matches (e.g. "Pro")
        clean_target = re.sub(r'^(?:project|prj\-?)\s*', '', str(proj_manager_target), flags=re.IGNORECASE).strip()
        
        # 1. Search by exact code
        proj_code = f"PRJ-{clean_target.upper()}"
        project = crud.get_project_by_code(db, proj_code)
        
        # 2. Search by direct ILIKE on name or code
        if not project:
            project = db.query(models.Project).filter(
                or_(
                    models.Project.name.ilike(f"%{clean_target}%"),
                    models.Project.project_code.ilike(f"%{clean_target}%")
                )
            ).first()
            
        # 3. Fuzzy prefix fallback if still not found and target is not empty
        if not project and len(clean_target) >= 3:
            prefix = clean_target[:3]
            if prefix.lower() not in ["pro", "prj"]:
                project = db.query(models.Project).filter(
                    or_(
                        models.Project.name.ilike(f"%{prefix}%"),
                        models.Project.project_code.ilike(f"%{prefix}%")
                    )
                ).first()
            
        if not project:
            return schemas.AIQueryResponse(
                response_text=f"Could not find a project matching '{proj_manager_target}'. Make sure the project code or name is correct.",
                intent="project_manager",
                entities={"project_query": proj_manager_target},
                data=None
            )
            
        members_count = db.query(models.EmployeeProject).filter(models.EmployeeProject.project_id == project.id).count()
        
        response_text = f"The project manager for '{project.name}' ({project.project_code}) is {project.manager_name or 'unassigned'}."
        if project.manager_name:
            response_text += f" This project belongs to the {project.department} department and currently has {members_count} assigned team members."
            
        return schemas.AIQueryResponse(
            response_text=response_text,
            intent="project_manager",
            entities={"project_id": project.id, "project_code": project.project_code, "project_name": project.name, "manager": project.manager_name},
            data=[{
                "id": project.id,
                "project_code": project.project_code,
                "name": project.name,
                "manager_name": project.manager_name,
                "department": project.department,
                "members_count": members_count
            }]
        )

    # ---------------------------------------------------------
    # Default Fallback: Simple guidance
    # ---------------------------------------------------------
    return schemas.AIQueryResponse(
        response_text="I could not recognize your query. Here are some examples of what I can help you with:\n"
                      "- Find a seating location: 'Where is John Smith sitting?'\n"
                      "- Find seat occupants: 'Who sits at seat FL2-Z-B-S105?'\n"
                      "- Seat recommendations: 'Find a free seat near Project Apollo'\n"
                      "- Occupancy rates: 'What is the occupancy of Floor 3?' or 'Show HR department occupancy'\n"
                      "- Seat allocation/release (HR/Admin): 'Allocate seat FL2-Z-A-S10 to EMP-10100' or 'Release seat FL2-Z-A-S10'\n"
                      "- List new joiners: 'List onboarding employees'",
        intent="unknown",
        entities={},
        data=None
    )
