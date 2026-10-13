-- Run in a new SQLite database. This is classroom executable SQL.
CREATE TABLE BOOK (
 BookID TEXT PRIMARY KEY,
 Title TEXT NOT NULL,
 Price REAL NOT NULL CHECK (Price >= 0),
 InStock INTEGER NOT NULL CHECK (InStock IN (0, 1))
);
INSERT INTO BOOK VALUES
 ('B01', 'Algorithms', 12, 1),
 ('B02', 'Programming', 18, 0),
 ('B03', 'Logic', 9, 1),
 ('B04', 'Databases', 15, 1);
-- Write your SELECT queries below.
