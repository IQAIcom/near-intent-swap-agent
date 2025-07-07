import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import { AgentBuilder, InMemorySessionService, McpToolset } from "@iqai/adk";
import { bold, cyan, dim, green, red, yellow } from "colorette";
import dedent from "dedent";
import { env } from "./env";

async function main() {
	intro(bold(cyan("🚀 NEAR Intent Swap Agent CLI")));

	const s = spinner();
	s.start("Initializing agent...");

	// Setup NEAR Intent Swaps tools
	const toolset = new McpToolset({
		name: "Near Intent Swaps MCP Client",
		description: "Client for Near Intent Swaps",
		debug: env.DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@iqai/mcp-near-intent-swaps"],
			env: { PATH: env.PATH },
		},
	});

	const tools = await toolset.getTools();

	// Create agent with session management
	const { runner, session } = await AgentBuilder.create("near_swap_agent")
		.withModel("gemini-2.0-flash")
		.withDescription(
			"Expert assistant for NEAR token swaps and DeFi operations",
		)
		.withInstruction(dedent`
			You are a helpful assistant for NEAR Intent Swaps.
			Help users with cross-chain token swaps using the available tools.
			Always prioritize user safety and explain processes clearly.
			Don't exit the loop unless you have a valid response.
		`)
		.withTools(...tools)
		.withSession(
			new InMemorySessionService(),
			"cli-user",
			"near-intent-swap-agent",
		)
		.build();

	if (!runner || !session) {
		throw new Error("Failed to create agent");
	}

	s.stop("✅ Agent ready!");

	console.log(
		dim("Ask me about NEAR token swaps, prices, or DeFi operations."),
	);
	console.log(dim("Type 'quit' or 'exit' to end the conversation.\n"));

	// Main conversation loop
	while (true) {
		const userInput = await text({
			message: yellow("💬 You:"),
			placeholder: "What would you like to know about NEAR swaps?",
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return "Please enter a message";
				}
				return undefined;
			},
		});

		if (isCancel(userInput)) {
			cancel("Cancelled.");
			process.exit(0);
		}

		if (typeof userInput !== "string") continue;

		const input = userInput.trim();
		if (input.toLowerCase() === "quit" || input.toLowerCase() === "exit") {
			break;
		}

		const spinner = s;
		spinner.start("🤔 Thinking...");

		try {
			let response = "";

			for await (const event of runner.runAsync({
				userId: "cli-user",
				sessionId: session.id,
				newMessage: { parts: [{ text: input }] },
			})) {
				if (event.content?.parts && !event.partial) {
					const content = event.content.parts
						.map((part) => part.text)
						.filter((text) => text !== undefined)
						.join("");
					if (content) response += content;
				}
			}

			spinner.stop();

			if (response) {
				console.log(`\n${bold(cyan("🤖 Agent:"))}\n${green(response)}\n`);
			} else {
				console.log(`\n${bold(red("❌ No response received"))}\n`);
			}
		} catch (error) {
			spinner.stop();
			console.error(
				`\n${bold(red("❌ Error:"))} ${error instanceof Error ? error.message : "Unknown error"}\n`,
			);
		}
	}

	outro(bold(green("Thanks for using NEAR Intent Swap Agent! 👋")));
}

process.on("SIGINT", () => {
	console.log("\n");
	cancel("Cancelled.");
	process.exit(0);
});

main().catch((error) => {
	console.error(
		`\n${bold(red("❌ Fatal error:"))} ${error instanceof Error ? error.message : "Unknown error"}\n`,
	);
	process.exit(1);
});
