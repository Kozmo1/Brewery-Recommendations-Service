import express from "express";
import cors from "cors";
import dotenv from "dotenv-safe";
import recommendationRoutes from "./ports/rest/routes/recommendations";
import { config } from "./config/config";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example"
});

const port = config.port;

app.use("healthcheck", (req, res) => {
    res.status(200).send("Some might say these are the best recommendations, many people are saying it.");
});

app.use("/recommendations", recommendationRoutes);

app.listen(port, () => {
    console.log(`Recommendations are running on port ${port}`);
});