use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stakeholder {
    pub id: String,
    pub name: String,
    pub email: String,
    pub wallet_address: Address,
    pub role: StakeholderRole,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub enum StakeholderRole {
    Creator,
    Producer,
    Distributor,
    Publisher,
    Other,
}

#[contracttype]
pub struct StakeholderRights {
    pub can_view_reports: bool,
    pub can_manage_royalties: bool,
    pub can_add_ip_assets: bool,
    pub can_remove_ip_assets: bool,
}

#[contract]
pub struct StakeholderManagerContract;

#[contractimpl]
impl StakeholderManagerContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&String::from_slice(&"admin".into_bytes())) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&String::from_slice(&"admin".into_bytes()), &admin);
        env.storage().instance().set(&String::from_slice(&"next_stakeholder_id".into_bytes()), &1u64);
    }

    /// Register a new stakeholder
    pub fn register_stakeholder(
        env: Env,
        name: String,
        email: String,
        wallet_address: Address,
        role: StakeholderRole,
    ) -> String {
        let next_id: u64 = env.storage().instance().get(&String::from_slice(&"next_stakeholder_id".into_bytes())).unwrap_or(1u64);
        let stakeholder_id = String::from_slice(&("stakeholder_".into_bytes() + next_id.to_string().into_bytes()));
        
        let stakeholder = Stakeholder {
            id: stakeholder_id.clone(),
            name,
            email,
            wallet_address,
            role,
            created_at: env.ledger().timestamp(),
            updated_at: env.ledger().timestamp(),
        };

        // Store the stakeholder
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let mut stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        stakeholders.set(wallet_address.clone(), stakeholder);
        env.storage().instance().set(&stakeholders_key, &stakeholders);

        // Set default rights based on role
        let rights = Self::get_default_rights_for_role(role);
        let rights_key = String::from_slice(&("rights_".into_bytes() + wallet_address.into_bytes()));
        env.storage().instance().set(&rights_key, &rights);

        // Increment next stakeholder ID
        env.storage().instance().set(&String::from_slice(&"next_stakeholder_id".into_bytes()), &(next_id + 1));

        stakeholder_id
    }

    /// Get stakeholder by wallet address
    pub fn get_stakeholder(env: Env, wallet_address: Address) -> Stakeholder {
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        
        stakeholders.get(wallet_address).unwrap_or_else(|| panic!("Stakeholder not found"))
    }

    /// Update stakeholder information
    pub fn update_stakeholder(
        env: Env,
        wallet_address: Address,
        name: Option<String>,
        email: Option<String>,
        role: Option<StakeholderRole>,
    ) {
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let mut stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        
        let mut stakeholder = stakeholders.get(wallet_address.clone()).unwrap_or_else(|| panic!("Stakeholder not found"));
        
        if let Some(new_name) = name {
            stakeholder.name = new_name;
        }
        if let Some(new_email) = email {
            stakeholder.email = new_email;
        }
        if let Some(new_role) = role {
            stakeholder.role = new_role;
            // Update default rights for new role
            let rights = Self::get_default_rights_for_role(new_role);
            let rights_key = String::from_slice(&("rights_".into_bytes() + wallet_address.into_bytes()));
            env.storage().instance().set(&rights_key, &rights);
        }
        
        stakeholder.updated_at = env.ledger().timestamp();
        stakeholders.set(wallet_address, stakeholder);
        env.storage().instance().set(&stakeholders_key, &stakeholders);
    }

    /// Get stakeholder rights
    pub fn get_stakeholder_rights(env: Env, wallet_address: Address) -> StakeholderRights {
        let rights_key = String::from_slice(&("rights_".into_bytes() + wallet_address.into_bytes()));
        env.storage().instance().get(&rights_key).unwrap_or_else(|| panic!("Stakeholder rights not found"))
    }

    /// Update stakeholder rights
    pub fn update_stakeholder_rights(
        env: Env,
        wallet_address: Address,
        rights: StakeholderRights,
    ) {
        let rights_key = String::from_slice(&("rights_".into_bytes() + wallet_address.into_bytes()));
        env.storage().instance().set(&rights_key, &rights);
    }

    /// Get all stakeholders
    pub fn get_all_stakeholders(env: Env) -> Vec<Stakeholder> {
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        
        let mut stakeholder_list = Vec::new(&env);
        for (_, stakeholder) in stakeholders.iter() {
            stakeholder_list.push_back(stakeholder);
        }
        
        stakeholder_list
    }

    /// Get stakeholders by role
    pub fn get_stakeholders_by_role(env: Env, role: StakeholderRole) -> Vec<Stakeholder> {
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        
        let mut role_stakeholders = Vec::new(&env);
        for (_, stakeholder) in stakeholders.iter() {
            if stakeholder.role == role {
                role_stakeholders.push_back(stakeholder);
            }
        }
        
        role_stakeholders
    }

    /// Check if stakeholder has specific permission
    pub fn has_permission(
        env: Env,
        wallet_address: Address,
        permission: String,
    ) -> bool {
        let rights = Self::get_stakeholder_rights(env, wallet_address);
        
        match permission.as_str() {
            "view_reports" => rights.can_view_reports,
            "manage_royalties" => rights.can_manage_royalties,
            "add_ip_assets" => rights.can_add_ip_assets,
            "remove_ip_assets" => rights.can_remove_ip_assets,
            _ => false,
        }
    }

    /// Get default rights for a role
    fn get_default_rights_for_role(role: StakeholderRole) -> StakeholderRights {
        match role {
            StakeholderRole::Creator => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: true,
                can_add_ip_assets: true,
                can_remove_ip_assets: true,
            },
            StakeholderRole::Producer => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: false,
                can_add_ip_assets: false,
                can_remove_ip_assets: false,
            },
            StakeholderRole::Distributor => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: false,
                can_add_ip_assets: false,
                can_remove_ip_assets: false,
            },
            StakeholderRole::Publisher => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: true,
                can_add_ip_assets: false,
                can_remove_ip_assets: false,
            },
            StakeholderRole::Other => StakeholderRights {
                can_view_reports: false,
                can_manage_royalties: false,
                can_add_ip_assets: false,
                can_remove_ip_assets: false,
            },
        }
    }

    /// Remove a stakeholder
    pub fn remove_stakeholder(env: Env, wallet_address: Address) {
        let stakeholders_key = String::from_slice(&"stakeholders".into_bytes());
        let mut stakeholders: Map<String, Stakeholder> = env.storage().instance().get(&stakeholders_key).unwrap_or(Map::new(&env));
        
        stakeholders.remove(wallet_address.clone());
        env.storage().instance().set(&stakeholders_key, &stakeholders);

        // Remove rights
        let rights_key = String::from_slice(&("rights_".into_bytes() + wallet_address.into_bytes()));
        env.storage().instance().remove(&rights_key);
    }
}
