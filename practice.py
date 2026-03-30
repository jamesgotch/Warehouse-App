from sqlmodel import Session, select
from models import engine, Inventory

with Session(engine) as session:
    statement = select(Inventory)
    records = session.exec(statement).all()
    print(records)

