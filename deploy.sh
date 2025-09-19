#!/bin/bash

# MediaVault Deployment Script

echo "🚀 MediaVault Deployment Assistant"
echo "=================================="

# Check if user wants Heroku or Vercel deployment
echo "Select deployment platform:"
echo "1) Heroku (Full-stack container)"
echo "2) Vercel (Frontend only)"
echo "3) Railway (Full-stack)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📦 Setting up Heroku deployment..."

        # Check if Heroku CLI is installed
        if ! command -v heroku &> /dev/null; then
            echo "❌ Heroku CLI not found. Please install it first:"
            echo "   macOS: brew tap heroku/brew && brew install heroku"
            echo "   Windows: Download from https://devcenter.heroku.com/articles/heroku-cli"
            exit 1
        fi

        # Check if user is logged in
        if ! heroku auth:whoami &> /dev/null; then
            echo "🔐 Please login to Heroku first:"
            heroku login
        fi

        read -p "Enter your Heroku app name: " app_name

        # Create app
        echo "Creating Heroku app: $app_name"
        heroku create $app_name

        # Set stack to container
        echo "Setting stack to container..."
        heroku stack:set container -a $app_name

        # Set basic environment variables
        echo "Setting environment variables..."
        heroku config:set GIN_MODE=release -a $app_name

        echo ""
        echo "✅ Heroku app created successfully!"
        echo "🔧 Next steps:"
        echo "   1. Set up MongoDB Atlas: https://www.mongodb.com/atlas"
        echo "   2. Set up AWS S3 or MinIO storage"
        echo "   3. Configure environment variables:"
        echo "      heroku config:set MONGODB_URI=\"your-mongo-uri\" -a $app_name"
        echo "      heroku config:set MINIO_ENDPOINT=\"your-storage-endpoint\" -a $app_name"
        echo "      heroku config:set MINIO_ACCESS_KEY=\"your-access-key\" -a $app_name"
        echo "      heroku config:set MINIO_SECRET_KEY=\"your-secret-key\" -a $app_name"
        echo "   4. Deploy: git push heroku main"
        ;;

    2)
        echo ""
        echo "📦 Setting up Vercel deployment..."

        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi

        echo "🚀 Starting Vercel deployment..."
        vercel

        echo ""
        echo "✅ Frontend deployed to Vercel!"
        echo "🔧 Don't forget to:"
        echo "   1. Set VITE_API_BASE_URL in Vercel dashboard"
        echo "   2. Deploy your backend separately (Heroku, Railway, etc.)"
        ;;

    3)
        echo ""
        echo "📦 Railway deployment setup..."
        echo "🔧 Steps for Railway deployment:"
        echo "   1. Go to https://railway.app"
        echo "   2. Connect your GitHub repository"
        echo "   3. Add MongoDB service"
        echo "   4. Add environment variables (see DEPLOYMENT.md)"
        echo "   5. Deploy automatically on push"
        ;;

    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo "🐛 For troubleshooting, check the logs and environment variables"
echo ""
echo "Happy deploying! 🎉"