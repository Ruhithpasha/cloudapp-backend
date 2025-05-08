# Backend Documentation

## Overview

The backend of the Cloud & Local Image Manager is built with Node.js and Express.js, providing a robust API for image management with Cloudinary integration and local backup support.

## Core Components

### 1. Server Configuration (`index.js`)
- Express server setup
- Middleware configuration
- Route definitions
- File upload handling with Multer
- Static file serving

### 2. Cloudinary Integration (`cloudinary.js`)
- Cloudinary configuration
- Image upload functionality
- Resource management
- Image verification

### 3. Database Operations (`database.js`)
- Local JSON-based storage
- Image metadata management
- CRUD operations for images

## API Endpoints

### Image Management

#### Upload Image
```http
POST /api/upload
Content-Type: multipart/form-data

{
  "image": File,
  "backupKey": string,
  "backupData": string,
  "originalName": string
}
```
- Uploads image to Cloudinary
- Creates local backup
- Stores metadata
- Returns image details

#### List Images
```http
GET /api/images
```
- Returns all images with status
- Includes Cloudinary and local backup status
- Response format:
```json
[
  {
    "id": string,
    "filename": string,
    "originalName": string,
    "localPath": string,
    "cloudinaryUrl": string,
    "cloudinaryPublicId": string,
    "uploadedAt": string,
    "status": "available" | "missing",
    "hasLocalFile": boolean
  }
]
```

#### Restore Image
```http
POST /api/restore/:id
```
- Restores missing image from local backup
- Updates Cloudinary
- Updates metadata
- Returns restored image details

#### Delete Image
```http
DELETE /api/images/:id
```
- Removes image from Cloudinary
- Deletes local backup
- Removes metadata

### Health Check
```http
GET /api/health
```
- Returns server status
- Response format:
```json
{
  "status": "ok",
  "timestamp": string
}
```

## Error Handling

The backend implements comprehensive error handling for:
- File upload failures
- Cloudinary API errors
- Database operations
- Invalid requests
- Network issues

Error responses follow the format:
```json
{
  "error": string,
  "details": string
}
```

## File Structure

```
backend/
├── index.js              # Main server file
├── cloudinary.js         # Cloudinary integration
├── database.js           # Database operations
├── routes/               # API routes
│   ├── images.js        # Image-related routes
│   └── health.js        # Health check route
├── uploads/             # Local image storage
└── README.md            # This documentation
```

## Environment Variables

Required environment variables:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=3001
```

## Dependencies

- `express`: Web framework
- `cloudinary`: Cloudinary SDK
- `multer`: File upload handling
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management

## Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Start development server:
```bash
npm run dev
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Security Considerations

1. File Upload Security
   - File size limits (5MB)
   - File type validation
   - Secure file naming

2. API Security
   - CORS configuration
   - Request validation
   - Error handling

3. Cloudinary Security
   - Secure URLs
   - API key protection
   - Resource access control

## Performance Optimization

1. Image Processing
   - Automatic format optimization
   - Quality optimization
   - Responsive image delivery

2. Caching
   - Cloudinary CDN
   - Local file caching
   - Response caching

## Monitoring and Logging

The backend implements logging for:
- API requests
- File operations
- Cloudinary interactions
- Error tracking
- Performance metrics

## Testing

Run tests with:
```bash
npm test
```

## Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull requests

## Troubleshooting

Common issues and solutions:

1. Upload Failures
   - Check file size limits
   - Verify file types
   - Check Cloudinary credentials

2. Connection Issues
   - Verify environment variables
   - Check network connectivity
   - Validate API endpoints

3. Storage Issues
   - Check disk space
   - Verify file permissions
   - Monitor upload directory 