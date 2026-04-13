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

#[contract]
pub struct IPTokenContract;

#[contractimpl]
impl IPTokenContract {
    /// Initialize the contract with admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&String::from_slice(&"admin".into_bytes())) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&String::from_slice(&"admin".into_bytes()), &admin);
        env.storage().instance().set(&String::from_slice(&"next_token_id".into_bytes()), &1u64);
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

        let next_id: u64 = env.storage().instance().get(&String::from_slice(&"next_token_id".into_bytes())).unwrap();
        let token_id = String::from_slice(&next_id.to_string().into_bytes());
        
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
        let assets_key = String::from_slice(&"ip_assets".into_bytes());
        let mut assets: Map<String, IPAsset> = env.storage().instance().get(&assets_key).unwrap_or(Map::new(&env));
        assets.set(token_id.clone(), ip_asset);
        env.storage().instance().set(&assets_key, &assets);

        // Store royalty shares
        let royalties_key = String::from_slice(&("royalties_".into_bytes() + token_id.clone().into_bytes()));
        let mut royalties: Map<Address, u32> = Map::new(&env);
        for share in royalty_shares.iter() {
            royalties.set(share.stakeholder.clone(), share.percentage);
        }
        env.storage().instance().set(&royalties_key, &royalties);

        // Increment next token ID
        env.storage().instance().set(&String::from_slice(&"next_token_id".into_bytes()), &(next_id + 1));

        token_id
    }

    /// Get IP asset details
    pub fn get_ip_asset(env: Env, token_id: String) -> IPAsset {
        let assets_key = String::from_slice(&"ip_assets".into_bytes());
        let assets: Map<String, IPAsset> = env.storage().instance().get(&assets_key).unwrap_or(Map::new(&env));
        
        assets.get(token_id).unwrap_or_else(|| panic!("IP asset not found"))
    }

    /// Get royalty shares for an IP asset
    pub fn get_royalty_shares(env: Env, token_id: String) -> Map<Address, u32> {
        let royalties_key = String::from_slice(&("royalties_".into_bytes() + token_id.into_bytes()));
        env.storage().instance().get(&royalties_key).unwrap_or_else(|| panic!("Royalty shares not found"))
    }

    /// Update royalty shares (only creator can do this)
    pub fn update_royalty_shares(
        env: Env,
        token_id: String,
        creator: Address,
        new_shares: Vec<RoyaltyShare>,
    ) {
        // Verify creator
        let ip_asset = Self::get_ip_asset(env.clone(), token_id.clone());
        if ip_asset.creator != creator {
            panic!("Only creator can update royalty shares");
        }

        // Verify total doesn't exceed 100%
        let mut total_percentage = 0u32;
        for share in new_shares.iter() {
            total_percentage += share.percentage;
        }
        if total_percentage > 10000u32 {
            panic!("Total royalty shares cannot exceed 100%");
        }

        // Update royalty shares
        let royalties_key = String::from_slice(&("royalties_".into_bytes() + token_id.into_bytes()));
        let mut royalties: Map<Address, u32> = Map::new(&env);
        for share in new_shares.iter() {
            royalties.set(share.stakeholder.clone(), share.percentage);
        }
        env.storage().instance().set(&royalties_key, &royalties);
    }

    /// Get all IP assets for a creator
    pub fn get_creator_assets(env: Env, creator: Address) -> Vec<IPAsset> {
        let assets_key = String::from_slice(&"ip_assets".into_bytes());
        let assets: Map<String, IPAsset> = env.storage().instance().get(&assets_key).unwrap_or(Map::new(&env));
        
        let mut creator_assets = Vec::new(&env);
        for (_, asset) in assets.iter() {
            if asset.creator == creator {
                creator_assets.push_back(asset);
            }
        }
        
        creator_assets
    }
}
