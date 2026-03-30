# WMS — Warehouse Management System

A full-stack inventory management app for a sports warehouse. Built with **FastAPI**, **SQLModel**, and **SQLite** on the backend, and a vanilla HTML/CSS/JS frontend served as static files. The UI connects to the REST API in real time to display, add, edit, and remove inventory items.

---

## What It Shows

The dashboard surfaces five live stats pulled from the database:

| Stat | Description |
|---|---|
| **Total SKUs** | Number of unique inventory records |
| **Total Units** | Sum of all stock quantities |
| **Total Value** | Combined value of all stock (quantity × price) |
| **Categories** | Number of distinct product categories |
| **Low Stock** | Items with fewer than 20 units remaining |

Below the stats, a full inventory table lists every item with its name, category, brand, size, color, quantity, and price. Items can be added, edited, and deleted directly from the UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| ORM | SQLModel |
| Database | SQLite (`warehouse.db`) |
| Frontend | HTML, CSS, JavaScript (vanilla) |

---

## Project Structure

| File | Purpose |
|---|---|
| `main.py` | FastAPI app — all REST API endpoints |
| `models.py` | `Inventory`, `InventoryCreate`, and `InventoryUpdate` SQLModel classes + database engine |
| `create_db.py` | Creates the `warehouse.db` database and `inventory` table |
| `seed_db.py` | Populates the table with 30 sample products across 4 categories |
| `static/` | Frontend — `index.html`, `styles.css`, `script.js` |

---

## Database Schema

**Table: `inventory`**

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key, auto-incremented |
| `name` | TEXT | Product name — required |
| `category` | TEXT | Footwear, Apparel, Equipment, Accessories |
| `brand` | TEXT | e.g. Nike, Adidas, Wilson, Oakley |
| `size` | TEXT | e.g. M, L, XL, 9, 10, 11 |
| `color` | TEXT | e.g. Black, White, Grey |
| `quantity` | INTEGER | Units in stock, defaults to 0 |
| `price` | REAL | Unit price in USD |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/inventory` | Return all inventory records |
| `GET` | `/inventory/{id}` | Return a single record by ID |
| `POST` | `/inventory` | Create a new inventory record |
| `PUT` | `/inventory/{id}` | Update one or more fields on a record |
| `DELETE` | `/inventory/{id}` | Delete a record by ID |
| `GET` | `/stats` | Return aggregated dashboard statistics |

Interactive API docs are available at `http://localhost:8000/docs` once the server is running.

---

## Setup

```bash
pip install fastapi sqlmodel uvicorn
python create_db.py
python seed_db.py
uvicorn main:app --reload
```

Then open `http://localhost:8000` in your browser.

---

## Sample Data

The database seeds with 30 products across four categories:

- **Footwear** — Nike Air Max 90, Adidas Ultraboost 5, ASICS Gel-Kayano 30, and more
- **Apparel** — Nike Dri-FIT tees, Tech Fleece hoodies, Under Armour compression shorts
- **Equipment** — Wilson basketballs and footballs, Adidas soccer balls, Manduka yoga mats
- **Accessories** — Nike socks, Oakley sunglasses, Garmin fitness trackers, Under Armour gym bags