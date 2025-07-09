import { config } from "dotenv";
import { z } from "zod/v4";

config();

type KeyPairString = `ed25519:${string}` | `secp256k1:${string}`;

const keyPairSchema = z.custom<KeyPairString>(
	(val) => {
		if (typeof val !== "string") return false;
		return val.startsWith("ed25519:") || val.startsWith("secp256k1:");
	},
	{
		message: "ACCOUNT_KEY must start with 'ed25519:' or 'secp256k1:'",
	},
);

export const envSchema = z.object({
	DEBUG: z.stringbool().default(false),
	GOOGLE_API_KEY: z.string(),
	USER_ACCOUNT_ID: z.string().optional(),
	USER_ACCOUNT_KEY: keyPairSchema.optional(),
	NEAR_NODE_URL: z
		.string()
		.default("https://near.blockpi.network/v1/rpc/public"),
	PATH: z.string(),
});

export const env = envSchema.parse(process.env);
