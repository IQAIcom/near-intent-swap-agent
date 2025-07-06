import { Agent, McpToolset } from "@iqai/adk";
import { env } from "../env";

export const getSwapAgent = async () => {
	const nearIntentSwapsToolSet = new McpToolset({
		name: "Near Intent Swaps MCP Client",
		description: "Client for Near Intent Swaps",
		debug: env.DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@iqai/mcp-near-intent-swaps"],
			env: {
				PATH: env.PATH,
			},
		},
	});

	const nearIntentSwapsTools = await nearIntentSwapsToolSet.getTools();

	const agent = new Agent({
		name: "Near Intent Swaps MCP Client",
		description: "Client for Near Intent Swaps",
		model: "gemini-2.0-flash",
		tools: nearIntentSwapsTools,
	});

	return agent;
};
