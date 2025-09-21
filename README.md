# MediaVault

A secure, full-stack media storage platform built with React, TypeScript, and modern cloud technologies. MediaVault provides intelligent file management, smart filtering capabilities, and robust user authentication.

## Features

### 🔒 Authentication & Security
- Secure user registration and login
- JWT-based authentication
- Protected routes and role-based access
- Account settings and user management

### 📁 Media Management
- **File Upload**: Drag-and-drop or click to upload images, videos, audio, and documents
- **Grid & List Views**: Toggle between visual grid and detailed list views
- **Search & Filter**: Real-time search with advanced filtering by file type
- **Sorting Options**: Sort by newest, oldest, name, or file size

### 🎨 Smart Filters & AI Processing
- **Artistic Filters**: Watercolor, oil painting, cyberpunk, anime styles, and more
- **Mood-Based Filters**: Happy vibes, dramatic scenes, cozy comfort, high energy themes
- **AI-Powered Style Transfer**: Multiple AI providers for advanced image processing
- **Smart Suggestions**: Personalized filter recommendations based on usage patterns

### 📊 Analytics Dashboard
- User behavior tracking and analytics
- Filter usage patterns and preferences
- Performance metrics and insights
- Filter analytics dashboard

### 🔧 Technical Features
- Responsive design for all devices
- Dark/light theme support
- Real-time file processing
- Efficient caching and optimization

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router DOM** for client-side routing
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Lucide React** for icons

### Backend Infrastructure
- **MinIO** for S3-compatible object storage
- **MongoDB** for database
- **Docker Compose** for local development

### Key Dependencies
- **@aws-sdk/client-s3** - AWS S3 client for cloud storage
- **react-dropzone** - File upload with drag-and-drop
- **react-player** - Media playback support
- **recharts** - Data visualization and analytics
- **date-fns** - Date formatting and manipulation
- **zod** - Schema validation
- **sonner** - Toast notifications

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mediaVault.git
   cd mediaVault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the backend services**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - MongoDB on port 27017
   - MinIO on ports 9000 (API) and 9001 (Console)

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # MinIO Configuration
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_USE_SSL=false

   # MongoDB Configuration
   MONGODB_URI=mongodb://root:password@localhost:27017/mediavault?authSource=admin

   # JWT Configuration
   JWT_SECRET=your-secret-key-here

   # Optional: AI Provider Keys
   OPENAI_API_KEY=your-openai-key
   STABILITY_AI_KEY=your-stability-ai-key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### MinIO Setup
1. Open MinIO Console at `http://localhost:9001`
2. Login with username: `minioadmin`, password: `minioadmin`
3. Create a bucket named `media-vault`
4. Set the bucket policy to public for file access

## Project Structure

```
mediaVault/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components (Radix UI)
│   │   ├── filters/         # Smart filter components
│   │   ├── media-grid.tsx   # Media grid view
│   │   ├── media-table.tsx  # Media table view
│   │   └── sidebar.tsx      # Navigation sidebar
│   ├── pages/               # Page components
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── all-files.tsx    # File browser
│   │   ├── upload.tsx       # File upload page
│   │   ├── filters.tsx      # Smart filters page
│   │   └── auth/           # Authentication pages
│   ├── contexts/           # React contexts
│   ├── services/           # API and external services
│   ├── types/              # TypeScript type definitions
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions
├── docker-compose.yml       # Development services
├── Dockerfile              # Production build
└── deployment configs/     # Various deployment options
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Smart Filters

MediaVault includes an advanced smart filtering system with:

- **Artistic Effects**: Transform photos with watercolor, oil painting, cyberpunk, and anime styles
- **Mood Enhancement**: Apply mood-based filters like "cozy comfort" or "high energy"
- **AI-Powered Processing**: Integration with multiple AI providers for advanced style transfer
- **Learning System**: Personalized recommendations based on usage patterns

See [SMART_FILTERS.md](./SMART_FILTERS.md) for detailed documentation.

## Deployment

### Vercel (Frontend)
The project includes `vercel.json` for easy Vercel deployment:
```bash
npm run build
vercel --prod
```

### Railway (Full-Stack)
Deploy with Railway using the included `railway.json`:
```bash
railway up
```

### Heroku
Deploy to Heroku using the included `Dockerfile.heroku`:
```bash
heroku create your-app-name
heroku container:push web
heroku container:release web
```

### Docker
Build and run with Docker:
```bash
docker build -t mediavault .
docker run -p 5173:5173 mediavault
```

## Environment Configuration

### Development
- Uses Vite dev server with hot reloading
- Local MongoDB and MinIO via Docker Compose
- Debug logging enabled

### Production
- Optimized Vite build
- Environment-based configuration
- Production-ready Docker containers

## API Endpoints

The application connects to various backend services:

- **Authentication**: User registration, login, profile management
- **Media Management**: File upload, retrieval, metadata
- **Smart Filters**: Filter application, AI processing, analytics
- **Analytics**: Usage tracking, user preferences, insights

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [React](https://reactjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

## Watch Project Video here 
https://www.youtube.com/watch?v=Weou_LCrMBU

**MediaVault** - Secure, intelligent media storage for the modern web.
