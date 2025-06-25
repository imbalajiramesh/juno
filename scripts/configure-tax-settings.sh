#!/bin/bash

# 💰 Juno Tax Configuration Script
# This script helps you configure tax settings without expensive registration services

echo "🧾 Juno Tax Configuration"
echo "========================="
echo ""

# Check current environment
if [ -f ".env" ]; then
    echo "✅ Found .env file"
else
    echo "❌ No .env file found. Please create one first."
    exit 1
fi

echo ""
echo "Current tax configuration:"
if grep -q "TAX_ENABLED_COUNTRIES" .env; then
    echo "Tax enabled countries: $(grep TAX_ENABLED_COUNTRIES .env | cut -d'=' -f2)"
else
    echo "Tax enabled countries: Not configured"
fi

echo ""
echo "Choose your tax implementation strategy:"
echo "1. 🚀 Start simple - No tax collection (recommended for new businesses)"
echo "2. 🇺🇸 US only - Collect tax in US states where you're registered"
echo "3. 🇬🇧 UK only - Collect VAT in UK (if registered)"
echo "4. 🌍 US + UK - Collect tax in both markets"
echo "5. 🔧 Custom - Specify your own countries"
echo "6. ❌ Disable tax collection"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "Setting up: No tax collection"
        # Remove or comment out tax settings
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "NEXT_PUBLIC_TAX_ENABLED=false" >> .env
        echo "✅ Tax collection disabled. You can enable it later when you register for taxes."
        ;;
    2)
        echo "Setting up: US tax collection only"
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "TAX_ENABLED_COUNTRIES=US" >> .env
        echo "NEXT_PUBLIC_TAX_ENABLED=true" >> .env
        echo "✅ US tax collection enabled."
        echo "⚠️  Make sure you're registered for sales tax in applicable US states!"
        ;;
    3)
        echo "Setting up: UK tax collection only"
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "TAX_ENABLED_COUNTRIES=GB" >> .env
        echo "NEXT_PUBLIC_TAX_ENABLED=true" >> .env
        echo "✅ UK VAT collection enabled."
        echo "⚠️  Make sure you're registered for VAT with HMRC!"
        ;;
    4)
        echo "Setting up: US + UK tax collection"
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "TAX_ENABLED_COUNTRIES=US,GB" >> .env
        echo "NEXT_PUBLIC_TAX_ENABLED=true" >> .env
        echo "✅ US and UK tax collection enabled."
        echo "⚠️  Make sure you're registered for taxes in both countries!"
        ;;
    5)
        echo "Setting up: Custom countries"
        echo "Enter country codes separated by commas (e.g., US,GB,DE,FR):"
        echo "Common codes: US (United States), GB (United Kingdom), DE (Germany), FR (France), CA (Canada), AU (Australia)"
        read -p "Countries: " countries
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "TAX_ENABLED_COUNTRIES=$countries" >> .env
        echo "NEXT_PUBLIC_TAX_ENABLED=true" >> .env
        echo "✅ Custom tax collection enabled for: $countries"
        echo "⚠️  Make sure you're registered for taxes in all specified countries!"
        ;;
    6)
        echo "Disabling tax collection"
        sed -i.bak '/TAX_ENABLED_COUNTRIES/d' .env
        sed -i.bak '/NEXT_PUBLIC_TAX_ENABLED/d' .env
        echo "NEXT_PUBLIC_TAX_ENABLED=false" >> .env
        echo "✅ Tax collection disabled."
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "📋 Next Steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test the checkout flow at /settings/credits"
echo "3. Register for taxes in enabled countries when you hit revenue thresholds"
echo ""
echo "💡 Cost-saving tips:"
echo "• Start with option 1 (no tax) until you hit $50k+ revenue"
echo "• Register for taxes yourself instead of using expensive services"
echo "• US: Register directly with state tax departments (usually free)"
echo "• UK: Register with HMRC for VAT (free, £85k threshold)"
echo "• EU: Register directly with member states (usually free)"
echo ""
echo "🔗 Registration links:"
echo "• US Sales Tax: Search '[State] sales tax registration'"
echo "• UK VAT: https://www.gov.uk/vat-registration"
echo "• EU VAT: Search '[Country] VAT registration'"
echo ""
echo "✅ Configuration complete!" 