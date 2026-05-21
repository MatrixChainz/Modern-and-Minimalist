use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map};

#[contracttype]
pub enum TokenType {
    Music,
    Video,
    Art,
    Text,
    Software,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IPAsset {
    pub id: String,
    pub title: String,
    pub description: String,
    pub creator: Address,
    pub token_type: TokenType,
    pub metadata: Map<String, String>,
    pub created_at: u64,
}

#[contracttype]
pub struct RoyaltyShare {
    pub stakeholder: Address,
    pub percentage: u32, // Percentage in basis points (10000 = 100%)
}

#[contracttype]
pub enum DataKey {
    Admin,
    NextTokenId,
    NextUsageId,
    IpAssets,
    Royalties(String),
}

#[contract]
pub struct IPTokenContract;

#[contractimpl]
impl IPTokenContract {
    /// Initialize the contract with admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextTokenId, &1u64);
    }

    /// Create a new IP token
    pub fn create_ip_token(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        token_type: TokenType,
        metadata: Map<String, String>,
        royalty_shares: Vec<RoyaltyShare>,
    ) -> String {
        // Verify total royalty shares don't exceed 100%
        let mut total_percentage = 0u32;
        for share in royalty_shares.iter() {
            total_percentage += share.percentage;
        }
        if total_percentage > 10000u32 {
            panic!("Total royalty shares cannot exceed 100%");
        }

        let next_id: u64 = env.storage().instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1u64);

        // Build token_id string from the numeric ID
        let token_id = String::from_str(&env, &next_id.to_string());

        let ip_asset = IPAsset {
            id: token_id.clone(),
            title,
            description,
            creator,
            token_type,
            metadata,
            created_at: env.ledger().timestamp(),
        };

        // Store the IP asset
        let mut assets: Map<String, IPAsset> = env.storage().instance()
            .get(&DataKey::IpAssets)
            .unwrap_or_else(|| Map::new(&env));
        assets.set(token_id.clone(), ip_asset);
        env.storage().instance().set(&DataKey::IpAssets, &assets);

        // Store royalty shares
        let mut royalties: Map<Address, u32> = Map::new(&env);
        for share in royalty_shares.iter() {
            royalties.set(share.stakeholder.clone(), share.percentage);
        }
        env.storage().instance().set(&DataKey::Royalties(token_id.clone()), &royalties);

        // Increment next token ID
        env.storage().instance().set(&DataKey::NextTokenId, &(next_id + 1));

        token_id
    }

    /// Get IP asset details
    pub fn get_ip_asset(env: Env, token_id: String) -> IPAsset {
        let assets: Map<String, IPAsset> = env.storage().instance()
            .get(&DataKey::IpAssets)
            .unwrap_or_else(|| Map::new(&env));
        assets.get(token_id).unwrap_or_else(|| panic!("IP asset not found"))
    }

    /// Get royalty shares for an IP asset
    pub fn get_royalty_shares(env: Env, token_id: String) -> Map<Address, u32> {
        env.storage().instance()
            .get(&DataKey::Royalties(token_id))
            .unwrap_or_else(|| Map::new(&env))
    }

    /// Update royalty shares (only creator can do this)
    pub fn update_royalty_shares(
        env: Env,
        token_id: String,
        creator: Address,
        new_shares: Vec<RoyaltyShare>,
    ) {
        let ip_asset = Self::get_ip_asset(env.clone(), token_id.clone());
        if ip_asset.creator != creator {
            panic!("Only creator can update royalty shares");
        }

        let mut total_percentage = 0u32;
        for share in new_shares.iter() {
            total_percentage += share.percentage;
        }
        if total_percentage > 10000u32 {
            panic!("Total royalty shares cannot exceed 100%");
        }

        let mut royalties: Map<Address, u32> = Map::new(&env);
        for share in new_shares.iter() {
            royalties.set(share.stakeholder.clone(), share.percentage);
        }
        env.storage().instance().set(&DataKey::Royalties(token_id), &royalties);
    }

    /// Get all IP assets for a creator
    pub fn get_creator_assets(env: Env, creator: Address) -> Vec<IPAsset> {
        let assets: Map<String, IPAsset> = env.storage().instance()
            .get(&DataKey::IpAssets)
            .unwrap_or_else(|| Map::new(&env));

        let mut creator_assets = Vec::new(&env);
        for (_, asset) in assets.iter() {
            if asset.creator == creator {
                creator_assets.push_back(asset);
            }
        }
        creator_assets
    }
}
