#!/bin/bash

# Complete script to create Stripe products and prices for Juno credit packages
# Usage: ./create-stripe-products-complete.sh [test|live]

MODE=${1:-test}

echo "🚀 Creating Stripe products for Juno credit packages in $MODE mode..."
echo ""

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it from:"
    echo "   https://docs.stripe.com/stripe-cli"
    exit 1
fi

# Set the mode
if [ "$MODE" = "live" ]; then
    echo "⚠️  PRODUCTION MODE - Creating products in LIVE environment"
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read
else
    echo "🧪 TEST MODE - Creating products in test environment"
fi

echo "📦 Creating credit packages as Stripe products with prices..."
echo ""

# Function to create product and price
create_package() {
    local name=$1
    local credits=$2
    local price_cents=$3
    local description=$4
    local is_popular=$5
    local credits_per_dollar=$6
    
    echo "Creating $name package ($credits credits - \$$((price_cents/100)).$(printf "%02d" $((price_cents%100))))..."
    
    # Create product and capture the output
    product_output=$(stripe products create \
        --name "Juno Credits - $name" \
        --description "$description - $credits communication credits for voice calls, SMS, emails, and phone numbers" \
        --metadata package_name="$name" \
        --metadata credits="$credits" \
        --metadata credits_per_dollar="$credits_per_dollar" \
        --metadata is_popular="$is_popular" \
        --metadata juno_package="true" 2>&1)
    
    # Extract product ID from the output
    product_id=$(echo "$product_output" | grep -o 'prod_[a-zA-Z0-9]*' | head -1)
    
    if [ -n "$product_id" ]; then
        echo "✅ Product created: $product_id"
        
        # Create price for this product
        price_output=$(stripe prices create \
            --product "$product_id" \
            --unit-amount "$price_cents" \
            --currency usd \
            --metadata package_name="$name" \
            --metadata credits="$credits" 2>&1)
        
        price_id=$(echo "$price_output" | grep -o 'price_[a-zA-Z0-9]*' | head -1)
        
        if [ -n "$price_id" ]; then
            echo "✅ Price created: $price_id"
            echo "   💰 \$$((price_cents/100)).$(printf "%02d" $((price_cents%100))) for $credits credits"
        else
            echo "❌ Failed to create price for $name"
            echo "   Error: $price_output"
        fi
    else
        echo "❌ Failed to create product for $name"
        echo "   Error: $product_output"
    fi
    
    echo ""
}

# Create all packages
create_package "Starter" 500 999 "Perfect for testing and small businesses" "false" "50.05"
create_package "Business" 1000 1799 "Great for mixed usage scenarios" "false" "55.58"  
create_package "Professional" 2500 3999 "Great value for active businesses" "true" "62.52"
create_package "Scale" 5000 6999 "High volume usage with better rates" "false" "71.44"
create_package "Enterprise" 10000 11999 "Best rate for enterprise customers" "false" "83.34"
create_package "Enterprise+" 25000 24999 "Maximum value for large organizations" "false" "100.00"

echo "🎉 Stripe products and prices creation complete!"
echo ""
echo "📋 Summary of created packages:"
echo "• Starter: 500 credits - \$9.99 (50.1 credits/\$)"
echo "• Business: 1000 credits - \$17.99 (55.6 credits/\$)"  
echo "• Professional: 2500 credits - \$39.99 (62.5 credits/\$) ⭐ Popular"
echo "• Scale: 5000 credits - \$69.99 (71.4 credits/\$)"
echo "• Enterprise: 10000 credits - \$119.99 (83.3 credits/\$)"
echo "• Enterprise+: 25000 credits - \$249.99 (100.0 credits/\$)"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Stripe Dashboard to verify the products and prices"
echo "2. Update your environment variables if needed"
echo "3. Test a payment in your application"
echo ""
if [ "$MODE" = "live" ]; then
    echo "🔗 View your products: https://dashboard.stripe.com/products"
else
    echo "🔗 View your products: https://dashboard.stripe.com/test/products"
fi
echo ""
echo "💡 All products include metadata for easy identification:"
echo "   - package_name: The package name"
echo "   - credits: Number of credits"
echo "   - credits_per_dollar: Value comparison"
echo "   - is_popular: Highlight popular packages"
echo "   - juno_package: Identifies as Juno credit package" 