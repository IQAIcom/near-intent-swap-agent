# 🔄 NEAR intents Agent

A CLI agent for intent-driven token swaps on the NEAR blockchain using Intents powered by 1click api, built with [`@iqai/adk`](https://github.com/IQAICOM/adk-ts). This project enables safe, automated, and user-friendly NEAR token swaps using natural language prompts.

## ✨ Features
- Intent-based NEAR token swaps via CLI
- Automated account import and token discovery
- Handles NEAR and NEP-141 tokens with correct decimal scaling
- Built-in session management and safety checks
- Extensible with new tools and services

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IQAICOM/near-intents-agent.git
   cd near-intents-agent
   ```
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Set up environment variables:**
   ```bash
   cp example.env .env
   # Edit .env and provide your GOOGLE_API_KEY and (optionally) NEAR credentials
   ```
   - `GOOGLE_API_KEY` is required for some agent features ([get it here](https://aistudio.google.com/apikey)).
   - `USER_ACCOUNT_ID` and `USER_ACCOUNT_KEY` are needed for NEAR account operations.
   - `NEAR_NODE_URL` defaults to public mainnet if not set.

4. **Run the agent:**
   ```bash
   pnpm dev
   ```

## ⚙️ Environment Variables
| Variable            | Required | Description                                                      |
|---------------------|----------|------------------------------------------------------------------|
| `GOOGLE_API_KEY`    | Yes      | Google API key for agent features                                |
| `USER_ACCOUNT_ID`   | Optional | NEAR account ID for swaps (required for account operations)      |
| `USER_ACCOUNT_KEY`  | Optional | NEAR private key (format: ed25519:...)                           |
| `NEAR_NODE_URL`     | Optional | NEAR RPC endpoint (defaults to public mainnet)                   |
| `DEBUG`             | Optional | Set to "true" for debug output                                   |
| `PATH`              | Yes      | System PATH (inherited automatically in most environments)       |

## 🧑‍💻 Usage
- Start the CLI and follow prompts to perform NEAR swaps
- The agent will import your NEAR account (if credentials are provided) and fetch available tokens.
- All token amounts must be input using the correct decimals (see CLI instructions for details).
- Type `quit` or `exit` to end the session.

## 🛠️ Development
- **Build:** `pnpm build`
- **Start (prod):** `pnpm start`
- **Dev mode:** `pnpm dev`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

## 📄 License
MIT License – see [LICENSE](LICENSE) for details.

## 📚 Links & Support
- [ADK Library](https://github.com/IQAICOM/adk-ts)
- [NEAR Protocol Docs](https://docs.near.org/)
- [Create an issue](https://github.com/IQAICOM/near-intents-agent/issues)