import { AuthRequest } from "../middleware/auth";
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";

// Define interface for database service response
interface UserResponse {
    id: number;
    name: string;
    email: string;
    tasteProfile: TasteProfile;
}
interface InventoryItem {
    id: number;
    name: string;
    type: string;
    description: string;
    abv: number;
    volume: number;
    package: string;
    price: number;
    cost: number;
    stockQuantity: number;
    reorderPoint: number;
    isActive: boolean;
    tasteProfile: TasteProfile;
}
interface TasteProfile {
    primaryFlavor?: string;
    secondaryFlavors?: string[];
    sweetness?: string;
    bitterness?: string;
    mouthfeel?: string;
    body?: string;
    acidity?: number;
    aftertaste?: string;
    aroma?: string[];
}

export class RecommendationsController {
    private readonly breweryApiUrl = config.breweryApiUrl;

    public async getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user) {
                // Logged-in user this will fetch taste profile and match with inventory
                const userResponse = await axios.get<UserResponse>(`${this.breweryApiUrl}/api/auth/${req.user.id}`);
                const tasteProfile = userResponse.data.tasteProfile;

                const inventoryResponse = await axios.get<InventoryItem[]>(`${this.breweryApiUrl}/api/inventory`);
                const inventory = inventoryResponse.data;

                const recommendations = this.matchTasteProfile(tasteProfile, inventory);
                res.status(200).json({
                    message: "Personalized recommendations",
                    recommendations
                });
            } else {
                // Non-logged-in user this will return default recommendations
                const inventoryResponse = await axios.get<InventoryItem[]>(`${this.breweryApiUrl}/api/inventory`);
                const inventory = inventoryResponse.data;

                const defaultRecommendations = inventory.slice(0, 5); // Top 5 items
                res.status(200).json({
                    message: "Default recommendations",
                    recommendations: defaultRecommendations
                });
            }
        } catch (error: any) {
            console.error("Error fetching recommendations:", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({
                message: error.response?.data?.message || "Error fetching recommendations",
                error: error.response?.data?.errors || error.message
            });
        }
    }

    private matchTasteProfile(tasteProfile: TasteProfile, inventory: InventoryItem[]): InventoryItem[] {
        return inventory
            .filter(item => {
                const itemProfile = item.tasteProfile || {};
                return (
                    (tasteProfile.primaryFlavor && itemProfile.primaryFlavor === tasteProfile.primaryFlavor) ||
                    (tasteProfile.sweetness && itemProfile.sweetness === tasteProfile.sweetness) ||
                    (tasteProfile.bitterness && itemProfile.bitterness === tasteProfile.bitterness)
                );
            })
            .sort((a, b) => b.stockQuantity - a.stockQuantity) // Sort by stock availability
            .slice(0, 5); // Top 5 matches
    }
}