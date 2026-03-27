from sqlmodel import Session, select
from models import engine, Inventory

with Session(engine) as session:
    statement = select(Inventory).where(Inventory.id == 18)
    basketball = session.exec(statement).one()


    basketball.quantity += 50

    session.add(basketball)
    session.commit()
    session.refresh(basketball)

    print(basketball)

