# 🌉 Cross-Chain USDC Transfer

A modern, user-friendly decentralized application for bridging USDC across multiple blockchain networks using Circle's Cross-Chain Transfer Protocol (CCTP). Built with React, Vite, and Circle's Bridge Kit.

[![Live Demo](https://img.shields.io/badge/demo-crosschain.thosoft.xyz-blue)](https://crosschain.thosoft.xyz)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

- 🔄 **Seamless Cross-Chain Transfers** - Bridge USDC between Ethereum, Polygon, Arbitrum, Base, and Solana
- 🔐 **Multi-Wallet Support** - Connect with MetaMask, Coinbase Wallet, Phantom, Solflare, and more
- ⚡ **Real-Time Status Tracking** - Monitor your transfer progress with live updates
- 🔁 **Recovery Mode** - Resume incomplete transfers using transaction hash
- 🎨 **Beautiful UI** - Modern interface with animated 3D backgrounds
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔒 **Non-Custodial** - Your keys, your crypto - all transfers are self-custodial

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- pnpm (recommended) or npm
- A wallet browser extension (MetaMask, Phantom, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/NumberZeros/cross-chain-cirle.git
cd cross-chain-cirle

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Solana RPC Configuration
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# For production, use a dedicated RPC provider:
# VITE_SOLANA_MAINNET_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_SOLANA_RPC_URL` | Solana RPC endpoint for devnet | No | `https://api.mainnet-beta.solana.com` |
| `VITE_SOLANA_MAINNET_RPC_URL` | Solana RPC endpoint for mainnet | No | Falls back to public RPC |

### Supported Chains

#### Mainnet
- **Ethereum** - Chain ID: 1, CCTP Domain: 0
- **Polygon** - Chain ID: 137, CCTP Domain: 7
- **Arbitrum** - Chain ID: 42161, CCTP Domain: 3
- **Base** - Chain ID: 8453, CCTP Domain: 6
- **Solana** - Chain ID: mainnet-beta, CCTP Domain: 5

#### Testnet
- Ethereum Sepolia (Chain ID: 11155111)
- Polygon Amoy (Chain ID: 80002)
- Solana Devnet

## 🏗️ Tech Stack

### Frontend Framework
- **React 19.2** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety

### Web3 Integration
- **@circle-fin/bridge-kit** - Circle's CCTP bridge SDK
- **@rainbow-me/rainbowkit** - EVM wallet connection
- **@solana/wallet-adapter** - Solana wallet connection
- **wagmi** - EVM wallet hooks
- **viem** - EVM chain interactions

### State Management
- **Zustand** - Lightweight state management
- **@tanstack/react-query** - Server state management

### UI/UX
- **TailwindCSS** - Utility-first CSS framework
- **Motion (Framer Motion)** - Animations
- **Three.js** - 3D graphics
- **Sonner** - Toast notifications

## 📦 Build & Deploy

### Build for Production

```bash
# Type-check and build
pnpm build

# Preview production build
pnpm preview
```

### Deploy to Vercel

1. **Push to GitHub** (see instructions below)

2. **Connect to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables:
     - `VITE_SOLANA_MAINNET_RPC_URL` - Your production Solana RPC URL

3. **Set Custom Domain:**
   - Go to Project Settings → Domains
   - Add `crosschain.thosoft.xyz`
   - Configure DNS settings as instructed

4. **Deploy:**
   - Vercel will automatically deploy on every push to main

### Manual Deploy

```bash
# Build the application
pnpm build

# The dist/ folder contains the production build
# Upload to any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.)
```

## 🔒 Security Considerations

### Best Practices

1. **Never commit `.env` files** - Always keep sensitive data out of version control
2. **Use dedicated RPC endpoints** - Public RPCs are rate-limited and unreliable for production
3. **Environment variables** - Store all secrets in Vercel/hosting platform environment variables
4. **HTTPS only** - Always use HTTPS in production to prevent MITM attacks
5. **Audit smart contracts** - Circle's CCTP contracts are audited, but always verify

### RPC Provider Recommendations

For production, use a dedicated RPC provider:
- [Alchemy](https://www.alchemy.com/) - Recommended
- [Helius](https://www.helius.dev/) - Solana-focused
- [QuickNode](https://www.quicknode.com/) - Multi-chain support

## 🏛️ Architecture

```
cross-chain-fe/
├── src/
│   ├── app/                    # App-level providers
│   │   └── app-providers.tsx   # Wallet & query client setup
│   ├── components/             # React components
│   │   ├── fx/                 # Visual effects
│   │   ├── layout/             # Layout components
│   │   └── transfer/           # Transfer UI
│   ├── config/                 # Chain configurations
│   │   └── chains.ts           # Chain definitions & CCTP config
│   ├── services/               # Business logic
│   │   ├── bridge.ts           # Bridge Kit integration
│   │   └── chains.ts           # Chain API
│   ├── state/                  # State management
│   │   ├── auth.store.ts       # Auth state (Zustand)
│   │   ├── chains.store.ts     # Chain list state
│   │   └── transfer.store.ts   # Transfer state & logic
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utility functions
│   └── App.tsx                 # Root component
├── public/                     # Static assets
├── .env.example                # Environment template
├── vercel.json                 # Vercel configuration
└── package.json                # Dependencies
```

### Data Flow

1. **User connects wallet** → RainbowKit/Solana Wallet Adapter
2. **User initiates transfer** → Transfer Store → Bridge Service
3. **Bridge Service** → Circle Bridge Kit → CCTP Protocol
4. **Burn USDC** → Source Chain (via wallet signature)
5. **Attestation** → Circle API (automatic)
6. **Mint USDC** → Destination Chain (via wallet signature)
7. **Status updates** → Real-time UI feedback

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add TypeScript types for all new code
- Test on both EVM and Solana chains
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Circle](https://www.circle.com/) - For CCTP and Bridge Kit
- [Rainbow](https://www.rainbow.me/) - For RainbowKit wallet connector
- [Solana Foundation](https://solana.org/) - For Wallet Adapter

## 📞 Support

- 🐛 [Report Issues](https://github.com/NumberZeros/cross-chain-cirle/issues)
- 💬 [Discussions](https://github.com/NumberZeros/cross-chain-cirle/discussions)
- 🌐 [Live Demo](https://crosschain.thosoft.xyz)

## 🔗 Links

- [Circle CCTP Documentation](https://developers.circle.com/stablecoins/docs/cctp-getting-started)
- [Bridge Kit Documentation](https://developers.circle.com/stablecoins/docs/bridge-kit)
- [Vercel Documentation](https://vercel.com/docs)

---

Made with ❤️ for the Web3 community
