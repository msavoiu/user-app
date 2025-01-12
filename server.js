import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";

import swaggerJSDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";

const swaggerDefinition = {
    openapi: "3.1.1",
    info: {
        title: "API for user management application",
        version: "1.0.0",
        description: "REST API built with Express that retrieves, updates, deletes, registers, and logs in users from a PostgreSQL database.",
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Development server"
        }
    ]
};

const options = {
    swaggerDefinition,
    apis: ["./routes/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);

const app = express();
const port = 3000;
const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Documentation
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

export default app;
