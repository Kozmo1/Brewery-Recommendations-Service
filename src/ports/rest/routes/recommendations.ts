import express, { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../../middleware/auth";
import { RecommendationsController } from "../../../controllers/recommendationsController";

const router = express.Router();
const recommendationsController = new RecommendationsController();

router.get("/", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    recommendationsController.getRecommendations(req, res, next);
});

export = router;