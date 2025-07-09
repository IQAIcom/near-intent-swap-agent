import { Account, KeyPairSigner } from "near-api-js";
import { JsonRpcProvider } from "near-api-js/lib/providers";
import type { KeyPairString } from "near-api-js/lib/utils";
import { env } from "./env";

export interface TokenBalance {
	token: string;
	balance: string;
	formatted: string;
}
export class SwapService {
	private account: Account;
	private userAccountId: string;
	private userAccountKey: KeyPairString;

	constructor() {
		if (!env.USER_ACCOUNT_ID || !env.USER_ACCOUNT_KEY) {
			throw Error("User account id or account key not set");
		}
		this.userAccountId = env.USER_ACCOUNT_ID;
		this.userAccountKey = env.USER_ACCOUNT_KEY;

		const signer = KeyPairSigner.fromSecretKey(this.userAccountKey);
		const provider = new JsonRpcProvider({
			url: env.NEAR_NODE_URL,
		});
		this.account = new Account(this.userAccountId, provider, signer);
	}

	async getTokenBalance(tokenContract: string): Promise<TokenBalance> {
		try {
			const result = await this.account.callFunction({
				contractId: tokenContract,
				methodName: "ft_balance_of",
				args: { account_id: this.userAccountId },
			});
			const metadata = (await this.account.callFunction({
				contractId: tokenContract,
				methodName: "ft_metadata",
				args: {},
			})) as { decimals: number; symbol: string };

			const balance = result as string;
			const decimals = metadata.decimals;
			const symbol = metadata.symbol;

			const formatted = (Number.parseInt(balance) / 10 ** decimals).toFixed(6);

			return {
				token: symbol,
				balance,
				formatted,
			};
		} catch (error) {
			console.error(JSON.stringify(error, null, 2));
			return {
				token: "Unknown",
				balance: "0",
				formatted: "0.000000",
			};
		}
	}

	async getNEARBalance(): Promise<TokenBalance> {
		try {
			const balance = await this.account.getBalance();
			const formatted = (Number.parseInt(balance.toString()) / 1e24).toFixed(6);

			return {
				token: "NEAR",
				balance: balance.toString(),
				formatted,
			};
		} catch (error) {
			console.error(JSON.stringify(error, null, 2));
			return {
				token: "NEAR",
				balance: "0",
				formatted: "0.000000",
			};
		}
	}

	/**
	 * Transfers FT tokens from the user's account to a contract address.
	 * @param fromAddress The NEP-141 token contract address
	 * @param toAddress The destination account/contract address
	 * @param amount The amount in yocto (as string or bigint)
	 */
	async transferTo({
		fromAddress,
		toAddress,
		amount,
	}: {
		fromAddress?: string;
		toAddress: string;
		amount: string | bigint;
	}): Promise<unknown> {
		try {
			if (!fromAddress) {
				// check native token balance
				const balance = await this.getNEARBalance();
				if (BigInt(balance.balance) < BigInt(amount)) {
					throw Error("Insufficient balance");
				}
			} else {
				// Check if the user has enough balance
				const balance = await this.getTokenBalance(fromAddress);
				if (BigInt(balance.balance) < BigInt(amount)) {
					throw Error("Insufficient balance");
				}
			}
			let result: unknown;
			if (fromAddress) {
				// Transfer tokens using ft_transfer
				result = await this.account.callFunction({
					contractId: fromAddress,
					methodName: "ft_transfer",
					args: {
						receiver_id: toAddress,
						amount: amount.toString(),
					},
					deposit: "1",
				});
			} else {
				result = await this.account.transfer({
					amount: amount.toString(),
					receiverId: toAddress,
				});
			}

			return JSON.stringify(result, null, 2);
		} catch (error) {
			console.error(JSON.stringify(error, null, 2));
			throw error;
		}
	}
}
