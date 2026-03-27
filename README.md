# Warehouse-App

A simple SQLite inventory management app for a sports warehouse, using Python and SQLModel.

## Project Structure

| File | Purpose |
|---|---|
| `models.py` | SQLModel `Inventory` class and database engine |
| `create_db.py` | Creates the `warehouse.db` database and `inventory` table |
| `seed_db.py` | Populates the table with 30 sample products |
| `practice.py` | Example queries using SQLModel sessions |
| `warehouse.db` | SQLite database file |

## Database Schema

**Table: `inventory`**

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key, auto-incremented |
| `name` | TEXT | Product name (required) |
| `category` | TEXT | e.g. Footwear, Apparel, Equipment |
| `brand` | TEXT | e.g. Nike, Adidas, Wilson |
| `size` | TEXT | e.g. M, L, 10, 5 |
| `color` | TEXT | e.g. Black, White |
| `quantity` | INTEGER | Stock count, defaults to 0 |
| `price` | REAL | Unit price in USD |

## Setup

```bash
pip install sqlmodel
python create_db.py
python seed_db.py
```

## Usage

```python
from sqlmodel import Session, select
from models import engine, Inventory

with Session(engine) as session:
    results = session.exec(select(Inventory).where(Inventory.category == "Footwear")).all()
    print(results)
```