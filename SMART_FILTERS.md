# Smart Filters & Style Transfer - MediaVault

## Overview

The Smart Filters feature provides AI-powered image processing capabilities including artistic style transfer, mood-based filters, and personalized filter suggestions. This system learns from user behavior to provide intelligent recommendations and supports multiple AI providers for advanced processing.

## Features Implemented

### ✅ Core Features

1. **Artistic Filters**
   - Watercolor painting effect
   - Oil painting with brush strokes
   - Cyberpunk neon aesthetic
   - Anime/manga style illustration
   - Pencil sketch rendering
   - Vintage photography
   - Film noir black & white

2. **Mood-Based Filters**
   - Happy vibes (bright, cheerful)
   - Dramatic scene (high contrast)
   - Cozy comfort (warm tones)
   - High energy (vibrant, dynamic)
   - Peaceful calm (serene, soft)
   - Mysterious shadow (dark, enigmatic)
   - Romantic glow (dreamy, soft lighting)

3. **Smart Suggestions**
   - Learns user preferences automatically
   - Analyzes filter usage patterns
   - Suggests filters based on:
     - Frequently used filters
     - Personal style profile
     - Similar content analysis
     - Trending filters
     - Color harmony matching

4. **AI-Powered Processing**
   - Multiple AI provider support:
     - **OpenAI DALL-E** (for style transfer)
     - **Stability AI** (Stable Diffusion models)
     - **Replicate** (open-source models)
     - **Hugging Face** (transformers)
     - **Local models** (ONNX, custom implementations)

## Architecture

### Backend Components

```
backend/
├── internal/
│   ├── models/
│   │   └── filter.go              # Filter data models & types
│   ├── services/
│   │   ├── filter.go              # Core filter processing
│   │   ├── ai_filter.go           # AI-powered style transfer
│   │   └── filter_analytics.go    # User analytics & learning
│   └── handlers/
│       └── filter.go              # API endpoints
└── scripts/
    └── init_filters.go            # Database initialization
```

### Database Collections

1. **filter_presets** - Pre-defined and custom filter configurations
2. **filter_applications** - Track when filters are applied to media
3. **user_filter_preferences** - User behavior and learned preferences

## API Endpoints

### Filter Management

```http
# Get all available filter presets
GET /api/v1/filters/presets?category=artistic&type=watercolor

# Create custom filter preset
POST /api/v1/filters/custom
```

### Apply Filters

```http
# Apply traditional filter to media
POST /api/v1/media/{mediaId}/filters/{filterId}/apply

# Get filter suggestions for media
GET /api/v1/media/{mediaId}/filters/suggestions
```

### AI-Powered Processing

```http
# Apply AI style transfer
POST /api/v1/media/{mediaId}/ai-filters/style-transfer
{
  "styleType": "watercolor",
  "intensity": 0.8,
  "preserveFace": true,
  "customPrompt": "dreamy watercolor landscape"
}

# Apply AI mood enhancement
POST /api/v1/media/{mediaId}/ai-filters/mood-enhancement
{
  "moodType": "cozy",
  "intensity": 0.7,
  "colorTone": "warm"
}
```

### Analytics & Learning

```http
# Get user's filter analytics
GET /api/v1/users/me/filters/analytics

# Get filter usage history
GET /api/v1/users/me/filters/history?page=1&limit=20

# Update/analyze user style profile
POST /api/v1/users/me/style-profile
```

## Setup Instructions

### 1. Install Dependencies

The system uses standard Go image processing libraries. No additional dependencies required for basic functionality.

```bash
cd backend
go mod tidy
```

### 2. Configure AI Providers (Optional)

For AI-powered features, configure your preferred provider in the environment:

```bash
# For Stability AI
export STABILITY_AI_KEY="your-api-key"

# For OpenAI
export OPENAI_API_KEY="your-api-key"

# For Replicate
export REPLICATE_API_TOKEN="your-token"
```

### 3. Initialize Database

```bash
# Initialize default filter presets
make init-filters

# Or run directly
go run ./scripts/init_filters.go
```

### 4. Build and Run

```bash
# Complete setup
make setup

# Run server
make run
```

## Usage Examples

### Basic Filter Application

```javascript
// Apply watercolor filter to an image
const response = await fetch(`/api/v1/media/${mediaId}/filters/${filterId}/apply`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customConfig: {
      brightness: 1.2,
      saturation: 0.9
    }
  })
});

const result = await response.json();
// result.data.processedImage contains base64 encoded filtered image
```

### Get Smart Suggestions

```javascript
// Get personalized filter suggestions
const suggestions = await fetch(`/api/v1/media/${mediaId}/filters/suggestions`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await suggestions.json();
data.suggestions.forEach(suggestion => {
  console.log(`Suggested: ${suggestion.filter.name} (${suggestion.confidence * 100}% confidence)`);
  console.log(`Reason: ${suggestion.reason}`);
});
```

### AI Style Transfer

```javascript
// Apply AI-powered cyberpunk style
const aiResult = await fetch(`/api/v1/media/${mediaId}/ai-filters/style-transfer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    styleType: 'cyberpunk',
    intensity: 0.8,
    preserveFace: true
  })
});

const processed = await aiResult.json();
// processed.data.processedImage contains AI-processed image
// processed.data.confidence shows AI confidence level
```

## Filter Configuration

### CSS-Style Filters

Standard image adjustments support these parameters:

```json
{
  "brightness": 1.1,     // 0.0 - 2.0 (1.0 = no change)
  "contrast": 1.2,       // 0.0 - 2.0 (1.0 = no change)
  "saturation": 0.8,     // 0.0 - 2.0 (1.0 = no change)
  "hue": 30,             // -180 to 180 degrees
  "sepia": 0.5,          // 0.0 - 1.0 (0 = no sepia)
  "grayscale": 0.3,      // 0.0 - 1.0 (0 = no grayscale)
  "blur": 1.0,           // 0.0+ (0 = no blur)
  "opacity": 0.9,        // 0.0 - 1.0 (1.0 = fully opaque)
  "invert": 0.0          // 0.0 - 1.0 (0 = no invert)
}
```

### Advanced Effects

For complex processing, use the effects array:

```json
{
  "effects": [
    {
      "type": "vignette",
      "params": {
        "intensity": 0.6,
        "radius": 0.7
      }
    },
    {
      "type": "neon_glow",
      "params": {
        "color": "#00ff41",
        "intensity": 0.8
      }
    }
  ]
}
```

## AI Provider Configuration

### Stability AI Setup

```go
// Configure for Stability AI
aiService := services.NewAIFilterService(
    services.ProviderStability,
    os.Getenv("STABILITY_AI_KEY")
)
```

### Local Processing Setup

For local AI models (no API costs):

```go
// Use local processing (default)
aiService := services.NewAIFilterService(
    services.ProviderLocal,
    ""
)
```

## Performance Considerations

### Image Processing

- **CPU Processing**: Basic CSS filters are processed in-memory using Go's image libraries
- **Memory Usage**: Large images are processed in chunks to manage memory
- **Concurrent Processing**: Multiple filters can be applied simultaneously

### AI Processing

- **Response Times**:
  - Local processing: 1-5 seconds
  - Cloud APIs: 5-30 seconds depending on provider
- **Rate Limits**: Configurable per provider (default: 20 requests/minute)
- **Caching**: AI results can be cached to improve performance

### Database

- **Filter Applications**: Indexed by userId and appliedAt for fast queries
- **User Preferences**: Optimized for real-time suggestion generation
- **Analytics**: Aggregated data for quick dashboard loading

## Extending the System

### Adding New Filter Types

1. Add filter type to `models/filter.go`:

```go
const (
    ArtisticNewStyle ArtisticFilterType = "new-style"
)
```

2. Implement processing in `services/filter.go`:

```go
func (fs *FilterService) applyNewStyleEffect(img image.Image, params map[string]interface{}) image.Image {
    // Your processing logic here
    return processedImage
}
```

3. Add to default presets in `scripts/init_filters.go`

### Adding New AI Providers

1. Add provider constant in `services/ai_filter.go`:

```go
const (
    ProviderNewAI AIProvider = "new-ai"
)
```

2. Implement provider methods:

```go
func (ai *AIFilterService) applyNewAIStyleTransfer(ctx context.Context, req StyleTransferRequest) (*AIProcessingResult, error) {
    // Integration with new AI service
}
```

## Monitoring & Analytics

### User Behavior Tracking

The system automatically tracks:
- Filter application frequency
- User style preferences
- Popular filter combinations
- Usage patterns over time

### Performance Metrics

Monitor these key metrics:
- Average processing time per filter type
- AI provider response times
- Cache hit rates
- User satisfaction scores

## Troubleshooting

### Common Issues

1. **Filter not applying**: Check media file format (only images supported)
2. **AI processing timeout**: Increase timeout or switch to local processing
3. **Memory issues**: Reduce image size before processing
4. **Database connection**: Verify MongoDB connection string

### Debug Mode

Enable detailed logging:

```bash
export GIN_MODE=debug
export LOG_LEVEL=debug
```

This comprehensive implementation provides a solid foundation for smart filters with room for future enhancements and AI provider integrations.