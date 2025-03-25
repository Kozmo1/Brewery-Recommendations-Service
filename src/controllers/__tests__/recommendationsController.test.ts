import { RecommendationsController } from "../recommendationsController";
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import axios from "axios";

// Mock axios for API calls
jest.mock("axios", () => ({
	get: jest.fn(),
}));

describe("RecommendationsController", () => {
	let recommendationsController: RecommendationsController;
	let mockRequest: Partial<AuthRequest>;
	let mockResponse: Partial<Response>;
	let mockNext: jest.Mock;

	// Set up fresh controller and mocks before each test
	beforeEach(() => {
		recommendationsController = new RecommendationsController();
		mockRequest = {
			params: {},
			headers: { authorization: "Bearer mock-token" },
			user: { id: 1, email: "test@example.com" },
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		mockNext = jest.fn();

		// Clear mocks to keep tests isolated
		jest.clearAllMocks();
		// Keep console logs quiet during tests
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("getRecommendations", () => {
		// Test getting personalized recommendations for an authenticated user
		it("should return personalized recommendations for authenticated user", async () => {
			// Mock user taste profile response
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: {
					TasteProfile: { PrimaryFlavor: "Hoppy", Sweetness: "Low" },
				},
			});
			// Mock inventory response with matching items
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: [
					{
						Id: 1,
						Name: "Hoppy Beer",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 10,
					},
					{
						Id: 2,
						Name: "Sweet Ale",
						TasteProfile: { Sweetness: "High" },
						StockQuantity: 5,
					},
					{
						Id: 3,
						Name: "Light Lager",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 8,
					},
				],
			});

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/user/1",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory",
				expect.any(Object)
			);
			// Expect filtered and sorted recommendations
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Personalized recommendations",
				recommendations: [
					{
						Id: 1,
						Name: "Hoppy Beer",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 10,
					},
					{
						Id: 3,
						Name: "Light Lager",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 8,
					},
				],
			});
		});

		// Test default recommendations when no user is authenticated
		it("should return default recommendations when no user is provided", async () => {
			// Set user to undefined
			mockRequest.user = undefined;
			// Mock inventory response
			(axios.get as jest.Mock).mockResolvedValue({
				data: [
					{
						Id: 1,
						Name: "Beer 1",
						TasteProfile: {},
						StockQuantity: 10,
					},
					{
						Id: 2,
						Name: "Beer 2",
						TasteProfile: {},
						StockQuantity: 5,
					},
					{
						Id: 3,
						Name: "Beer 3",
						TasteProfile: {},
						StockQuantity: 8,
					},
					{
						Id: 4,
						Name: "Beer 4",
						TasteProfile: {},
						StockQuantity: 3,
					},
					{
						Id: 5,
						Name: "Beer 5",
						TasteProfile: {},
						StockQuantity: 2,
					},
					{
						Id: 6,
						Name: "Beer 6",
						TasteProfile: {},
						StockQuantity: 1,
					},
				],
			});

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the API call
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory",
				expect.any(Object)
			);
			// Expect top 5 items from inventory
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Default recommendations",
				recommendations: [
					{
						Id: 1,
						Name: "Beer 1",
						TasteProfile: {},
						StockQuantity: 10,
					},
					{
						Id: 2,
						Name: "Beer 2",
						TasteProfile: {},
						StockQuantity: 5,
					},
					{
						Id: 3,
						Name: "Beer 3",
						TasteProfile: {},
						StockQuantity: 8,
					},
					{
						Id: 4,
						Name: "Beer 4",
						TasteProfile: {},
						StockQuantity: 3,
					},
					{
						Id: 5,
						Name: "Beer 5",
						TasteProfile: {},
						StockQuantity: 2,
					},
				],
			});
		});

		// Test error handling when user fetch fails
		it("should handle error when fetching user data", async () => {
			// Mock a failure on user fetch
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 404, data: { message: "User not found" } },
			});

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "User not found",
				error: undefined,
			});
		});

		// Test error handling when inventory fetch fails (authenticated)
		it("should handle error when fetching inventory for authenticated user", async () => {
			// Mock user fetch success
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { TasteProfile: { PrimaryFlavor: "Hoppy" } },
			});
			// Mock inventory fetch failure
			(axios.get as jest.Mock).mockRejectedValueOnce(
				new Error("Network error")
			);

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error fetching recommendations",
				error: "Network error",
			});
		});

		// Test error handling when inventory fetch fails (no user)
		it("should handle error when fetching inventory for default recommendations", async () => {
			mockRequest.user = undefined;
			// Mock inventory fetch failure
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error fetching recommendations",
				error: "Network error",
			});
		});

		// Test partial error response
		it("should handle partial error response", async () => {
			// Mock a partial error on user fetch
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 400, data: { errors: "Bad request" } },
			});

			await recommendationsController.getRecommendations(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error fetching recommendations",
				error: "Bad request",
			});
		});
	});

	describe("getProductRecommendations", () => {
		// Test getting product-based recommendations
		it("should return product recommendations", async () => {
			// Mock product response
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: {
					Id: 1,
					Name: "Hoppy Beer",
					TasteProfile: { PrimaryFlavor: "Hoppy" },
					StockQuantity: 10,
				},
			});
			// Mock inventory response with matching items
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: [
					{
						Id: 1,
						Name: "Hoppy Beer",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 10,
					},
					{
						Id: 2,
						Name: "Hoppy Ale",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 5,
					},
					{
						Id: 3,
						Name: "Sweet Stout",
						TasteProfile: { Sweetness: "High" },
						StockQuantity: 8,
					},
				],
			});

			mockRequest.params = { productId: "1" };

			await recommendationsController.getProductRecommendations(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Check the API calls
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory/1",
				expect.any(Object)
			);
			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/inventory",
				expect.any(Object)
			);
			// Expect filtered recommendations excluding the product itself
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Related product recommendations",
				recommendations: [
					{
						Id: 2,
						Name: "Hoppy Ale",
						TasteProfile: { PrimaryFlavor: "Hoppy" },
						StockQuantity: 5,
					},
				],
			});
		});

		// Test error when fetching product
		it("should handle error when fetching product", async () => {
			// Mock product fetch failure
			(axios.get as jest.Mock).mockRejectedValue({
				response: {
					status: 404,
					data: { message: "Product not found" },
				},
			});

			mockRequest.params = { productId: "1" };

			await recommendationsController.getProductRecommendations(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Product not found",
				error: undefined,
			});
		});

		// Test error when fetching inventory
		it("should handle error when fetching inventory", async () => {
			// Mock product fetch success
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: {
					Id: 1,
					Name: "Hoppy Beer",
					TasteProfile: { PrimaryFlavor: "Hoppy" },
					StockQuantity: 10,
				},
			});
			// Mock inventory fetch failure
			(axios.get as jest.Mock).mockRejectedValueOnce(
				new Error("Network error")
			);

			mockRequest.params = { productId: "1" };

			await recommendationsController.getProductRecommendations(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error fetching recommendations",
				error: "Network error",
			});
		});

		// Test partial error response
		it("should handle partial error response", async () => {
			// Mock a partial error on product fetch
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 400, data: { errors: "Bad request" } },
			});

			mockRequest.params = { productId: "1" };

			await recommendationsController.getProductRecommendations(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			);

			// Check the response
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error fetching recommendations",
				error: "Bad request",
			});
		});
	});
});
