# user-app

## Setup

### Setting up the PostgreSQL database

Follow these steps to create your own instance of the database structure for the app:

#### Prerequisites

Ensure you have the following installed:
- PostgreSQL database server
- Command-line tools like `psql` for interacting with PostgreSQL

#### Step 1: Create a PostgreSQL Database

1. Open a terminal and log in to PostgreSQL:
   ```bash
   $ psql -U <your_postgres_username>
2. Run the following command:
    ```bash
    CREATE DATABASE your_app_name;
3. Exit the `psql` session:
    ```bash
    \q
#### Step 2: Add the correct tables to the database
4. In the `user-app` directory, ensure the `database.sql` file is present and run the following command:
    ```bash
    $ psql -U <your_postgres_username> -d <your_app_name> -f database.sql
5. Log back into the database and verify that the tables were created successfully.
    ```bash
    $ psql -U <your_postgres_username>
    $ \dt
### Installing dependencies
#### Prerequisites
- Node and Node Package Manager installed

#### Step 1: Run the install command
1. In the `user-app` directory, run the following command:
    ```bash
    npm install
### Modifying environment variables
#### Step 1: Open `.env`
#### Step 2: Update the file with your variables.
1. Add your PostgreSQL database's credentials and information:
    ```yaml
    DB_USER=<your_postgres_username>
    DB_HOST=<your_postgres_host> # Default is localhost
    DB_NAME=<your_database_name>
    DB_PASSWORD=<your_database_password>
    DB_PORT=<your_database_port> # Default is 5432
2. Generate `JWT` secret by running this command in the terminal:
    ```bash
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
3. Change `JWT_SECRET` in `.env`:
    ```yaml
    JWT_SECRET=<your_generated_secret>
## Running the application
### Step 1: Start the server
1. Run the following command in `user-app`. The console will let you know when the server is running and what port it is hosted on.
    ```bash
    node server.js
### Step 2: Use tools like Postman or `curl` to send requests to the API routes.

## API Documentation
To view the API's documentation, navigate to `http://localhost:3000/docs` once the server is running.
## Unit testing
#### Start unit tests
The application comes with prewritten unit tests for its API routes. Run the following command in the `user-app` to run the tests:
```bash
    npx mocha --timeout 5000