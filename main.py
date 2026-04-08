import bcrypt
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Response, Cookie
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select, SQLModel
from models import engine, Inventory, InventoryCreate, InventoryUpdate, User, UserCreate

# In-memory session store: token → username
_sessions: dict[str, str] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables (including users) on startup
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="Warehouse Management System", lifespan=lifespan)


@app.get("/inventory")
def get_all_items():
    with Session(engine) as session:
        statement = select(Inventory)
        records = session.exec(statement).all()
        return records


@app.get("/inventory/{item_id}")
def get_one_item(item_id: int):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        return record


@app.post("/inventory", status_code=201)
def create_item(item: InventoryCreate):
    with Session(engine) as session:
        record = Inventory(**item.model_dump())
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


@app.put("/inventory/{item_id}")
def update_item(item_id: int, item: InventoryUpdate):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        updates = item.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(record, field, value)
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


@app.delete("/inventory/{item_id}")
def delete_item(item_id: int):
    with Session(engine) as session:
        statement = select(Inventory).where(Inventory.id == item_id)
        record = session.exec(statement).first()
        session.delete(record)
        session.commit()


@app.get("/stats")
def get_stats():
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


# --- Auth endpoints ---------------------------------------------------------

@app.post("/register", status_code=201)
def register(user: UserCreate):
    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    with Session(engine) as session:
        if session.exec(select(User).where(User.username == user.username)).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        session.add(User(username=user.username, hashed_password=hashed))
        session.commit()
    return {"message": "User registered successfully"}


@app.post("/login")
def login(user: UserCreate, response: Response):
    with Session(engine) as session:
        record = session.exec(select(User).where(User.username == user.username)).first()
    if not record or not bcrypt.checkpw(user.password.encode(), record.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = secrets.token_hex(32)
    _sessions[token] = record.username
    response.set_cookie("session", token, httponly=True, samesite="strict")
    return {"message": "Logged in", "username": record.username}


@app.post("/logout")
def logout(response: Response, session: str = Cookie(default=None)):
    _sessions.pop(session, None)
    response.delete_cookie("session")
    return {"message": "Logged out"}


@app.get("/me")
def me(session: str = Cookie(default=None)):
    username = _sessions.get(session)
    if not username:
        raise HTTPException(status_code=401, detail="Not logged in")
    return {"username": username}


app.mount("/", StaticFiles(directory="static", html=True), name="static")