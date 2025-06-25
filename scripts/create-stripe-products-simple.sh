#!/bin/bash

# Simple script to create Stripe products for credit packages
# Run this after authenticating with Stripe CLI: stripe login

echo "🚀 Creating Stripe products for Juno credit packages..."
echo ""

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it from:"
    echo "   https://docs.stripe.com/stripe-cli"
    exit 1
fi

echo "📦 Creating credit packages as Stripe products..."
echo ""

# Create Starter Package
echo "Creating Starter Package (500 credits - $9.99)..."
stripe products create \
    --name "Juno Credits - Starter" \
    --description "Perfect for testing and small businesses - 500 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Starter" \
    --metadata credits="500" \
    --metadata credits_per_dollar="50.05" \
    --metadata is_popular="false" \
    --metadata juno_package="true"

echo "Creating price for Starter package..."
stripe prices create \
    --product $(stripe products list --limit 1 | grep -o 'prod_[a-zA-Z0-9]*' | head -1) \
    --unit-amount 999 \
    --currency usd \
    --metadata package_name="Starter" \
    --metadata credits="500"

echo ""

# Create Business Package  
echo "Creating Business Package (1000 credits - $17.99)..."
stripe products create \
    --name "Juno Credits - Business" \
    --description "Great for mixed usage scenarios - 1000 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Business" \
    --metadata credits="1000" \
    --metadata credits_per_dollar="55.58" \
    --metadata is_popular="false" \
    --metadata juno_package="true"

echo ""

# Create Professional Package (Popular)
echo "Creating Professional Package (2500 credits - $39.99) - POPULAR..."
stripe products create \
    --name "Juno Credits - Professional" \
    --description "Great value for active businesses - 2500 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Professional" \
    --metadata credits="2500" \
    --metadata credits_per_dollar="62.52" \
    --metadata is_popular="true" \
    --metadata juno_package="true"

echo ""

# Create Scale Package
echo "Creating Scale Package (5000 credits - $69.99)..."
stripe products create \
    --name "Juno Credits - Scale" \
    --description "High volume usage with better rates - 5000 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Scale" \
    --metadata credits="5000" \
    --metadata credits_per_dollar="71.44" \
    --metadata is_popular="false" \
    --metadata juno_package="true"

echo ""

# Create Enterprise Package
echo "Creating Enterprise Package (10000 credits - $119.99)..."
stripe products create \
    --name "Juno Credits - Enterprise" \
    --description "Best rate for enterprise customers - 10000 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Enterprise" \
    --metadata credits="10000" \
    --metadata credits_per_dollar="83.34" \
    --metadata is_popular="false" \
    --metadata juno_package="true"

echo ""

# Create Enterprise+ Package
echo "Creating Enterprise+ Package (25000 credits - $249.99)..."
stripe products create \
    --name "Juno Credits - Enterprise+" \
    --description "Maximum value for large organizations - 25000 communication credits for voice calls, SMS, emails, and phone numbers" \
    --metadata package_name="Enterprise+" \
    --metadata credits="25000" \
    --metadata credits_per_dollar="100.00" \
    --metadata is_popular="false" \
    --metadata juno_package="true"

echo ""
echo "🎉 Stripe products creation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Stripe Dashboard to verify the products"
echo "2. Create prices for each product manually if needed"
echo "3. Update your environment variables if needed"
echo "4. Test a payment in your application"
echo ""
echo "🔗 View your products: https://dashboard.stripe.com/products"
echo ""
echo "💡 Note: You may need to create prices manually for each product"
echo "   or use the Stripe Dashboard to set up recurring/one-time prices." 