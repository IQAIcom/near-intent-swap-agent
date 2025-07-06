import { getSwapAgent } from "./agents/swap-agent";

async function main() {
	const swapAgent = await getSwapAgent();
	const response = await swapAgent.run({
		messages: [
			{ role: "user", content: "What is the current price of NEAR in USD?" },
		],
	});
	console.log(response.content);
}

main().catch(console.error);
