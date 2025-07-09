import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import {
	AgentBuilder,
	InMemorySessionService,
	McpNearIntentSwaps,
	type Runner,
	type Session,
} from "@iqai/adk";
import { blue, bold, cyan, dim, green, magenta, red, yellow } from "colorette";
import {
	AGENT_DESCRIPTION,
	AGENT_INSTRUCTIONS,
	INTRO_TEXT,
	OUTRO_TEXT,
} from "./prompts";
import { NearTransferTool } from "./tools/near-transfer";

export class NearSwapAgentCLI {
	private runner!: Runner;
	private session!: Session;

	// Main entry point
	async run() {
		this.printIntro();
		await this.initializeAgent();
		await this.loadTokenData();
		this.printReady();
		await this.mainLoop();
		this.printOutro();
	}

	private printIntro() {
		console.clear();
		intro(bold(cyan(INTRO_TEXT.title)));
		console.log(dim("━".repeat(60)));
		console.log(bold(magenta(INTRO_TEXT.subtitle)));
		console.log(dim("━".repeat(60)));
	}

	private async initializeAgent() {
		const s = spinner();
		s.start(cyan("🔧 Initializing agent..."));

		const toolset = McpNearIntentSwaps({
			env: {
				NEAR_SWAP_JWT_TOKEN: process.env.NEAR_SWAP_JWT_TOKEN,
			},
		});
		const nearTransferTool = new NearTransferTool();
		const tools = await toolset.getTools();

		const { runner, session } = await AgentBuilder.create("near_swap_agent")
			.withModel("gpt-4o-mini")
			.withDescription(AGENT_DESCRIPTION)
			.withInstruction(AGENT_INSTRUCTIONS)
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

		this.runner = runner;
		this.session = session;

		s.stop(green("✅ Agent created"));
	}

	private async loadTokenData() {
		const s = spinner();
		s.start(blue("🔍 Loading token data..."));
		for await (const _event of this.runner.runAsync({
			userId: "cli-user",
			sessionId: this.session.id,
			newMessage: {
				parts: [
					{
						text: "Call the GET_NEAR_SWAP_TOKENS tool and remember the data from this tool call for future use",
					},
				],
			},
		})) {
			// No-op, just waiting for completion
		}
		s.stop(green("✅ Ready to swap!"));
	}

	private printReady() {
		console.log(`\n${dim("━".repeat(60))}`);
		console.log(bold(green("🎯 NEAR Intent Swap Agent Ready")));
		console.log(dim("💡 Ask me about token swaps, prices, or DeFi operations"));
		console.log(dim("💬 Type 'quit' or 'exit' to end the conversation"));
		console.log(`${dim("━".repeat(60))}\n`);
	}

	private async mainLoop() {
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
				let response = "";

				for await (const event of this.runner.runAsync({
					userId: "cli-user",
					sessionId: this.session.id,
					newMessage: { parts: [{ text: input }] },
				})) {
					if (event.content?.parts && !event.partial) {
						const content = event.content.parts
							.map((part: { text?: string }) => part.text)
							.filter(
								(text: string | undefined): text is string =>
									text !== undefined,
							)
							.join("");
						if (content) response += content;
					}
				}

				s.stop();

				if (response) {
					console.log(`\n${bold(cyan("🤖 Agent:"))}`);
					console.log(`${green(response)}\n`);
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

	private printOutro() {
		console.log(`\n${dim("━".repeat(60))}`);
		outro(bold(green(OUTRO_TEXT)));
		console.log(dim("━".repeat(60)));
	}
}
