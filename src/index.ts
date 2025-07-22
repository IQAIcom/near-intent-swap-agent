import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import {
	AgentBuilder,
	type EnhancedRunner,
	InMemorySessionService,
	McpNearIntents,
} from "@iqai/adk";
import { blue, bold, cyan, dim, green, magenta, red, yellow } from "colorette";
import { config } from "dotenv";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import {
	AGENT_DESCRIPTION,
	AGENT_INSTRUCTIONS,
	INTRO_TEXT,
	OUTRO_TEXT,
} from "./prompts";
import { NearTransferTool } from "./tools/near-transfer";

config();

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
marked.use(markedTerminal() as any);

// Main function
async function main() {
	console.clear();
	intro(bold(cyan(INTRO_TEXT.title)));
	const runner = await initializeAgent();
	await loadTokenData(runner);
	printReady();
	await mainLoop(runner);
	outro(bold(green(OUTRO_TEXT)));
}

async function mainLoop(runner: EnhancedRunner) {
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

		const s = spinner();
		s.start(magenta("🤔 Processing your request..."));

		try {
			const response = await runner.ask(input);
			s.stop();
			if (response) {
				console.log(`\n${bold(cyan("🤖 Agent:"))}`);
				console.log(`${termParsedMd(response)}\n`);
			} else {
				console.log(`\n${bold(red("❌ No response received"))}\n`);
			}
		} catch (error) {
			s.stop();
			console.error(
				`\n${bold(red("❌ Error:"))} ${error instanceof Error ? error.message : "Unknown error"}\n`,
			);
		}
	}
}

async function initializeAgent(): Promise<EnhancedRunner> {
	return withSpinner(
		cyan("🔧 Initializing agent..."),
		green("✅ Agent created"),
		async () => {
			const toolset = McpNearIntents({
				env: {
					NEAR_SWAP_JWT_TOKEN: process.env.NEAR_SWAP_JWT_TOKEN,
				},
			});
			const nearTransferTool = new NearTransferTool();
			const tools = await toolset.getTools();

			const { runner } = await AgentBuilder.create("near_swap_agent")
				.withModel("gpt-4o-mini")
				.withDescription(AGENT_DESCRIPTION)
				.withInstruction(AGENT_INSTRUCTIONS)
				.withTools(...tools, nearTransferTool)
				.withSession(new InMemorySessionService())
				.build();

			return runner;
		},
	);
}

async function loadTokenData(runner: EnhancedRunner) {
	return withSpinner(
		blue("🔍 Loading token data..."),
		green("✅ Ready to swap!"),
		async () => {
			await runner.ask(
				"Call the GET_NEAR_SWAP_TOKENS tool and remember the data from this tool call for future use",
			);
		},
	);
}

function printReady() {
	console.log(`\n${dim("━".repeat(60))}`);
	console.log(bold(green("🎯 NEAR intents Agent Ready")));
	console.log(dim("💡 Ask me about token swaps, prices, or DeFi operations"));
	console.log(dim("💬 Type 'quit' or 'exit' to end the conversation"));
	console.log(`${dim("━".repeat(60))}\n`);
}

const termParsedMd = (markdownString: string) => marked.parse(markdownString);

async function withSpinner<T>(
	startMessage: string,
	successMessage: string,
	fn: () => Promise<T>,
): Promise<T> {
	const s = spinner();
	s.start(startMessage);
	try {
		const result = await fn();
		s.stop(successMessage);
		return result;
	} catch (error) {
		s.stop();
		throw error;
	}
}

// Handle Ctrl+C gracefully
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
