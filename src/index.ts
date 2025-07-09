import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import {
	AgentBuilder,
	InMemorySessionService,
	McpNearIntentSwaps,
} from "@iqai/adk";
import { blue, bold, cyan, dim, green, magenta, red, yellow } from "colorette";
import dedent from "dedent";
import { config } from "dotenv";
import { env } from "./env";
import { NearTransferTool } from "./tools/near-transfer";

config();

// Suppress deprecation warnings for cleaner demo output
process.removeAllListeners("warning");
process.on("warning", () => {});

async function main() {
	// Clear screen for clean demo start
	console.clear();

	intro(bold(cyan("🚀 NEAR Intent Swap Agent CLI")));
	console.log(dim("━".repeat(60)));
	console.log(bold(magenta("🌟 Powered by AI • Built for NEAR Protocol")));
	console.log(dim("━".repeat(60)));

	const s = spinner();
	s.start(cyan("🔧 Initializing agent..."));

	// Setup NEAR Intent Swaps tools
	const toolset = McpNearIntentSwaps({
		env: {
			NEAR_SWAP_JWT_TOKEN: process.env.NEAR_SWAP_JWT_TOKEN,
		},
	});

	const nearTransferTool = new NearTransferTool();

	const tools = await toolset.getTools();

	// Create agent with session management
	const { runner, session } = await AgentBuilder.create("near_swap_agent")
		.withModel("gpt-4o-mini")
		.withDescription(
			"Expert assistant for NEAR token swaps and DeFi operations",
		)
		.withInstruction(dedent`
			You are a helpful assistant for NEAR Intent Swaps.
			Help users with cross-chain token swaps using the available tools.
			Always prioritize user safety and explain processes clearly.
			Don't exit the loop unless you have a valid response.
			IMPORTANT:
			when inputting amount in, always make sure you use the decimals mentioned in the origin token metadata.
			FOR EXAMPLE:
			say you are getting a quote from swapping 1000 usdt to wNear,
			usdt uses 6 decimals, so you need to input 1000 * 10^6 = 1000000000, ignore the tool param description,ALWAYS PASS IN PROPER WEI AMOUNT USING THE BASE DECIMALS OF THE ORIGIN TOKEN.
			ALWAYS CONSIDER DECIMAL SCALING!
			for USDT (6 decimals):
			for input of 1000$ -> 1000 * 10^6 = 1000000000
			for input of 10$ -> 10 * 10^6 = 10000000
			for input of 1$ -> 1 * 10^6 = 1000000

			for wNEAR (24 decimals):
			for input of 1000 wNEAR -> 1000 * 10^24 = 1000000000000000000000000
			for input of 10 wNEAR -> 10 * 10^24 = 100000000000000000000000
			for input of 1 wNEAR -> 1 * 10^24 = 10000000000000000000000

			SIMILARLY FOR OTHER TOKENS, YOU NEED TO USE THE CORRECT DECIMALS.

			IMPORTANT:
			USE THIS : ${env.USER_ACCOUNT_ID} AS THE RECIPIENT ADDRESS & REFUND ADDRESS FOR ALL NEAR TRANSFERS.
			DO NOT ASK USER TO PROVIDE THE RECIPIENT ADDRESS OR REFUND ADDRESS, USE THE ONE ABOVE.

			IMPORTANT:
			USE THE near_token_transfer TOOL TO DO THE TRANSFERS AND NEVER ASK THE USER TO PROVIDE TRANSACTION HASHES INSTEAD. ASK USERS PERMISSION WHEN YOU WANT TO DO THE TRANSFER.
		`)
		.withTools(...tools, nearTransferTool)
		.withSession(
			new InMemorySessionService(),
			"cli-user",
			"near-intent-swap-agent",
		)
		.build();

	if (!runner || !session) {
		throw new Error("Failed to create agent");
	}

	s.stop(green("✅ Agent created"));

	s.start(blue("🔍 Loading token data..."));
	for await (const event of runner.runAsync({
		userId: "cli-user",
		sessionId: session.id,
		newMessage: {
			parts: [
				{
					text: "Call the GET_NEAR_SWAP_TOKENS tool and remember the data from this tool call for future use",
				},
			],
		},
	})) {
		// do nothing
	}
	s.stop(green("✅ Ready to swap!"));

	console.log(`\n${dim("━".repeat(60))}`);
	console.log(bold(green("🎯 NEAR Intent Swap Agent Ready")));
	console.log(dim("💡 Ask me about token swaps, prices, or DeFi operations"));
	console.log(dim("💬 Type 'quit' or 'exit' to end the conversation"));
	console.log(`${dim("━".repeat(60))}\n`);

	// Main conversation loop
	while (true) {
		const userInput = await text({
			message: bold(yellow("💬 You:")),
			placeholder: "What would you like to swap today?",
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
		spinner.start(magenta("🤔 Processing your request..."));

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
				console.log(`\n${bold(cyan("🤖 Agent:"))}`);
				console.log(`${green(response)}\n`);
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

	console.log(`\n${dim("━".repeat(60))}`);
	outro(bold(green("Thanks for using NEAR Intent Swap Agent! 🚀✨")));
	console.log(dim("━".repeat(60)));
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
