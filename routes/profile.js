import { authenticateJWT } from "../middleware/jwtMiddleware.js";
import express, { application } from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * @swagger
 * /profile/view:
 *   get:
 *     summary: Retrieves the current user's profile.
 *     description: Fetches the username, display name, and bio for the authenticated user. Requires valid JSON Web token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     display_name:
 *                       type: string
 *                       example: "John"
 *                     bio:
 *                       type: string
 *                       example: "Software Developer"
 *       404:
 *         description: Profile not found.
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
 *                   example: "Profile not found."
 *       500:
 *         description: Internal server error.
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
 *                   example: "An error has occurred. Please try again later."
 */
router.get("/view", authenticateJWT, async (req, res) => {
    try {
        // authenticateJWT() executes and passes the user ID through the request if authorization succeeds
        const user_id = req.user_id;

        // Get information from user profile, send in response as JSON
        const userProfile = await pool.query(
            `SELECT users.username, user_profiles.display_name, user_profiles.bio
             FROM users
             INNER JOIN user_profiles ON users.id = user_profiles.user_id
             WHERE users.id = $1;`,
            [user_id]
        );

        // Check if a user's profile was not found
        if (userProfile.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile not found."
            });
        }

        // Otherwise, send the information to the client for rendering
        return res.status(200).json({
            success: true,
            data: userProfile.rows[0],
        });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({
            success: false,
            message: "An error has occurred. Please try again later."
        });
    }
});

/**
 * @swagger
 * /profile/update:
 *   put:
 *     summary: Updates the current user's profile.
 *     description: Allows the authenticated user to update their display name and/or bio.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 description: The new display name for the user.
 *                 example: "John Doe"
 *               bio:
 *                 type: string
 *                 description: The new bio for the user.
 *                 example: "Full stack developer"
 *     responses:
 *       200:
 *         description: Successfully updated the user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated."
 *       300:
 *         description: Profile could not be updated.
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
 *                   example: "Profile could not be updated."
 *       500:
 *         description: Internal server error.
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
 *                   example: "An error has occurred. Please try again later."
 */
router.put("/update", authenticateJWT, async (req, res) => {
    try {
        const user_id = req.user_id;
        const { displayName, bio } = req.body;

        let setClause = [];
        let values = [];
        let element = 1;

        if (displayName) {
            setClause.push(`display_name = $${element}`);
            values.push(displayName);
            element++;
        }

        if (bio) {
            setClause.push(`bio = $${element}`);
            values.push(bio);
            element++;
        }

        const whereClause = `WHERE user_id = $${element}`;
        values.push(user_id);

        const query = `
            UPDATE user_profiles
            SET ${setClause.join(', ')}
            ${whereClause}`;
        
        // Execute the query
        const updateProfile = await pool.query(query, values);

        if (updateProfile.rowCount === 0) {
            console.log("not updated");
            return res.status(300).json({
                success: false,
                message: "Profile could not be updated."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated."
        });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({
            success: false,
            message: "An error has occurred. Please try again later."
        });
    }
});

/**
 * @swagger
 * /profile/delete:
 *   delete:
 *     summary: Deletes the current user.
 *     description: Permanently deletes the authenticated user's account. Requires valid JSON Web token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully deleted user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted."
 *                 redirect:
 *                   type: string
 *                   example: "/"
 *       404:
 *         description: User not found.
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
 *                   example: "User to delete not found."
 *       500:
 *         description: Internal server error.
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
 *                   example: "An error has occurred. Please try again later."
 */
router.delete("/delete", authenticateJWT, async (req, res) => {
    try {
        const user_id = req.user_id;

        const deleteUser = await pool.query(
            `DELETE FROM users WHERE id = $1;`,
            [user_id]
        );
    
        if (deleteUser.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User to delete not found."
            });
        }
    
        return res.status(200).json({
            success: true,
            message: "User deleted.",
            redirect: "/"
        });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({
            success: false,
            message: "An error has occurred. Please try again later."
        });
    }
});

export default router;
