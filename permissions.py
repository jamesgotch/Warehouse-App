"""
permissions.py — Role definitions, FastAPI dependencies, and CLI role assignment.

Roles
-----
  owner    — Full access: inventory CRUD + audit logs + role management
  employee — Inventory CRUD only; cannot view logs
  guest    — Read-only access to inventory; cannot modify or view logs

CLI Usage
---------
  python permissions.py <username> <role>

  Examples:
    python permissions.py alice owner
    python permissions.py bob   employee
    python permissions.py carol guest
"""

import sys
from enum import Enum
from typing import Optional

from fastapi import Cookie, Depends, HTTPException
from sqlmodel import Session, select

from models import User, UserSession, engine


# ── Roles ──────────────────────────────────────────────────────────────────────

class Role(str, Enum):
    OWNER    = "owner"
    EMPLOYEE = "employee"
    GUEST    = "guest"


# ── FastAPI dependencies ────────────────────────────────────────────────────────

def get_current_user(session_token: Optional[str] = Cookie(default=None)) -> User:
    """Validates the session cookie and returns the logged-in User."""
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with Session(engine) as db:
        user_session = db.exec(
            select(UserSession).where(UserSession.token == session_token)
        ).first()
        if not user_session:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = db.get(User, user_session.user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user


def require_role(*allowed: Role):
    """
    Dependency factory — restricts a route to users with one of the given roles.

    Usage:
        @app.get("/logs")
        def get_logs(_: User = Depends(require_role(Role.OWNER))):
            ...
    """
    allowed_values = {r.value for r in allowed}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_values:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return dependency


# ── CLI ─────────────────────────────────────────────────────────────────────────

def _list_roles() -> str:
    return ", ".join(r.value for r in Role)


def main():
    if len(sys.argv) != 3:
        print("Usage: python permissions.py <username> <role>")
        print(f"Available roles: {_list_roles()}")
        sys.exit(1)

    username = sys.argv[1]
    role_str = sys.argv[2].lower()

    if role_str not in {r.value for r in Role}:
        print(f"Error: invalid role '{role_str}'.")
        print(f"Choose from: {_list_roles()}")
        sys.exit(1)

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if not user:
            print(f"Error: user '{username}' not found.")
            sys.exit(1)

        old_role   = user.role
        user.role  = role_str
        session.add(user)
        session.commit()
        print(f"✓ '{username}' role changed: {old_role} → {role_str}")


if __name__ == "__main__":
    main()
