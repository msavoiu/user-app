import app from "../server.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { expect, use } from "chai";
import { default as chaiHttp, request } from "chai-http";
import jwt from "jsonwebtoken";
import pool from "../db.js";
// import sinon from "sinon";

dotenv.config();
use(chaiHttp);

describe("Testing /profile API routes", () => {
    let testUser = {
        username: "testuser",
        password: "testpassword"
    }
    let testUserProfile = {
        display_name: "Test User",
        bio: "This is @testuser's bio."
    }
    let testToken;
    
    const invalidToken = jwt.sign({ id: "notindatabase" }, "wrongsecret");

    // Create test user and profile
    before(async () => {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(testUser.password, salt);

        const user = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *",
            [testUser.username, passwordHash]
        );

        testToken = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: 120 });

        // Create corresponding profile
        await pool.query(
            "INSERT INTO user_profiles (user_id, display_name, bio) VALUES ($1, $2, $3)",
            [user.rows[0].id, testUserProfile.display_name, testUserProfile.bio]
        );
    });

    // Delete test user and profile
    after(async () => {
        await pool.query(
            "DELETE FROM users WHERE username = $1",
            [testUser.username]
        );
    });

    describe("GET /view", () => {
        // Test 1: Valid token provided by client
        it("Retrieve information for user's profile", async () => {
            const res = await request.execute(app)
                .get("/profile/view")
                .set("Cookie", `auth_token=${testToken}`);

            expect(res).to.have.status(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data.username).to.equal(testUser.username);
            expect(res.body.data.display_name).to.equal(testUserProfile.display_name);
            expect(res.body.data.bio).to.equal(testUserProfile.bio);
        });
    });

    describe("PUT /update", () => {
        // Test 1: Valid token, profile updated in database successfully
        it("Update profile information in database", async () => {
            const res = await request.execute(app)
                .put("/profile/update")
                .send({
                    display_name: "New Display Name",
                    bio: "This is a new bio."
                })
                .set("Cookie", `auth_token=${testToken}`);

            expect(res).to.have.status(200);
            expect(res.body.success).to.be.true;
            expect(res.body.message).to.equal("Profile updated.");
        });
    });

    describe("DELETE /delete", () => {
        // Test 1: User found with token and successfully deleted
        it("Successfully delete existing user", async () => {
            const res = await request.execute(app)
            .delete("/profile/delete")
            .set("Cookie", `auth_token=${testToken}`);

            expect(res).to.have.status(200);
            expect(res.body.success).to.be.true;
            expect(res.body.message).to.equal("User deleted.");
            expect(res.body.redirect).to.equal("/");
        });
    });
});
