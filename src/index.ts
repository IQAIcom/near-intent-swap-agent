import { cancel } from "@clack/prompts";
import { bold, red } from "colorette";
import { config } from "dotenv";
import { NearSwapAgentCLI } from "./cli-agent";

config();

async function main() {
	const cli = new NearSwapAgentCLI();
	await cli.run();
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
