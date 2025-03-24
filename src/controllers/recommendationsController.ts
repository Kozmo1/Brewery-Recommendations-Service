import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { AuthRequest } from "../middleware/auth";

interface TasteProfile {
	PrimaryFlavor?: string;
	Sweetness?: string;
	Bitterness?: string;
}

interface InventoryItem {
	Id: number;
	Name: string;
	TasteProfile: TasteProfile;
	StockQuantity: number;
}

export class RecommendationsController {
	private readonly breweryApiUrl = config.breweryApiUrl;

	async getRecommendations(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (req.user) {
				const userResponse = await axios.get<{
					TasteProfile: TasteProfile;
				}>(`${this.breweryApiUrl}/api/user/${req.user.id}`, {
					headers: { Authorization: req.headers.authorization },
				});
				const tasteProfile = userResponse.data.TasteProfile;
				const inventoryResponse = await axios.get<InventoryItem[]>(
					`${this.breweryApiUrl}/api/inventory`,
					{ headers: { Authorization: req.headers.authorization } }
				);
				const recommendations = this.matchTasteProfile(
					tasteProfile,
					inventoryResponse.data
				);
				res.status(200).json({
					message: "Personalized recommendations",
					recommendations,
				});
			} else {
				const inventoryResponse = await axios.get<InventoryItem[]>(
					`${this.breweryApiUrl}/api/inventory`,
					{ headers: { Authorization: req.headers.authorization } } // Add header
				);
				const defaultRecommendations = inventoryResponse.data.slice(
					0,
					5
				);
				res.status(200).json({
					message: "Default recommendations",
					recommendations: defaultRecommendations,
				});
			}
		} catch (error: any) {
			console.error(
				"Error fetching recommendations:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error fetching recommendations",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async getProductRecommendations(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const productResponse = await axios.get<InventoryItem>(
				`${this.breweryApiUrl}/api/inventory/${req.params.productId}`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			const productProfile = productResponse.data.TasteProfile;
			const inventoryResponse = await axios.get<InventoryItem[]>(
				`${this.breweryApiUrl}/api/inventory`,
				{ headers: { Authorization: req.headers.authorization } }
			);
			const recommendations = this.matchTasteProfile(
				productProfile,
				inventoryResponse.data.filter(
					(item) => item.Id !== parseInt(req.params.productId)
				)
			);
			res.status(200).json({
				message: "Related product recommendations",
				recommendations,
			});
		} catch (error: any) {
			console.error(
				"Error fetching product recommendations:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error fetching recommendations",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	private matchTasteProfile(
		tasteProfile: TasteProfile,
		inventory: InventoryItem[]
	): InventoryItem[] {
		return inventory
			.filter((item) => {
				const itemProfile = item.TasteProfile || {};
				return (
					(tasteProfile.PrimaryFlavor &&
						itemProfile.PrimaryFlavor ===
							tasteProfile.PrimaryFlavor) ||
					(tasteProfile.Sweetness &&
						itemProfile.Sweetness === tasteProfile.Sweetness) ||
					(tasteProfile.Bitterness &&
						itemProfile.Bitterness === tasteProfile.Bitterness)
				);
			})
			.sort((a, b) => b.StockQuantity - a.StockQuantity)
			.slice(0, 5);
	}
}
