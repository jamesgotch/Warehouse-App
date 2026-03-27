from sqlmodel import SQLModel, Field, create_engine
from typing import Optional


class Inventory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    quantity: int = 0
    price: float


engine = create_engine("sqlite:///warehouse.db")
