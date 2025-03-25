import { config } from "../../config/config";

// Mock dotenv-safe to control environment loading during tests
jest.mock("dotenv-safe", () => ({
	config: jest.fn((options) => {
		// Return empty parsed object if no file or nonexistent path
		if (!options.path || options.path.includes("nonexistent")) {
			return { parsed: {} };
		}
		return { parsed: process.env };
	}),
}));

describe("config", () => {
	// Reset modules before each test to reload config fresh
	beforeEach(() => {
		jest.resetModules();
	});

	// Test that we get fallback values when env vars aren’t set
	it("should use fallback values if environment variables are not set", () => {
		// Grab the original env to restore later
		const originalEnv = { ...process.env };
		// Clear out all env vars to trigger fallbacks
		delete process.env.NODE_ENV;
		delete process.env.BREWERY_API_URL;
		delete process.env.JWT_SECRET;
		delete process.env.PORT;

		// Load config with no env vars
		const { config } = require("../../config/config");

		// Check each fallback kicks in
		expect(config.environment).toBe("development");
		expect(config.breweryApiUrl).toBe("http://localhost:5089");
		expect(config.jwtSecret).toBe(
			"thisIsOurSupserSecretKeyOnlyKnownToTheBestStudentsAtConestoga"
		);
		expect(config.port).toBe(3004);

		// Restore the original env
		process.env = originalEnv;
	});

	// Test that env vars override defaults when they’re set
	it("should use environment variables when they are set", () => {
		// Store the original env
		const originalEnv = { ...process.env };
		// Set some custom values
		process.env.NODE_ENV = "production";
		process.env.BREWERY_API_URL = "https://api.brewery.com";
		process.env.JWT_SECRET = "custom-secret";
		process.env.PORT = "5000";

		// Load config with env vars
		const { config } = require("../../config/config");

		// Make sure it picks up the custom values
		expect(config.environment).toBe("production");
		expect(config.breweryApiUrl).toBe("https://api.brewery.com");
		expect(config.jwtSecret).toBe("custom-secret");
		expect(config.port).toBe(5000);

		// Put the original env back
		process.env = originalEnv;
	});

	// Test handling when there’s no .env file
	it("should handle missing .env file gracefully", () => {
		// Store the original env
		const originalEnv = { ...process.env };
		// Set NODE_ENV to something weird and clear others
		process.env.NODE_ENV = "nonexistent";
		delete process.env.BREWERY_API_URL;
		delete process.env.JWT_SECRET;
		delete process.env.PORT;

		// Load config with no .env file
		const { config } = require("../../config/config");

		// Verify it uses NODE_ENV and falls back for the rest
		expect(config.environment).toBe("nonexistent");
		expect(config.breweryApiUrl).toBe("http://localhost:5089");
		expect(config.jwtSecret).toBe(
			"thisIsOurSupserSecretKeyOnlyKnownToTheBestStudentsAtConestoga"
		);
		expect(config.port).toBe(3004);

		// Restore the original env
		process.env = originalEnv;
	});
});
