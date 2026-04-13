use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map, U256};
use crate::ip_token::RoyaltyShare;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
}

#[contract]
pub struct RoyaltyDistributorContract;

#[contractimpl]
impl RoyaltyDistributorContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&String::from_slice(&"admin".into_bytes())) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&String::from_slice(&"admin".into_bytes()), &admin);
        env.storage().instance().set(&String::from_slice(&"next_payment_id".into_bytes()), &1u64);
    }

    /// Record usage for an IP asset
    pub fn record_usage(
        env: Env,
        ip_token_id: String,
        platform: String,
        usage_type: String,
        amount: U256,
        currency: String,
        metadata: Map<String, String>,
    ) -> String {
        let next_id: u64 = env.storage().instance().get(&String::from_slice(&"next_usage_id".into_bytes())).unwrap_or(1u64);
        let usage_id = String::from_slice(&("usage_".into_bytes() + next_id.to_string().into_bytes()));
        
        let usage_record = UsageRecord {
            id: usage_id.clone(),
            ip_token_id,
            platform,
            usage_type,
            amount,
            currency,
            timestamp: env.ledger().timestamp(),
            metadata,
        };

        // Store the usage record
        let usage_key = String::from_slice(&"usage_records".into_bytes());
        let mut usage_records: Map<String, UsageRecord> = env.storage().instance().get(&usage_key).unwrap_or(Map::new(&env));
        usage_records.set(usage_id.clone(), usage_record);
        env.storage().instance().set(&usage_key, &usage_records);

        // Increment next usage ID
        env.storage().instance().set(&String::from_slice(&"next_usage_id".into_bytes()), &(next_id + 1));

        usage_id
    }

    /// Calculate and distribute royalties for a usage record
    pub fn distribute_royalties(
        env: Env,
        usage_record_id: String,
        ip_token_contract: Address,
    ) -> Vec<String> {
        // Get usage record
        let usage_key = String::from_slice(&"usage_records".into_bytes());
        let usage_records: Map<String, UsageRecord> = env.storage().instance().get(&usage_key).unwrap_or(Map::new(&env));
        let usage_record = usage_records.get(usage_record_id.clone()).unwrap_or_else(|| panic!("Usage record not found"));

        // Get royalty shares from IP token contract
        let royalties_key = String::from_slice(&("royalties_".into_bytes() + usage_record.ip_token_id.clone().into_bytes()));
        let client = ip_token_contract.require_client();
        let royalty_shares: Map<Address, u32> = client.invoke_contract(
            &String::from_slice(&"get_royalty_shares".into_bytes()),
            (usage_record.ip_token_id.clone(),)
        );

        let mut payment_ids = Vec::new(&env);
        
        // Calculate and create royalty payments for each stakeholder
        for (stakeholder, percentage) in royalty_shares.iter() {
            let royalty_amount = usage_record.amount * U256::from(percentage) / U256::from(10000u32);
            
            let next_payment_id: u64 = env.storage().instance().get(&String::from_slice(&"next_payment_id".into_bytes())).unwrap_or(1u64);
            let payment_id = String::from_slice(&("payment_".into_bytes() + next_payment_id.to_string().into_bytes()));
            
            let payment = RoyaltyPayment {
                id: payment_id.clone(),
                usage_record_id: usage_record_id.clone(),
                stakeholder: stakeholder.clone(),
                amount: royalty_amount,
                currency: usage_record.currency.clone(),
                transaction_hash: String::from_str(""), // Will be set when payment is processed
                status: PaymentStatus::Pending,
                created_at: env.ledger().timestamp(),
                processed_at: None,
            };

            // Store the payment
            let payments_key = String::from_slice(&"royalty_payments".into_bytes());
            let mut payments: Map<String, RoyaltyPayment> = env.storage().instance().get(&payments_key).unwrap_or(Map::new(&env));
            payments.set(payment_id.clone(), payment);
            env.storage().instance().set(&payments_key, &payments);

            payment_ids.push_back(payment_id);

            // Increment next payment ID
            env.storage().instance().set(&String::from_slice(&"next_payment_id".into_bytes()), &(next_payment_id + 1));
        }

        payment_ids
    }

    /// Process a royalty payment (mark as completed)
    pub fn process_payment(
        env: Env,
        payment_id: String,
        transaction_hash: String,
    ) {
        let payments_key = String::from_slice(&"royalty_payments".into_bytes());
        let mut payments: Map<String, RoyaltyPayment> = env.storage().instance().get(&payments_key).unwrap_or(Map::new(&env));
        
        let mut payment = payments.get(payment_id.clone()).unwrap_or_else(|| panic!("Payment not found"));
        payment.status = PaymentStatus::Completed;
        payment.transaction_hash = transaction_hash;
        payment.processed_at = Some(env.ledger().timestamp());
        
        payments.set(payment_id, payment);
        env.storage().instance().set(&payments_key, &payments);
    }

    /// Get payment details
    pub fn get_payment(env: Env, payment_id: String) -> RoyaltyPayment {
        let payments_key = String::from_slice(&"royalty_payments".into_bytes());
        let payments: Map<String, RoyaltyPayment> = env.storage().instance().get(&payments_key).unwrap_or(Map::new(&env));
        
        payments.get(payment_id).unwrap_or_else(|| panic!("Payment not found"))
    }

    /// Get all payments for a stakeholder
    pub fn get_stakeholder_payments(env: Env, stakeholder: Address) -> Vec<RoyaltyPayment> {
        let payments_key = String::from_slice(&"royalty_payments".into_bytes());
        let payments: Map<String, RoyaltyPayment> = env.storage().instance().get(&payments_key).unwrap_or(Map::new(&env));
        
        let mut stakeholder_payments = Vec::new(&env);
        for (_, payment) in payments.iter() {
            if payment.stakeholder == stakeholder {
                stakeholder_payments.push_back(payment);
            }
        }
        
        stakeholder_payments
    }

    /// Get all usage records for an IP asset
    pub fn get_ip_usage_records(env: Env, ip_token_id: String) -> Vec<UsageRecord> {
        let usage_key = String::from_slice(&"usage_records".into_bytes());
        let usage_records: Map<String, UsageRecord> = env.storage().instance().get(&usage_key).unwrap_or(Map::new(&env));
        
        let mut ip_usage_records = Vec::new(&env);
        for (_, record) in usage_records.iter() {
            if record.ip_token_id == ip_token_id {
                ip_usage_records.push_back(record);
            }
        }
        
        ip_usage_records
    }

    /// Get total royalties earned by a stakeholder
    pub fn get_stakeholder_earnings(env: Env, stakeholder: Address, currency: String) -> U256 {
        let payments_key = String::from_slice(&"royalty_payments".into_bytes());
        let payments: Map<String, RoyaltyPayment> = env.storage().instance().get(&payments_key).unwrap_or(Map::new(&env));
        
        let mut total_earnings = U256::from(0u64);
        for (_, payment) in payments.iter() {
            if payment.stakeholder == stakeholder 
                && payment.currency == currency 
                && payment.status == PaymentStatus::Completed {
                total_earnings += payment.amount;
            }
        }
        
        total_earnings
    }
}
