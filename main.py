from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from models import engine, Inventory, InventoryCreate, InventoryUpdate

app = FastAPI(title="Warehouse Management System")


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

app.mount("/", StaticFiles(directory="static", html=True), name="static")