use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map, U256, Symbol, vec as soroban_vec};

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
    pub processed_at: u64, // 0 means not yet processed
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
}

#[contracttype]
pub enum DataKey {
    Admin,
    NextPaymentId,
    NextUsageId,
    UsageRecords,
    RoyaltyPayments,
}

#[contract]
pub struct RoyaltyDistributorContract;

#[contractimpl]
impl RoyaltyDistributorContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextPaymentId, &1u64);
        env.storage().instance().set(&DataKey::NextUsageId, &1u64);
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
        let next_id: u64 = env.storage().instance()
            .get(&DataKey::NextUsageId)
            .unwrap_or(1u64);

        let usage_id = String::from_str(&env, &format!("usage_{}", next_id));

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

        let mut usage_records: Map<String, UsageRecord> = env.storage().instance()
            .get(&DataKey::UsageRecords)
            .unwrap_or_else(|| Map::new(&env));
        usage_records.set(usage_id.clone(), usage_record);
        env.storage().instance().set(&DataKey::UsageRecords, &usage_records);
        env.storage().instance().set(&DataKey::NextUsageId, &(next_id + 1));

        usage_id
    }

    /// Calculate and distribute royalties for a usage record.
    ///
    /// `ip_token_contract` is the deployed address of the IPTokenContract.
    /// The royalty shares are fetched via a cross-contract call using
    /// `env.invoke_contract`, which is the correct Soroban SDK pattern.
    pub fn distribute_royalties(
        env: Env,
        usage_record_id: String,
        ip_token_contract: Address,
    ) -> Vec<String> {
        let usage_records: Map<String, UsageRecord> = env.storage().instance()
            .get(&DataKey::UsageRecords)
            .unwrap_or_else(|| Map::new(&env));
        let usage_record = usage_records
            .get(usage_record_id.clone())
            .unwrap_or_else(|| panic!("Usage record not found"));

        // Cross-contract call: get_royalty_shares(token_id) -> Map<Address, u32>
        let royalty_shares: Map<Address, u32> = env.invoke_contract(
            &ip_token_contract,
            &Symbol::new(&env, "get_royalty_shares"),
            soroban_vec![&env, usage_record.ip_token_id.clone()],
        );

        let mut payment_ids = Vec::new(&env);

        for (stakeholder, percentage) in royalty_shares.iter() {
            // Safe U256 arithmetic: multiply then divide by basis points (10000)
            let basis = U256::from_u32(&env, 10000u32);
            let pct = U256::from_u32(&env, percentage);
            let royalty_amount = usage_record.amount.mul(&pct).div(&basis);

            let next_payment_id: u64 = env.storage().instance()
                .get(&DataKey::NextPaymentId)
                .unwrap_or(1u64);
            let payment_id = String::from_str(&env, &format!("payment_{}", next_payment_id));

            let payment = RoyaltyPayment {
                id: payment_id.clone(),
                usage_record_id: usage_record_id.clone(),
                stakeholder: stakeholder.clone(),
                amount: royalty_amount,
                currency: usage_record.currency.clone(),
                transaction_hash: String::from_str(&env, ""),
                status: PaymentStatus::Pending,
                created_at: env.ledger().timestamp(),
                processed_at: 0,
            };

            let mut payments: Map<String, RoyaltyPayment> = env.storage().instance()
                .get(&DataKey::RoyaltyPayments)
                .unwrap_or_else(|| Map::new(&env));
            payments.set(payment_id.clone(), payment);
            env.storage().instance().set(&DataKey::RoyaltyPayments, &payments);
            env.storage().instance().set(&DataKey::NextPaymentId, &(next_payment_id + 1));

            payment_ids.push_back(payment_id);
        }

        payment_ids
    }

    /// Process a royalty payment (mark as completed)
    pub fn process_payment(env: Env, payment_id: String, transaction_hash: String) {
        let mut payments: Map<String, RoyaltyPayment> = env.storage().instance()
            .get(&DataKey::RoyaltyPayments)
            .unwrap_or_else(|| Map::new(&env));

        let mut payment = payments
            .get(payment_id.clone())
            .unwrap_or_else(|| panic!("Payment not found"));
        payment.status = PaymentStatus::Completed;
        payment.transaction_hash = transaction_hash;
        payment.processed_at = env.ledger().timestamp();

        payments.set(payment_id, payment);
        env.storage().instance().set(&DataKey::RoyaltyPayments, &payments);
    }

    /// Get payment details
    pub fn get_payment(env: Env, payment_id: String) -> RoyaltyPayment {
        let payments: Map<String, RoyaltyPayment> = env.storage().instance()
            .get(&DataKey::RoyaltyPayments)
            .unwrap_or_else(|| Map::new(&env));
        payments.get(payment_id).unwrap_or_else(|| panic!("Payment not found"))
    }

    /// Get all payments for a stakeholder
    pub fn get_stakeholder_payments(env: Env, stakeholder: Address) -> Vec<RoyaltyPayment> {
        let payments: Map<String, RoyaltyPayment> = env.storage().instance()
            .get(&DataKey::RoyaltyPayments)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        for (_, payment) in payments.iter() {
            if payment.stakeholder == stakeholder {
                result.push_back(payment);
            }
        }
        result
    }

    /// Get all usage records for an IP asset
    pub fn get_ip_usage_records(env: Env, ip_token_id: String) -> Vec<UsageRecord> {
        let usage_records: Map<String, UsageRecord> = env.storage().instance()
            .get(&DataKey::UsageRecords)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        for (_, record) in usage_records.iter() {
            if record.ip_token_id == ip_token_id {
                result.push_back(record);
            }
        }
        result
    }

    /// Get total royalties earned by a stakeholder for a given currency
    pub fn get_stakeholder_earnings(env: Env, stakeholder: Address, currency: String) -> U256 {
        let payments: Map<String, RoyaltyPayment> = env.storage().instance()
            .get(&DataKey::RoyaltyPayments)
            .unwrap_or_else(|| Map::new(&env));

        let mut total = U256::from_u32(&env, 0u32);
        for (_, payment) in payments.iter() {
            if payment.stakeholder == stakeholder
                && payment.currency == currency
                && payment.status == PaymentStatus::Completed
            {
                total = total.add(&payment.amount);
            }
        }
        total
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, testutils::Address as _, U256};

    #[test]
    fn test_record_usage() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RoyaltyDistributorContract);
        let client = RoyaltyDistributorContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let ip_token_id = String::from_str(&env, "ip1");
        let platform = String::from_str(&env, "spotify");
        let usage_type = String::from_str(&env, "STREAM");
        let amount = U256::from_u32(&env, 100);
        let currency = String::from_str(&env, "USD");
        let metadata = Map::new(&env);

        let usage_id = client.record_usage(&ip_token_id, &platform, &usage_type, &amount, &currency, &metadata);
        
        let records = client.get_ip_usage_records(&ip_token_id);
        assert_eq!(records.len(), 1);
        assert_eq!(records.get(0).unwrap().id, usage_id);
    }
}
