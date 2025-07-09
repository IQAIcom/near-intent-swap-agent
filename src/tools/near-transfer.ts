import { BaseTool } from "@iqai/adk";
import { Account, KeyPairSigner, transactions } from "near-api-js";
import { JsonRpcProvider } from "near-api-js/lib/providers/json-rpc-provider.js";
import { env } from "../env";

export class NearTransferTool extends BaseTool {
	private account: Account | null = null;

	constructor() {
		super({
			name: "near_token_transfer",
			description: "Transfer NEAR or NEP-141 tokens to a specified address",
		});
	}

	async initAccount() {
		if (this.account) return this.account;
		const signer = KeyPairSigner.fromSecretKey(env.USER_ACCOUNT_KEY);
		const provider = new JsonRpcProvider({ url: env.NEAR_NODE_URL });
		this.account = new Account(env.USER_ACCOUNT_ID, provider, signer);
		return this.account;
	}

	async runAsync(args: {
		address: string;
		amount: string; // human-readable
		token: string; // "NEAR" or NEP-141 contract address
	}) {
		try {
			const { address, amount, token } = args;
			if (!address || !amount || !token) {
				return { error: "Missing required parameters: address, amount, token" };
			}
			const account = await this.initAccount();
			if (token === "NEAR") {
				// Send native NEAR using functionCall with attached deposit to ensure exact amount
				// Convert to yoctoNEAR using BigInt to avoid precision issues
				const [whole, fraction = ""] = amount.split(".");
				const paddedFraction = (fraction + "0".repeat(24)).slice(0, 24);
				const yoctoAmount = BigInt(whole + paddedFraction);

				// Use functionCall with attached deposit - gas is paid separately
				const GAS = 30000000000000n; // 30 TGas

				// Suppress ALL console output for cleaner demo experience
				const originalConsoleError = console.error;
				const originalConsoleLog = console.log;
				const originalConsoleWarn = console.warn;
				const originalStderrWrite = process.stderr.write;

				console.error = () => {};
				console.log = () => {};
				console.warn = () => {};
				process.stderr.write = () => true;

				try {
					// Try calling a deposit method if it exists
					const result = await account.functionCall({
						contractId: address,
						methodName: "deposit",
						args: {},
						gas: GAS,
						attachedDeposit: yoctoAmount,
					});
					return { success: true, txHash: result.transaction.hash };
				} catch (error) {
					// If no deposit method, try storage_deposit (common for many contracts)
					try {
						const result = await account.functionCall({
							contractId: address,
							methodName: "storage_deposit",
							args: { account_id: null },
							gas: GAS,
							attachedDeposit: yoctoAmount,
						});
						return { success: true, txHash: result.transaction.hash };
					} catch (storageError) {
						// If all else fails, use transfer action (but with BigInt precision)
						const actions = [transactions.transfer(yoctoAmount)];

						const result = await account.signAndSendTransaction({
							receiverId: address,
							actions: actions,
						});

						return { success: true, txHash: result.transaction.hash };
					}
				} finally {
					// Restore all console methods
					console.error = originalConsoleError;
					console.log = originalConsoleLog;
					console.warn = originalConsoleWarn;
					process.stderr.write = originalStderrWrite;
				}
			}
			// Send NEP-141 token
			// 1. Get token decimals
			const ftMetadata = await account.viewFunction({
				contractId: token,
				methodName: "ft_metadata",
				args: {},
			});
			const decimals =
				typeof ftMetadata === "object" && ftMetadata && "decimals" in ftMetadata
					? Number(ftMetadata.decimals)
					: undefined;
			if (typeof decimals !== "number" || Number.isNaN(decimals))
				return { error: "Could not fetch token decimals" };
			// 2. Scale amount
			// Use BigInt for precision
			const [whole, fraction = ""] = amount.split(".");
			const paddedFraction = (fraction + "0".repeat(decimals)).slice(
				0,
				decimals,
			);
			const scaledAmount = BigInt(whole + paddedFraction);
			// 3. Call ft_transfer
			const GAS = 30000000000000n;
			const ONE_YOCTO = 1n;
			const result = await account.functionCall({
				contractId: token,
				methodName: "ft_transfer",
				args: { receiver_id: address, amount: scaledAmount.toString() },
				gas: GAS,
				attachedDeposit: ONE_YOCTO,
			});
			return { success: true, txHash: result.transaction.hash };
		} catch (error) {
			return {
				error: `Transfer error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	getDeclaration() {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					address: { type: "string", description: "Recipient NEAR address" },
					amount: {
						type: "string",
						description: "Amount to transfer (human-readable)",
					},
					token: {
						type: "string",
						description: 'Token symbol or contract address ("NEAR" for native)',
					},
				},
				required: ["address", "amount", "token"],
			},
		};
	}
}
