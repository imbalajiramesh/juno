#!/bin/bash

# Script to create Stripe products for credit packages
# Run this after authenticating with Stripe CLI: stripe login

echo "🚀 Creating Stripe products for Juno credit packages..."
echo ""

# Check if authenticated
if ! stripe config --list | grep -q "test_mode"; then
    echo "❌ Please authenticate with Stripe CLI first:"
    echo "   stripe login"
    exit 1
fi

echo "📦 Creating credit packages as Stripe products..."
echo ""

# Array of credit packages (name, credits, price_cents, description, is_popular)
declare -a packages=(
    "Starter|500|999|Perfect for testing and small businesses|false"
    "Business|1000|1799|Great for mixed usage scenarios|false"  
    "Professional|2500|3999|Great value for active businesses|true"
    "Scale|5000|6999|High volume usage with better rates|false"
    "Enterprise|10000|11999|Best rate for enterprise customers|false"
    "Enterprise+|25000|24999|Maximum value for large organizations|false"
)

# Create products and prices
for package in "${packages[@]}"; do
    IFS='|' read -r name credits price_cents description is_popular <<< "$package"
    
    echo "Creating product: $name ($credits credits for \$$(echo "scale=2; $price_cents/100" | bc))"
    
    # Create the product
    product_id=$(stripe products create \
        --name "Juno Credits - $name" \
        --description "$description - $credits communication credits for voice calls, SMS, emails, and phone numbers" \
        --metadata[package_name]="$name" \
        --metadata[credits]="$credits" \
        --metadata[credits_per_dollar]="$(echo "scale=2; $credits*100/$price_cents" | bc)" \
        --metadata[is_popular]="$is_popular" \
        --metadata[juno_package]="true" \
        --format json | jq -r '.id')
    
    if [ "$product_id" != "null" ] && [ -n "$product_id" ]; then
        echo "✅ Product created: $product_id"
        
        # Create the price
        price_id=$(stripe prices create \
            --product "$product_id" \
            --unit-amount "$price_cents" \
            --currency usd \
            --metadata[package_name]="$name" \
            --metadata[credits]="$credits" \
            --format json | jq -r '.id')
        
        if [ "$price_id" != "null" ] && [ -n "$price_id" ]; then
            echo "✅ Price created: $price_id"
            echo "   💰 Price: \$$(echo "scale=2; $price_cents/100" | bc) for $credits credits"
        else
            echo "❌ Failed to create price for $name"
        fi
    else
        echo "❌ Failed to create product for $name"
    fi
    
    echo ""
done

echo "🎉 Stripe products creation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Stripe Dashboard to verify the products"
echo "2. Update your environment variables if needed"
echo "3. Test a payment in your application"
echo ""
echo "🔗 View your products: https://dashboard.stripe.com/products" 