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
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
pub enum DataKey {
    Admin,
    NextStakeholderId,
    Stakeholders,
    Rights(Address),
}

#[contract]
pub struct StakeholderManagerContract;

#[contractimpl]
impl StakeholderManagerContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextStakeholderId, &1u64);
    }

    /// Register a new stakeholder
    pub fn register_stakeholder(
        env: Env,
        name: String,
        email: String,
        wallet_address: Address,
        role: StakeholderRole,
    ) -> String {
        let next_id: u64 = env.storage().instance()
            .get(&DataKey::NextStakeholderId)
            .unwrap_or(1u64);

        let stakeholder_id = String::from_str(&env, &format!("stakeholder_{}", next_id));

        let stakeholder = Stakeholder {
            id: stakeholder_id.clone(),
            name,
            email,
            wallet_address: wallet_address.clone(),
            role: role.clone(),
            created_at: env.ledger().timestamp(),
            updated_at: env.ledger().timestamp(),
        };

        let mut stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));
        stakeholders.set(wallet_address.clone(), stakeholder);
        env.storage().instance().set(&DataKey::Stakeholders, &stakeholders);

        let rights = Self::get_default_rights_for_role(role);
        env.storage().instance().set(&DataKey::Rights(wallet_address), &rights);

        env.storage().instance().set(&DataKey::NextStakeholderId, &(next_id + 1));

        stakeholder_id
    }

    /// Get stakeholder by wallet address
    pub fn get_stakeholder(env: Env, wallet_address: Address) -> Stakeholder {
        let stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));
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
        let mut stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));

        let mut stakeholder = stakeholders
            .get(wallet_address.clone())
            .unwrap_or_else(|| panic!("Stakeholder not found"));

        if let Some(new_name) = name {
            stakeholder.name = new_name;
        }
        if let Some(new_email) = email {
            stakeholder.email = new_email;
        }
        if let Some(new_role) = role {
            let rights = Self::get_default_rights_for_role(new_role.clone());
            env.storage().instance().set(&DataKey::Rights(wallet_address.clone()), &rights);
            stakeholder.role = new_role;
        }

        stakeholder.updated_at = env.ledger().timestamp();
        stakeholders.set(wallet_address, stakeholder);
        env.storage().instance().set(&DataKey::Stakeholders, &stakeholders);
    }

    /// Get stakeholder rights
    pub fn get_stakeholder_rights(env: Env, wallet_address: Address) -> StakeholderRights {
        env.storage().instance()
            .get(&DataKey::Rights(wallet_address))
            .unwrap_or_else(|| panic!("Stakeholder rights not found"))
    }

    /// Update stakeholder rights
    pub fn update_stakeholder_rights(env: Env, wallet_address: Address, rights: StakeholderRights) {
        env.storage().instance().set(&DataKey::Rights(wallet_address), &rights);
    }

    /// Get all stakeholders
    pub fn get_all_stakeholders(env: Env) -> Vec<Stakeholder> {
        let stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));

        let mut list = Vec::new(&env);
        for (_, stakeholder) in stakeholders.iter() {
            list.push_back(stakeholder);
        }
        list
    }

    /// Get stakeholders by role
    pub fn get_stakeholders_by_role(env: Env, role: StakeholderRole) -> Vec<Stakeholder> {
        let stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        for (_, stakeholder) in stakeholders.iter() {
            if stakeholder.role == role {
                result.push_back(stakeholder);
            }
        }
        result
    }

    /// Check if stakeholder has a specific permission
    pub fn has_permission(env: Env, wallet_address: Address, permission: String) -> bool {
        let rights = Self::get_stakeholder_rights(env, wallet_address);
        match permission.to_string().as_str() {
            "view_reports" => rights.can_view_reports,
            "manage_royalties" => rights.can_manage_royalties,
            "add_ip_assets" => rights.can_add_ip_assets,
            "remove_ip_assets" => rights.can_remove_ip_assets,
            _ => false,
        }
    }

    /// Remove a stakeholder
    pub fn remove_stakeholder(env: Env, wallet_address: Address) {
        let mut stakeholders: Map<Address, Stakeholder> = env.storage().instance()
            .get(&DataKey::Stakeholders)
            .unwrap_or_else(|| Map::new(&env));

        stakeholders.remove(wallet_address.clone());
        env.storage().instance().set(&DataKey::Stakeholders, &stakeholders);
        env.storage().instance().remove(&DataKey::Rights(wallet_address));
    }

    fn get_default_rights_for_role(role: StakeholderRole) -> StakeholderRights {
        match role {
            StakeholderRole::Creator => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: true,
                can_add_ip_assets: true,
                can_remove_ip_assets: true,
            },
            StakeholderRole::Publisher => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: true,
                can_add_ip_assets: false,
                can_remove_ip_assets: false,
            },
            StakeholderRole::Producer | StakeholderRole::Distributor => StakeholderRights {
                can_view_reports: true,
                can_manage_royalties: false,
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
}
