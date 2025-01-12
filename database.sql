CREATE TABLE "users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE "user_profiles" (
    user_id INT NOT NULL,
    display_name VARCHAR(255) DEFAULT 'No name set yet.',
    bio VARCHAR(255) DEFAULT 'No bio set yet.',
    FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);