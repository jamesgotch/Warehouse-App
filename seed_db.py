import sqlite3

DB_NAME = "warehouse.db"

sample_data = [
    ("Air Max 90", "Footwear", "Nike", "10", "Black", 45, 129.99),
    ("Air Max 90", "Footwear", "Nike", "11", "Black", 30, 129.99),
    ("Air Max 90", "Footwear", "Nike", "10", "White", 38, 129.99),
    ("Ultraboost 5", "Footwear", "Adidas", "9", "Grey", 22, 149.99),
    ("Ultraboost 5", "Footwear", "Adidas", "10", "Grey", 35, 149.99),
    ("Gel-Kayano 30", "Footwear", "ASICS", "11", "Blue", 18, 159.99),
    ("Fresh Foam X", "Footwear", "New Balance", "9", "Red", 27, 139.99),
    ("Suede Classic", "Footwear", "Puma", "10", "Green", 15, 74.99),
    ("Dri-FIT T-Shirt", "Apparel", "Nike", "M", "Black", 120, 34.99),
    ("Dri-FIT T-Shirt", "Apparel", "Nike", "L", "Black", 95, 34.99),
    ("Dri-FIT T-Shirt", "Apparel", "Nike", "M", "White", 110, 34.99),
    ("Aeroready Tee", "Apparel", "Adidas", "L", "Navy", 80, 29.99),
    ("Tech Fleece Hoodie", "Apparel", "Nike", "M", "Grey", 60, 89.99),
    ("Tech Fleece Hoodie", "Apparel", "Nike", "L", "Grey", 55, 89.99),
    ("Compression Shorts", "Apparel", "Under Armour", "M", "Black", 75, 24.99),
    ("Compression Shorts", "Apparel", "Under Armour", "L", "Black", 65, 24.99),
    ("Running Shorts", "Apparel", "Adidas", "M", "Blue", 50, 34.99),
    ("Pro Basketball", "Equipment", "Wilson", None, "Orange", 200, 29.99),
    ("FIFA Match Soccer Ball", "Equipment", "Adidas", "5", "White", 85, 49.99),
    ("NCAA Football", "Equipment", "Wilson", None, "Brown", 60, 39.99),
    ("27\" Tennis Racket", "Equipment", "Wilson", None, "Red", 40, 89.99),
    ("Yoga Mat 6mm", "Equipment", "Manduka", None, "Purple", 90, 49.99),
    ("Resistance Bands Set", "Equipment", "TheraBand", None, None, 150, 19.99),
    ("25 lb Dumbbell Pair", "Equipment", "CAP Barbell", None, "Black", 70, 44.99),
    ("Jump Rope", "Equipment", "Rogue", None, "Black", 110, 14.99),
    ("Athletic Crew Socks 6pk", "Accessories", "Nike", "M", "White", 200, 19.99),
    ("Athletic Crew Socks 6pk", "Accessories", "Nike", "L", "White", 180, 19.99),
    ("Sport Sunglasses", "Accessories", "Oakley", None, "Black", 35, 129.99),
    ("Gym Bag", "Accessories", "Under Armour", None, "Grey", 65, 44.99),
    ("Fitness Tracker Band", "Accessories", "Garmin", None, "Black", 40, 99.99),
]


def seed_database():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM inventory")
    if cursor.fetchone()[0] > 0:
        print("Database already seeded. Skipping.")
        conn.close()
        return

    cursor.executemany("""
        INSERT INTO inventory (name, category, brand, size, color, quantity, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, sample_data)

    conn.commit()
    print(f"Inserted {len(sample_data)} rows.")
    conn.close()


if __name__ == "__main__":
    seed_database()