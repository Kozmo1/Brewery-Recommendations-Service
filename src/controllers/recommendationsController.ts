import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { AuthRequest } from "../middleware/auth";

interface TasteProfile {
	primaryFlavor?: string;
	sweetness?: string;
	bitterness?: string;
}

interface InventoryItem {
	id: number;
	name: string;
	tasteProfile: TasteProfile;
	stockQuantity: number;
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
					tasteProfile: TasteProfile;
				}>(`${this.breweryApiUrl}/api/auth/${req.user.id}`);
				const tasteProfile = userResponse.data.tasteProfile;
				const inventoryResponse = await axios.get<InventoryItem[]>(
					`${this.breweryApiUrl}/api/inventory`
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
					`${this.breweryApiUrl}/api/inventory`
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
				`${this.breweryApiUrl}/api/inventory/${req.params.productId}`
			);
			const productProfile = productResponse.data.tasteProfile;
			const inventoryResponse = await axios.get<InventoryItem[]>(
				`${this.breweryApiUrl}/api/inventory`
			);
			const recommendations = this.matchTasteProfile(
				productProfile,
				inventoryResponse.data.filter(
					(item) => item.id !== parseInt(req.params.productId)
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
				const itemProfile = item.tasteProfile || {};
				return (
					(tasteProfile.primaryFlavor &&
						itemProfile.primaryFlavor ===
							tasteProfile.primaryFlavor) ||
					(tasteProfile.sweetness &&
						itemProfile.sweetness === tasteProfile.sweetness) ||
					(tasteProfile.bitterness &&
						itemProfile.bitterness === tasteProfile.bitterness)
				);
			})
			.sort((a, b) => b.stockQuantity - a.stockQuantity)
			.slice(0, 5);
	}
}
