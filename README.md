# Modern & Minimalist Royalty Distribution Platform

A Web3 application for automated royalty distribution using tokenized IP rights on the Stellar blockchain. Smart contracts track usage across platforms and distribute payments in real-time to all stakeholders.

## Features

- **Tokenized IP Rights**: Create and manage intellectual property assets as tokens on Stellar
- **Automated Royalty Distribution**: Real-time payment distribution to all stakeholders
- **Cross-Platform Tracking**: Monitor usage across Spotify, YouTube, Apple Music, Bandcamp, and more
- **Stakeholder Management**: Flexible royalty sharing with multiple stakeholders
- **Real-time Analytics**: Dashboard with comprehensive usage and earnings insights
- **Smart Contract Integration**: Secure and transparent blockchain-based royalty management

## Architecture

```
Frontend (React)     Backend (Node.js)     Smart Contracts (Stellar)
       |                      |                         |
       |                      |                         |
   User Interface      API Gateway         Tokenized IP Rights
   Dashboard          Usage Tracker        Royalty Distribution
   Analytics          Royalty Engine      Stakeholder Management
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS for minimalist design
- **State Management**: Zustand
- **Routing**: React Router
- **Charts**: Chart.js for analytics
- **Web3**: Stellar SDK for blockchain interaction

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for real-time data
- **Queue**: Bull Queue for background jobs
- **Webhooks**: For platform integrations

### Smart Contracts
- **Blockchain**: Stellar Network
- **Language**: Soroban (Rust)
- **Development**: Stellar CLI
- **Testing**: Stellar Soroban SDK

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Rust (for smart contracts)
- Stellar CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd royalty-distribution-platform
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   npm install

   # Smart Contracts
   cd ../smart-contracts
   cargo build
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```
   cd ../frontend
   cp .env.example .env
   # Edit .env if needed

4. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Deploy smart contracts**
   ```bash
   cd smart-contracts
   cargo run --bin deploy
   ```

7. **Start the development servers**
   ```bash
   # Backend (in one terminal)
   cd backend
   npm run dev

   # Frontend (in another terminal)
   cd frontend
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## Configuration

### Environment Variables

Key environment variables for the backend:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/royalty_distribution"

# Stellar
STELLAR_NETWORK=testnet
STELLAR_DISTRIBUTION_ACCOUNT=YOUR_ACCOUNT_ADDRESS
STELLAR_DISTRIBUTION_SECRET=YOUR_ACCOUNT_SECRET

# Smart Contracts (after deployment)
IP_TOKEN_CONTRACT_ADDRESS=DEPLOYED_CONTRACT_ADDRESS
ROYALTY_DISTRIBUTOR_CONTRACT_ADDRESS=DEPLOYED_CONTRACT_ADDRESS
STAKEHOLDER_MANAGER_CONTRACT_ADDRESS=DEPLOYED_CONTRACT_ADDRESS

# Platform Integrations
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
YOUTUBE_API_KEY=your-youtube-api-key
```

## Smart Contracts

The platform uses three main smart contracts:

### 1. IP Token Contract
- Manages creation and ownership of IP assets
- Handles royalty share configuration
- Provides metadata storage

### 2. Royalty Distributor Contract
- Records usage events
- Calculates royalty distributions
- Processes payments to stakeholders

### 3. Stakeholder Manager Contract
- Manages stakeholder registration
- Handles permissions and rights
- Provides role-based access control

## API Documentation

### Main Endpoints

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/ip-assets` - List IP assets
- `POST /api/ip-assets` - Create new IP asset
- `GET /api/stakeholders` - List stakeholders
- `GET /api/royalties` - List royalty payments
- `POST /api/usage/track` - Record usage event
- `POST /api/usage/webhook/:platform` - Platform webhook endpoint

### Webhook Integration

Platforms can send usage data via webhooks:

```bash
# Spotify webhook
POST /api/usage/webhook/spotify
Content-Type: application/json

{
  "streams": [
    {
      "track_id": "ip_token_id",
      "count": 1000,
      "country": "US",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Platform Integrations

### Supported Platforms

1. **Spotify** - Stream tracking via API and webhooks
2. **YouTube** - View count monitoring
3. **Apple Music** - Play tracking
4. **Bandcamp** - Purchase and download tracking
5. **Custom** - Generic webhook support for any platform

### Adding a New Platform

1. Create platform-specific webhook parser in `UsageTrackerService`
2. Add platform configuration to database
3. Set up webhook endpoint with the platform
4. Test integration with sample data

## Deployment

### Production Deployment

1. **Database Setup**
   ```bash
   # Set up PostgreSQL
   createdb royalty_distribution
   npx prisma migrate deploy
   ```

2. **Smart Contract Deployment**
   ```bash
   cd smart-contracts
   cargo run --bin deploy --release -- --network mainnet
   ```

3. **Backend Deployment**
   ```bash
   cd backend
   npm run build
   npm start
   ```

4. **Frontend Deployment**
   ```bash
   cd frontend
   npm run build
   # Deploy to your preferred hosting service
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Monitoring and Logging

- **Application Logs**: Winston logger with file rotation
- **Database Monitoring**: Prisma query logging
- **Redis Monitoring**: Built-in Redis monitoring
- **Stellar Monitoring**: Transaction tracking and validation

## Security Considerations

- **Multi-signature Wallets**: Support for multi-sig Stellar accounts
- **Role-based Access Control**: Granular permissions for stakeholders
- **Audit Trails**: Complete transaction history on blockchain
- **API Authentication**: JWT-based authentication
- **Smart Contract Audits**: Comprehensive security audits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Email: support@royalty-platform.com

## Roadmap

- [ ] Support for additional blockchain networks
- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] NFT marketplace integration
- [ ] DeFi integration for yield farming
- [ ] Cross-chain royalty distribution
