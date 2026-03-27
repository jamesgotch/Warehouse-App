from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from sqlmodel import Session, select
from models import engine, Inventory

app = FastAPI()

@app.get("/inventory")
async def get_inventory():
    with Session(engine) as session:
        statement = select(Inventory)
        items = session.exec(statement).all()
        return items

app.mount("/", StaticFiles(directory="static", html=True), name="static")