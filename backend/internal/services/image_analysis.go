package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"mediaVault-backend/internal/models"
)

type ImageAnalysisService struct {
	openaiAPIKey string
	httpClient   *http.Client
}

type ImageAnalysisResult struct {
	Tags        []string `json:"tags"`
	Description string   `json:"description"`
	Objects     []string `json:"objects"`
	Scene       string   `json:"scene"`
	Style       string   `json:"style"`
	Colors      []string `json:"colors"`
	Confidence  float64  `json:"confidence"`
}

type OpenAIVisionRequest struct {
	Model     string    `json:"model"`
	Messages  []Message `json:"messages"`
	MaxTokens int       `json:"max_tokens"`
}

type Message struct {
	Role    string    `json:"role"`
	Content []Content `json:"content"`
}

type Content struct {
	Type     string    `json:"type"`
	Text     *string   `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
}

type ImageURL struct {
	URL string `json:"url"`
}

type OpenAIResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

func NewImageAnalysisService(openaiAPIKey string) *ImageAnalysisService {
	return &ImageAnalysisService{
		openaiAPIKey: openaiAPIKey,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// AnalyzeImage performs comprehensive image analysis using AI vision models
func (s *ImageAnalysisService) AnalyzeImage(ctx context.Context, imageData []byte, mimeType string) (*ImageAnalysisResult, error) {
	// Convert image to base64 data URL
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, encodeToBase64(imageData))

	// Create comprehensive analysis prompt
	prompt := `Analyze this image comprehensively and provide a JSON response with the following structure:
{
  "tags": ["tag1", "tag2", "tag3"],
  "description": "A detailed description of what's in the image",
  "objects": ["object1", "object2"],
  "scene": "indoor/outdoor/studio/etc",
  "style": "photography/art/illustration/etc",
  "colors": ["dominant", "color", "names"],
  "confidence": 0.95
}

Please be thorough and accurate. Include:
- Relevant tags for searchability (5-10 tags)
- A natural description (1-2 sentences)
- Main objects/subjects in the image
- Scene type or setting
- Style or medium of the image
- Dominant colors
- Your confidence level (0.0-1.0)

Return only the JSON object, no additional text.`

	// Create OpenAI Vision request
	request := OpenAIVisionRequest{
		Model:     "gpt-4-vision-preview",
		MaxTokens: 500,
		Messages: []Message{
			{
				Role: "user",
				Content: []Content{
					{
						Type: "text",
						Text: &prompt,
					},
					{
						Type: "image_url",
						ImageURL: &ImageURL{
							URL: dataURL,
						},
					},
				},
			},
		},
	}

	// Make API request
	response, err := s.makeOpenAIRequest(ctx, request)
	if err != nil {
		// Fallback to basic analysis if API fails
		return s.basicImageAnalysis(imageData, mimeType), nil
	}

	// Parse the response
	result, err := s.parseAnalysisResponse(response)
	if err != nil {
		// Fallback to basic analysis if parsing fails
		return s.basicImageAnalysis(imageData, mimeType), nil
	}

	return result, nil
}

// makeOpenAIRequest sends request to OpenAI Vision API
func (s *ImageAnalysisService) makeOpenAIRequest(ctx context.Context, request OpenAIVisionRequest) (string, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.openaiAPIKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var openaiResp OpenAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(openaiResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return openaiResp.Choices[0].Message.Content, nil
}

// parseAnalysisResponse parses the AI response into structured data
func (s *ImageAnalysisService) parseAnalysisResponse(response string) (*ImageAnalysisResult, error) {
	// Clean the response - sometimes AI includes extra text
	response = strings.TrimSpace(response)

	// Find JSON object boundaries
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}") + 1

	if start == -1 || end == 0 {
		return nil, fmt.Errorf("no JSON object found in response")
	}

	jsonStr := response[start:end]

	var result ImageAnalysisResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	// Validate and clean the result
	if len(result.Tags) == 0 {
		result.Tags = []string{"image", "media"}
	}

	if result.Description == "" {
		result.Description = "An uploaded image file"
	}

	if result.Confidence == 0 {
		result.Confidence = 0.8 // Default confidence
	}

	return &result, nil
}

// basicImageAnalysis provides fallback analysis when AI APIs are unavailable
func (s *ImageAnalysisService) basicImageAnalysis(imageData []byte, mimeType string) *ImageAnalysisResult {
	// Basic analysis based on MIME type and simple heuristics
	tags := []string{"image"}
	description := "An uploaded image file"
	scene := "unknown"
	style := "photography"

	// Add type-specific tags
	switch {
	case strings.Contains(mimeType, "jpeg"), strings.Contains(mimeType, "jpg"):
		tags = append(tags, "jpeg", "photo")
		description = "A JPEG image file"
	case strings.Contains(mimeType, "png"):
		tags = append(tags, "png", "graphic")
		description = "A PNG image file"
	case strings.Contains(mimeType, "gif"):
		tags = append(tags, "gif", "animation")
		description = "A GIF image file"
		style = "animation"
	case strings.Contains(mimeType, "webp"):
		tags = append(tags, "webp", "web")
		description = "A WebP image file"
	case strings.Contains(mimeType, "svg"):
		tags = append(tags, "svg", "vector", "graphic")
		description = "An SVG vector image"
		style = "illustration"
	default:
		tags = append(tags, "media")
	}

	// Basic size analysis (rough estimates)
	size := len(imageData)
	switch {
	case size < 50*1024: // < 50KB
		tags = append(tags, "small", "thumbnail")
	case size < 500*1024: // < 500KB
		tags = append(tags, "medium")
	case size < 2*1024*1024: // < 2MB
		tags = append(tags, "large", "high-quality")
	default:
		tags = append(tags, "very-large", "high-resolution")
	}

	return &ImageAnalysisResult{
		Tags:        tags,
		Description: description,
		Objects:     []string{},
		Scene:       scene,
		Style:       style,
		Colors:      []string{"unknown"},
		Confidence:  0.6, // Lower confidence for basic analysis
	}
}

// GenerateSmartTags generates contextual tags based on existing user data
func (s *ImageAnalysisService) GenerateSmartTags(_ context.Context, analysis *ImageAnalysisResult, _ string, existingTags []string) []string {
	// Combine AI-generated tags with existing tags
	tagSet := make(map[string]bool)

	// Add AI-generated tags
	for _, tag := range analysis.Tags {
		tagSet[strings.ToLower(strings.TrimSpace(tag))] = true
	}

	// Add object-based tags
	for _, obj := range analysis.Objects {
		tagSet[strings.ToLower(strings.TrimSpace(obj))] = true
	}

	// Add scene-based tags
	if analysis.Scene != "" && analysis.Scene != "unknown" {
		tagSet[strings.ToLower(analysis.Scene)] = true
	}

	// Add style-based tags
	if analysis.Style != "" && analysis.Style != "unknown" {
		tagSet[strings.ToLower(analysis.Style)] = true
	}

	// Add color-based tags
	for _, color := range analysis.Colors {
		if color != "unknown" {
			tagSet[strings.ToLower(color)] = true
		}
	}

	// Add existing user tags
	for _, tag := range existingTags {
		tagSet[strings.ToLower(strings.TrimSpace(tag))] = true
	}

	// Convert back to slice
	var finalTags []string
	for tag := range tagSet {
		if tag != "" && len(tag) > 1 {
			finalTags = append(finalTags, tag)
		}
	}

	// Limit to reasonable number of tags
	if len(finalTags) > 20 {
		finalTags = finalTags[:20]
	}

	return finalTags
}

// AnalyzeAndEnhanceMedia performs complete image analysis and enhancement
func (s *ImageAnalysisService) AnalyzeAndEnhanceMedia(ctx context.Context, imageData []byte, mimeType string, metadata *models.CreateMediaRequest, userID string) (*models.CreateMediaRequest, error) {
	// Perform image analysis
	analysis, err := s.AnalyzeImage(ctx, imageData, mimeType)
	if err != nil {
		// Don't fail the upload, just log the error
		analysis = s.basicImageAnalysis(imageData, mimeType)
	}

	// Enhance metadata with analysis results
	enhanced := *metadata // Copy existing metadata

	// Auto-generate description if not provided
	if enhanced.Description == nil || *enhanced.Description == "" {
		enhanced.Description = &analysis.Description
	}

	// Generate smart tags
	existingTags := enhanced.Tags
	if existingTags == nil {
		existingTags = []string{}
	}

	smartTags := s.GenerateSmartTags(ctx, analysis, userID, existingTags)
	enhanced.Tags = smartTags

	// Auto-categorize if not provided
	if enhanced.Category == nil || *enhanced.Category == "" {
		category := s.suggestCategory(analysis)
		if category != "" {
			enhanced.Category = &category
		}
	}

	return &enhanced, nil
}

// suggestCategory suggests a category based on image analysis
func (s *ImageAnalysisService) suggestCategory(analysis *ImageAnalysisResult) string {
	// Define category mappings
	categoryMappings := map[string][]string{
		"photography": {"photo", "camera", "portrait", "landscape", "street", "nature"},
		"artwork":     {"art", "painting", "drawing", "illustration", "sketch", "digital-art"},
		"design":      {"logo", "design", "graphic", "layout", "ui", "web"},
		"documents":   {"document", "text", "paper", "scan", "pdf", "certificate"},
		"screenshots": {"screenshot", "screen", "app", "website", "interface", "software"},
		"memes":       {"meme", "funny", "humor", "comic", "joke", "viral"},
		"personal":    {"selfie", "family", "friends", "vacation", "party", "celebration"},
		"nature":      {"landscape", "tree", "flower", "animal", "sky", "water", "mountain"},
		"food":        {"food", "meal", "restaurant", "cooking", "recipe", "drink"},
		"travel":      {"travel", "vacation", "city", "building", "monument", "tourism"},
	}

	// Count matches for each category
	categoryScores := make(map[string]int)

	allTags := append(analysis.Tags, analysis.Objects...)
	allTags = append(allTags, analysis.Scene, analysis.Style)

	for _, tag := range allTags {
		tagLower := strings.ToLower(tag)
		for category, keywords := range categoryMappings {
			for _, keyword := range keywords {
				if strings.Contains(tagLower, keyword) || tagLower == keyword {
					categoryScores[category]++
				}
			}
		}
	}

	// Find the category with the highest score
	bestCategory := ""
	bestScore := 0

	for category, score := range categoryScores {
		if score > bestScore {
			bestCategory = category
			bestScore = score
		}
	}

	return bestCategory
}

// encodeToBase64 converts byte data to base64 string
func encodeToBase64(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
