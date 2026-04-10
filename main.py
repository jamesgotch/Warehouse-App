from contextlib import asynccontextmanager
from typing import Optional
import secrets
from fastapi import FastAPI, HTTPException, Response, Cookie, Depends
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, SQLModel, select
from models import engine, Inventory, InventoryCreate, InventoryUpdate, User, UserSession, AuditLog
from permissions import get_current_user, require_role, Role
from pydantic import BaseModel
import bcrypt


@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="Warehouse Management System", lifespan=lifespan)


class UserCreate(BaseModel):
    username: str
    password: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def audit(db: Session, username: str, action: str, detail: str):
    db.add(AuditLog(username=username, action=action, detail=detail))
    db.commit()


@app.post("/register", status_code=201)
def register(user: UserCreate):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == user.username)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken")
        new_user = User(username=user.username, hashed_password=hash_password(user.password))
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        audit(session, user.username, "register", f"New account created")
        return {"id": new_user.id, "username": new_user.username}


@app.post("/login")
def login(user: UserCreate, response: Response):
    with Session(engine) as session:
        record = session.exec(select(User).where(User.username == user.username)).first()
        if not record or not verify_password(user.password, record.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = secrets.token_hex(32)
        session.add(UserSession(token=token, user_id=record.id))
        session.commit()
        audit(session, record.username, "login", "User logged in")
        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,
        )
        return {"id": record.id, "username": record.username, "role": record.role}


@app.post("/logout")
def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        with Session(engine) as session:
            user_session = session.exec(
                select(UserSession).where(UserSession.token == session_token)
            ).first()
            if user_session:
                user = session.get(User, user_session.user_id)
                username = user.username if user else "unknown"
                session.delete(user_session)
                session.commit()
                audit(session, username, "logout", "User logged out")
    response.delete_cookie("session_token")
    return {"message": "Logged out"}


@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role}


@app.get("/inventory")
def get_all_items(_: User = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()
        return records


@app.get("/inventory/{item_id}")
def get_one_item(item_id: int, _: User = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        if not record:
            raise HTTPException(status_code=404, detail="Item not found")
        return record


@app.post("/inventory", status_code=201)
def create_item(item: InventoryCreate, current_user: User = Depends(require_role(Role.OWNER, Role.EMPLOYEE))):
    with Session(engine) as session:
        record = Inventory(**item.model_dump())
        session.add(record)
        session.commit()
        session.refresh(record)
        audit(session, current_user.username, "create_item", f"Added '{record.name}' (id={record.id})")
        return record


@app.put("/inventory/{item_id}")
def update_item(item_id: int, item: InventoryUpdate, current_user: User = Depends(require_role(Role.OWNER, Role.EMPLOYEE))):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        if not record:
            raise HTTPException(status_code=404, detail="Item not found")
        updates = item.model_dump(exclude_unset=True)
        changed = ", ".join(f"{k}={v}" for k, v in updates.items())
        for field, value in updates.items():
            setattr(record, field, value)
        session.add(record)
        session.commit()
        session.refresh(record)
        audit(session, current_user.username, "update_item", f"Updated '{record.name}' (id={item_id}): {changed}")
        return record


@app.delete("/inventory/{item_id}")
def delete_item(item_id: int, current_user: User = Depends(require_role(Role.OWNER, Role.EMPLOYEE))):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        if not record:
            raise HTTPException(status_code=404, detail="Item not found")
        name = record.name
        session.delete(record)
        session.commit()
        audit(session, current_user.username, "delete_item", f"Deleted '{name}' (id={item_id})")


@app.get("/stats")
def get_stats(_: User = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()

        total_skus   = len(records)
        total_units  = sum(record.quantity for record in records)
        total_value  = round(sum(record.quantity * record.price for record in records), 2)
        categories   = len(set(record.category for record in records if record.category))
        low_stock    = len([record for record in records if record.quantity < 20])

        return {
            "total_skus":  total_skus,
            "total_units": total_units,
            "total_value": total_value,
            "categories":  categories,
            "low_stock":   low_stock,
        }


@app.get("/logs")
def get_logs(_: User = Depends(require_role(Role.OWNER))):
    with Session(engine) as session:
        records = session.exec(select(AuditLog).order_by(AuditLog.id.desc())).all()
        return [
            {
                "id":        r.id,
                "timestamp": r.timestamp.isoformat(),
                "username":  r.username,
                "action":    r.action,
                "detail":    r.detail,
            }
            for r in records
        ]


app.mount("/", StaticFiles(directory="static", html=True), name="static")


app.mount("/", StaticFiles(directory="static", html=True), name="static")


