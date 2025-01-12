import jwt from "jsonwebtoken";

// Authenticate JWT for a specific user session
export function authenticateJWT(req, res, next) {
    const token = req.cookies.auth_token; // Use the token stored in cookies

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access Denied: No token provided"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                    success: false,
                    message: "Forbidden: Invalid token"
                });
        }

        req.user_id = decoded.id;

        next(); // Proceed to the next middleware/route handler
    });
}
