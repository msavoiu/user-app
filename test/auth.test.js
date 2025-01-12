import app from "../server.js";
import bcrypt from "bcryptjs";
import { expect, use } from "chai";
import { default as chaiHttp, request } from "chai-http";
import jwt from "jsonwebtoken";
import pool from "../db.js";

use(chaiHttp);

describe("Testing /auth API routes", () => {
    let testUser = {
        username: "testuser",
        password: "testpassword"
    };
    let testToken;

    // Create test user
    before(async () => {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(testUser.password, salt);

        await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
            [testUser.username, passwordHash]
        );
    });

    // Delete test user
    after(async () => {
        await pool.query(
            "DELETE FROM users WHERE username = $1",
            [testUser.username]
        );
    });

    describe("POST /register", () => {
        // Test 1: Registering a user that does not already exist in the database
        it("Register a new user", async () => {
            const res = await request.execute(app)
                .post("/auth/register")
                .send({
                    username: "newuser",
                    password: "newpassword"
                });

            expect(res).to.have.status(201);
            expect(res.body.success).to.be.true;
            expect(res.body.redirect).to.equal("/profile");

            // Remove created user
            await pool.query("DELETE FROM users WHERE username = $1", ["newuser"]);
        });

        // Test 2: Attempting to register a user that already exists in the database
        it("Return 409 status code for existing username", async () => {
            const res = await request.execute(app)
                .post("/auth/register")
                .send(testUser);

            expect(res).to.have.status(409);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Username is already in use. Please choose a different one.");
        });
    });

    describe("POST /login", () => {
        // Test 1: Credentials match database entry
        it("Log in an existing user", async () => {
            const res = await request.execute(app)
                .post("/auth/login")
                .send(testUser);

            expect(res).to.have.status(200);
            expect(res.body.success).to.be.true;
            expect(res.body.redirect).to.equal("/profile");
            expect(res).to.have.cookie("auth_token");

            testToken = res.header["set-cookie"][0].split(";")[0].split("=")[1];
        });

        // Test 2: Incorrect username, does not exist in the database
        it("Return 401 status code for incorrect username", async () => {
            const res = await request.execute(app)
                .post("/auth/login")
                .send({
                    username: "wrongusername",
                    password: testUser.password
                });

            expect(res).to.have.status(401);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Username and/or password is incorrect.");
        });

        // Test 3: Correct username but incorrect password
        it("Return 401 status code for incorrect password", async () => {
            const res = await request.execute(app)
                .post("/auth/login")
                .send({
                    username: testUser.username,
                    password: "wrongpassword"
                });

            expect(res).to.have.status(401);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Username and/or password is incorrect.");
        });

        // Test 4: Both credentials are incorrect
        it("Return 401 status code for incorrect username and password", async () => {
            const res = await request.execute(app)
                .post("/auth/login")
                .send({
                    username: "wrongusername",
                    password: "wrongpassword"
                });

            expect(res).to.have.status(401);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Username and/or password is incorrect.");
        });
    });

    describe("GET /validate (Passing tests indicate 'authenticateJWT' behaves properly in all routes that use it as middleware)", () => {
        // Test 1: Token is provided and valid
        it("Accept a valid authentication token", async () => {
            const res = await request.execute(app)
                .get("/auth/validate")
                .set("Cookie", `auth_token=${testToken}`);

            expect(res).to.have.status(200);
            expect(res.body.tokenIsValid).to.be.true;
        });

        // Test 2: No token provided
        it("Return 401 status code if no token is provided", async () => {
            const res = await request.execute(app)
                .get("/auth/validate");

            expect(res).to.have.status(401);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Access Denied: No token provided");
        });

        // Test 3: Token is invalid (expired, user no longer exists, etc.)
        it("Return 403 status code for invalid token", async () => {
            const invalidToken = jwt.sign({ id: "notindatabase" }, "wrongsecret");
            const res = await request.execute(app)
                .get("/auth/validate")
                .set("Cookie", `auth_token=${invalidToken}`);

            expect(res).to.have.status(403);
            expect(res.body.success).to.be.false;
            expect(res.body.message).to.equal("Forbidden: Invalid token");
        });
    });

    describe("POST /logout", () => {
        // Test 1: Log out by clearing token in cookies
        it("Log out user and clear auth_token cookie", async () => {
            const res = await request.execute(app)
                .post("/auth/logout")
                .set("Cookie", `auth_token=${testToken}`);

            expect(res).to.have.status(200);
            expect(res.body.success).to.be.true;
            expect(res).to.not.have.cookie("auth_token");
        });
    });
});
