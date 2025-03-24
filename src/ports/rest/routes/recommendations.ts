import express, { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../../middleware/auth";
import { RecommendationsController } from "../../../controllers/recommendationsController";
import { AuthRequest } from "../../../middleware/auth";

const router = express.Router();
const recommendationsController = new RecommendationsController();

router.get(
	"/",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		recommendationsController.getRecommendations(req, res, next)
);

router.get(
	"/:productId",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		recommendationsController.getProductRecommendations(req, res, next)
);

export = router;
