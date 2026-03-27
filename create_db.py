import sqlite3

DB_NAME = "warehouse.db"


def create_database():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            brand TEXT,
            size TEXT,
            color TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            price REAL NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print(f"Database '{DB_NAME}' created successfully.")


if __name__ == "__main__":
    create_database()