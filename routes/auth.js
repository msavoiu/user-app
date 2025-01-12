import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { authenticateJWT } from "../middleware/jwtMiddleware.js";

dotenv.config();
const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registers a new user.
 *     description: Creates a new user with the provided username and password. If the username is already taken, returns a conflict error. The user's profile is also created and an authentication token is stored in the client's cookies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username for the new user.
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 description: The password for the new user.
 *                 example: "SecureP@ssw0rd!"
 *     responses:
 *       201:
 *         description: User registered successfully, with a redirect to the profile page.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 redirect:
 *                   type: string
 *                   example: "/profile"
 *       409:
 *         description: Conflict - The username is already in use.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Username is already in use. Please choose a different one."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]);

        if (user.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username is already in use. Please choose a different one."
            });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *",
            [username, password_hash]
        );

        // Create blank profile for user to update later
        await pool.query(
            "INSERT INTO user_profiles (user_id) VALUES ($1)",
            [newUser.rows[0].id]
        );

        const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: 1800 });
        
        // Store token in cookies so that client can send it when making requests to API routes
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 1800000 // 30 minutes
        });

        return res.status(201).json({
            success: true,
            redirect: "/profile"
        });

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            error: "Server error"
        });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Logs in an existing user.
 *     description: Verifies the provided username and password. Upon login, a JSON Web Token set in the client's cookie for future requests. If the username or password is incorrect, an error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user trying to log in.
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 description: The password of the user.
 *                 example: "SecureP@ssw0rd!"
 *     responses:
 *       200:
 *         description: User successfully logged in, with a redirect to the profile page.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 redirect:
 *                   type: string
 *                   example: "/profile"
 *       401:
 *         description: User is unauthorized, supplied an incorrect username and/or password.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Username and/or password is incorrect."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]);

        // Check if user even exists
        if (user.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Username and/or password is incorrect."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash);

        // Check if the password matches the hashed one in the database
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Username and/or password is incorrect."
            });
        }

        const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: 1800 });
        
        // Store token in cookies so that client can send it when making requests to API routes
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 1800000 // 30 minutes
        });

        return res.status(200).json({
            success: true,
            redirect: "/profile"
        });

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            error: "Server error"
        });
    }
});

/**
 * @swagger
 * /auth/validate:
 *   get:
 *     summary: Validates the JWT token for protected routes.
 *     description: Confirms whether the provided JWT token is valid. This route is also used to test the functionality of the `authenticateJWT` middleware during unit tests.
 *     security:
 *       - cookieAuth: []    
 * responses:
 *       200:
 *         description: Token is valid, user authorized.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokenIsValid:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Invalid or expired token, user unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid token."
 */
router.get("/validate", authenticateJWT, (req, res) => {
    try {
        return res.status(200).json({
            tokenIsValid: true
        }); 
    } catch (err) {
        return res; // Already contains JSON information from authenticateJWT
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logs out the current user.
 *     description: Clears the authentication token from the client's cookies to log the user out. This route is a no-op if the client doesn't have an `auth_token` cookie.
 *     responses:
 *       200:
 *         description: User successfully logged out.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/logout", (req, res) => {
    try {
        // If client does not have an auth_token cookie, this statement is just a no-op
        res.clearCookie("auth_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
  
        return res.status(200).json({
            success: true
        });
    } catch (err) {
        console.error(err.message);
                return res.status(500).json({
            error: "Server error"
        });
    }
});

export default router;
