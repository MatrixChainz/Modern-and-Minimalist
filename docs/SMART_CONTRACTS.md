# Smart Contracts Documentation

## Overview

The Royalty Distribution Platform uses three main smart contracts deployed on the Stellar blockchain using Soroban. These contracts handle IP tokenization, royalty distribution, and stakeholder management.

## Contract Architecture

```
IP Token Contract          Royalty Distributor Contract     Stakeholder Manager Contract
       |                               |                                   |
   IP Asset Creation              Usage Tracking                  Stakeholder Registration
   Royalty Configuration          Payment Processing              Permission Management
   Metadata Storage               Distribution Logic              Role-based Access
```

## 1. IP Token Contract

### Purpose
Manages the creation, ownership, and royalty configuration of intellectual property assets.

### Key Features
- IP asset tokenization
- Creator ownership tracking
- Royalty share configuration
- Metadata storage
- Transfer restrictions

### Functions

#### `initialize(admin: Address)`
Initializes the contract with an admin address.

#### `create_ip_token(creator, title, description, token_type, metadata, royalty_shares) -> String`
Creates a new IP token with specified parameters.

**Parameters:**
- `creator: Address` - Creator's Stellar address
- `title: String` - IP asset title
- `description: String` - IP asset description
- `token_type: TokenType` - Type of IP (Music, Video, Art, Text, Software)
- `metadata: Map<String, String>` - Additional metadata
- `royalty_shares: Vec<RoyaltyShare>` - Initial royalty distribution

**Returns:** Token ID for the created IP asset

#### `get_ip_asset(token_id: String) -> IPAsset`
Retrieves IP asset details by token ID.

#### `get_royalty_shares(token_id: String) -> Map<Address, u32>`
Retrieves royalty distribution for a token.

#### `update_royalty_shares(token_id, creator, new_shares)`
Updates royalty shares (only creator can modify).

#### `get_creator_assets(creator: Address) -> Vec<IPAsset>`
Gets all IP assets for a specific creator.

### Data Structures

```rust
pub struct IPAsset {
    pub id: String,
    pub title: String,
    pub description: String,
    pub creator: Address,
    pub token_type: TokenType,
    pub metadata: Map<String, String>,
    pub created_at: u64,
}

pub struct RoyaltyShare {
    pub stakeholder: Address,
    pub percentage: u32, // Basis points (10000 = 100%)
}

pub enum TokenType {
    Music,
    Video,
    Art,
    Text,
    Software,
}
```

## 2. Royalty Distributor Contract

### Purpose
Handles usage tracking, royalty calculation, and payment distribution to stakeholders.

### Key Features
- Usage event recording
- Automatic royalty calculation
- Payment processing
- Transaction tracking
- Multi-currency support

### Functions

#### `initialize(admin: Address)`
Initializes the contract with an admin address.

#### `record_usage(ip_token_id, platform, usage_type, amount, currency, metadata) -> String`
Records a usage event for an IP asset.

**Parameters:**
- `ip_token_id: String` - IP asset token ID
- `platform: String` - Platform name (Spotify, YouTube, etc.)
- `usage_type: String` - Type of usage (stream, download, license, sale)
- `amount: U256` - Usage amount
- `currency: String` - Currency code
- `metadata: Map<String, String>` - Additional metadata

**Returns:** Usage record ID

#### `distribute_royalties(usage_record_id, ip_token_contract) -> Vec<String>`
Calculates and distributes royalties for a usage event.

**Parameters:**
- `usage_record_id: String` - ID of the usage record
- `ip_token_contract: Address` - IP token contract address

**Returns:** Array of payment IDs

#### `process_payment(payment_id, transaction_hash)`
Marks a payment as completed with transaction hash.

#### `get_payment(payment_id: String) -> RoyaltyPayment`
Retrieves payment details.

#### `get_stakeholder_payments(stakeholder: Address) -> Vec<RoyaltyPayment>`
Gets all payments for a stakeholder.

#### `get_ip_usage_records(ip_token_id: String) -> Vec<UsageRecord>`
Gets all usage records for an IP asset.

#### `get_stakeholder_earnings(stakeholder, currency) -> U256`
Calculates total earnings for a stakeholder in specified currency.

### Data Structures

```rust
pub struct UsageRecord {
    pub id: String,
    pub ip_token_id: String,
    pub platform: String,
    pub usage_type: String,
    pub amount: U256,
    pub currency: String,
    pub timestamp: u64,
    pub metadata: Map<String, String>,
}

pub struct RoyaltyPayment {
    pub id: String,
    pub usage_record_id: String,
    pub stakeholder: Address,
    pub amount: U256,
    pub currency: String,
    pub transaction_hash: String,
    pub status: PaymentStatus,
    pub created_at: u64,
    pub processed_at: Option<u64>,
}

pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
}
```

## 3. Stakeholder Manager Contract

### Purpose
Manages stakeholder registration, permissions, and role-based access control.

### Key Features
- Stakeholder registration
- Role management
- Permission control
- Rights assignment
- Stakeholder verification

### Functions

#### `initialize(admin: Address)`
Initializes the contract with an admin address.

#### `register_stakeholder(name, email, wallet_address, role) -> String`
Registers a new stakeholder.

**Parameters:**
- `name: String` - Stakeholder name
- `email: String` - Contact email
- `wallet_address: Address` - Stellar wallet address
- `role: StakeholderRole` - Stakeholder role

**Returns:** Stakeholder ID

#### `get_stakeholder(wallet_address: Address) -> Stakeholder`
Retrieves stakeholder information.

#### `update_stakeholder(wallet_address, name, email, role)`
Updates stakeholder information.

#### `get_stakeholder_rights(wallet_address: Address) -> StakeholderRights`
Retrieves stakeholder permissions.

#### `update_stakeholder_rights(wallet_address, rights)`
Updates stakeholder permissions.

#### `get_all_stakeholders() -> Vec<Stakeholder>`
Lists all registered stakeholders.

#### `get_stakeholders_by_role(role: StakeholderRole) -> Vec<Stakeholder>`
Gets stakeholders filtered by role.

#### `has_permission(wallet_address, permission: String) -> bool`
Checks if stakeholder has specific permission.

#### `remove_stakeholder(wallet_address: Address)`
Removes a stakeholder from the system.

### Data Structures

```rust
pub struct Stakeholder {
    pub id: String,
    pub name: String,
    pub email: String,
    pub wallet_address: Address,
    pub role: StakeholderRole,
    pub created_at: u64,
    pub updated_at: u64,
}

pub struct StakeholderRights {
    pub can_view_reports: bool,
    pub can_manage_royalties: bool,
    pub can_add_ip_assets: bool,
    pub can_remove_ip_assets: bool,
}

pub enum StakeholderRole {
    Creator,
    Producer,
    Distributor,
    Publisher,
    Other,
}
```

## Deployment

### Prerequisites
- Rust 1.70+
- Stellar CLI
- Soroban CLI
- Testnet XLM for deployment

### Build Contracts

```bash
cd smart-contracts
cargo build --target wasm32-unknown-unknown --release
```

### Deploy to Testnet

```bash
# Deploy IP Token Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ip_token.wasm \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet

# Deploy Royalty Distributor Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/royalty_distributor.wasm \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet

# Deploy Stakeholder Manager Contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stakeholder_manager.wasm \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet
```

### Initialize Contracts

```bash
# Initialize IP Token Contract
soroban contract invoke \
  --id <IP_TOKEN_CONTRACT_ID> \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>

# Initialize Royalty Distributor Contract
soroban contract invoke \
  --id <ROYALTY_DISTRIBUTOR_CONTRACT_ID> \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>

# Initialize Stakeholder Manager Contract
soroban contract invoke \
  --id <STAKEHOLDER_MANAGER_CONTRACT_ID> \
  --source <DEPLOYER_ACCOUNT> \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

## Testing

### Unit Tests

```bash
cd smart-contracts
cargo test
```

### Integration Tests

```bash
# Run integration tests with testnet
cargo test --test integration -- --ignored
```

### Test Scenarios

1. **IP Token Creation**
   - Create IP asset with multiple stakeholders
   - Verify royalty distribution
   - Test ownership transfer

2. **Usage Tracking**
   - Record usage events
   - Calculate royalties
   - Process payments

3. **Stakeholder Management**
   - Register stakeholders
   - Assign permissions
   - Test role-based access

## Security Considerations

### Access Control
- Admin-only functions protected by address verification
- Creator-only functions for IP asset modification
- Role-based permissions for stakeholder operations

### Input Validation
- Royalty percentages must sum to 100%
- Addresses validated for Stellar format
- Amounts checked for overflow

### Audit Trail
- All operations logged on blockchain
- Transaction hashes for verification
- Timestamp tracking for all events

### Upgrade Mechanism
- Contract upgradeability through admin functions
- Data migration strategies
- Backward compatibility considerations

## Gas Fees and Costs

### Stellar Transaction Costs
- Base fee: 100 stroops per operation
- Contract deployment: ~10,000 XLM
- Typical operations: 500-2,000 stroops

### Optimization Strategies
- Batch operations for multiple stakeholders
- Efficient data storage patterns
- Minimal cross-contract calls

## Monitoring and Analytics

### On-Chain Metrics
- Total IP assets created
- Royalty payments processed
- Active stakeholders
- Platform usage statistics

### Off-Chain Analytics
- Transaction volume analysis
- Stakeholder behavior patterns
- Revenue trends
- Platform performance metrics

## Integration Examples

### JavaScript SDK

```javascript
import { StellarSDK } from 'stellar-sdk'

const sdk = new StellarSDK({
  network: 'testnet',
  contracts: {
    ipToken: 'IP_TOKEN_CONTRACT_ID',
    royaltyDistributor: 'ROYALTY_DISTRIBUTOR_CONTRACT_ID',
    stakeholderManager: 'STAKEHOLDER_MANAGER_CONTRACT_ID'
  }
})

// Create IP asset
const tokenId = await sdk.ipToken.createIPAsset({
  creator: 'GABC123...',
  title: 'Summer Vibes',
  description: 'Upbeat summer track',
  tokenType: 'Music',
  metadata: { genre: 'Pop' },
  royaltyShares: [
    { stakeholder: 'GABC123...', percentage: 6000 },
    { stakeholder: 'GDEF456...', percentage: 4000 }
  ]
})

// Record usage
const usageId = await sdk.royaltyDistributor.recordUsage({
  ipTokenId: tokenId,
  platform: 'spotify',
  usageType: 'stream',
  amount: 1000,
  currency: 'USD'
})
```

### Rust Integration

```rust
use soroban_sdk::{Env, Address};

// Create IP asset
let token_id = ip_token_contract::create_ip_token(
    &env,
    creator_address,
    String::from_str("Summer Vibes"),
    String::from_str("Upbeat summer track"),
    TokenType::Music,
    metadata_map,
    royalty_shares_vec,
);

// Record usage
let usage_id = royalty_distributor_contract::record_usage(
    &env,
    token_id,
    String::from_str("spotify"),
    String::from_str("stream"),
    1000.into(),
    String::from_str("USD"),
    metadata_map,
);
```

## Troubleshooting

### Common Issues

1. **Contract Not Found**
   - Verify contract ID is correct
   - Check network configuration
   - Ensure contract is deployed

2. **Transaction Failed**
   - Check account balance
   - Verify transaction sequence
   - Review error messages

3. **Permission Denied**
   - Verify caller address
   - Check role assignments
   - Review access control logic

### Debug Tools

- Soroban CLI for contract interaction
- Stellar Explorer for transaction tracking
- Contract logs for debugging
- Test network for safe testing

## Future Enhancements

### Planned Features
- Cross-chain royalty distribution
- Advanced royalty splitting formulas
- Automated dispute resolution
- Integration with DeFi protocols
- NFT marketplace integration

### Scaling Considerations
- Layer 2 solutions for high volume
- Sharding strategies
- Optimistic rollups
- State channels for micro-transactions
