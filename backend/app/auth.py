from fastapi import Header, HTTPException, status
from typing import Set

def get_current_role(x_user_role: str = Header(default="Employee")) -> str:
    # Normalize roles (e.g. "hr" -> "HR", "admin" -> "Admin", etc.)
    role_norm = x_user_role.strip().upper()
    if role_norm == "HR":
        return "HR"
    elif role_norm in ["PROJECT LEAD", "PROJECT MANAGER", "PROJECTTEAM", "PROJECT TEAM"]:
        return "Project Lead"
    elif role_norm == "ADMIN":
        return "Admin"
    else:
        return "Employee"

class RoleChecker:
    def __init__(self, allowed_roles: Set[str]):
        # Store in normalized format
        self.allowed_roles = set()
        for r in allowed_roles:
            r_norm = r.strip().upper()
            if r_norm == "HR":
                self.allowed_roles.add("HR")
            elif r_norm in ["PROJECT LEAD", "PROJECT MANAGER", "PROJECTTEAM", "PROJECT TEAM"]:
                self.allowed_roles.add("Project Lead")
            elif r_norm == "ADMIN":
                self.allowed_roles.add("Admin")
            else:
                self.allowed_roles.add("Employee")

    def __call__(self, x_user_role: str = Header(default="Employee")) -> str:
        role = get_current_role(x_user_role)
        if role not in self.allowed_roles and "Admin" not in self.allowed_roles:
            # Let Admin bypass everything
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for your current role ({role}). Required permissions: {list(self.allowed_roles)}."
            )
        
        # Admin bypass
        if role == "Admin":
            return role
            
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for your current role ({role})."
            )
        return role
