#!/bin/bash
set -e

echo "Building contracts..."
cargo build --target wasm32-unknown-unknown --release

echo "Deploying IP Token Contract..."
IP_TOKEN_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/ip_token.wasm --source default --network testnet)
echo "IP Token Contract Address: $IP_TOKEN_ID"

echo "Deploying Royalty Distributor Contract..."
ROYALTY_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/royalty_distributor.wasm --source default --network testnet)
echo "Royalty Distributor Contract Address: $ROYALTY_ID"

echo "Deploying Stakeholder Manager Contract..."
STAKEHOLDER_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/stakeholder_manager.wasm --source default --network testnet)
echo "Stakeholder Manager Contract Address: $STAKEHOLDER_ID"

echo "Deployment complete."
