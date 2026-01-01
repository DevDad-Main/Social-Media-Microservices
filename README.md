# Social Media Microservices

A scalable backend application for a social media platform built using microservices architecture. This project demonstrates modern backend development practices with Node.js, Express, MongoDB, Redis, and RabbitMQ.

## Project Evolution

This project represents a significant architectural refactor of the original [Knect-Backend](https://github.com/DevDad-Main/Knect-Backend) monolithic application. The refactor showcases professional growth and the implementation of industry-standard patterns and practices learned through continued development experience.

### Key Improvements from Knect-Backend:

- **Microservices Architecture**: Transitioned from monolithic to microservices for better scalability and maintainability
- **Event-Driven Design**: Implemented RabbitMQ for decoupled inter-service communication
- **Advanced Caching**: Redis-based caching strategies for improved performance
- **Container Orchestration**: Docker and Docker Compose for consistent deployment
- **Enhanced Security**: JWT with refresh tokens, rate limiting, and security headers
- **Comprehensive Testing**: Full test coverage with Vitest and MongoDB Memory Server
- **Industry Best Practices**: Following SOLID principles, proper separation of concerns, and scalable patterns
- **Modern Development Tools**: Updated to use ES modules, modern JavaScript features, and development workflows

This refactor demonstrates the ability to evolve codebases, implement modern architectural patterns, and maintain backward compatibility while improving system design.

## Architecture

The application consists of the following microservices:

- **API Gateway (api-entrypoint)**: Acts as the single entry point for all client requests, handles authentication, rate limiting, and routes requests to appropriate services.
- **User Service**: Manages user registration, authentication, login, logout, and token refresh.
- **Post Service**: Handles post creation, retrieval, deletion, and management with event-driven updates.
- **Media Service**: Manages media uploads and storage using Cloudinary, with automatic cleanup on post deletion.
- **Story Service**: Manages user story creation, retrieval, and expiration with media support.
- **Search Service**: Provides full-text search functionality for posts using MongoDB text indexes and Redis caching.
- **Comment Service**: Manages comment creation, replies, likes/dislikes, and moderation for posts.
- **Notification Service**: Handles real-time notifications for user interactions (likes, comments, follows, etc.).

## Services Overview

| Service                  | Port | Status    | Tests       | Description                                 |
| ------------------------ | ---- | --------- | ----------- | ------------------------------------------- |
| **API Gateway**          | 3000 | ✅ Active | -           | Single entry point, authentication, routing |
| **User Service**         | 3001 | ✅ Active | ✅ Complete | User management, authentication, profiles   |
| **Post Service**         | 3002 | ✅ Active | ✅ Complete | Post CRUD, feed, pagination                 |
| **Media Service**        | 3003 | ✅ Active | ✅ Complete | File uploads, Cloudinary integration        |
| **Search Service**       | 3004 | ✅ Active | ✅ Complete | Full-text search, indexing                  |
| **Story Service**        | 3005 | ✅ Active | ⚠️ Partial  | Story creation, expiration, media           |
| **Comment Service**      | 3006 | ✅ Active | ✅ Complete | Comments, replies, likes/dislikes           |
| **Notification Service** | 3007 | ✅ Active | ❌ Missing  | Real-time notifications, events             |

### Test Coverage Status

- **✅ Complete**: Full model and controller test coverage
- **⚠️ Partial**: Model tests only, controller tests need completion
- **❌ Missing**: No tests implemented yet
- **-**: Not applicable (gateway service)

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Message Queue**: RabbitMQ with AMQP (topic exchange)
- **Authentication**: JWT with refresh tokens
- **Media Storage**: Cloudinary
- **Validation**: Express-validator
- **Rate Limiting**: express-rate-limit with Redis store
- **Logging**: Winston
- **Testing**: Vitest with Supertest and MongoDB Memory Server
- **Development**: Nodemon
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js (v18 or higher)
- Docker & Docker Compose (for containerized deployment)
- Cloudinary account (for media uploads)

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/DevDad-Main/Social-Media-Microservices
   cd Social-Media-Microservices
   ```

2. Rename `.env.example` files to `.env` in each service directory and configure your values:

3. Start all services:

   ```bash
   docker-compose up --build
   ```

4. The API will be available at `http://localhost:3000`

To stop the services:

```bash
docker-compose down
```

## Environment Variables

Each service includes a `.env.example` file with all required environment variables. To set up:

### Quick Setup Commands:

```bash
# Copy all example files at once
find . -name ".env.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;

# Or copy individually
cp api-entrypoint/.env.example api-entrypoint/.env
cp user-service/.env.example user-service/.env
# ... repeat for each service
```

### Required Services & Tools:

- **MongoDB**: All services use database `knect_dev`
- **Redis**: For caching and rate limiting
- **RabbitMQ**: For inter-service communication
- **Cloudinary**: For media uploads (Media & Story services)
- **JWT Secret**: For authentication (same secret across all services)

### Docker vs Local Development:

- **Docker (Default)**: `.env.example` files work as-is (uses service names like `rabbitmq`, `mongodb`)
- **Local**: Uncomment localhost sections in each `.env` file

**Note**: Each `.env.example` file includes Docker configurations as default with localhost alternatives commented out for easy switching.

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/DevDad-Main/Social-Media-Microservices
   cd Social-Media-Microservices
   ```

2. Start external services:

   ```bash
   # Using Docker for external dependencies
   docker run -d --name redis -p 6379:6379 redis:alpine
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.10-management-alpine
   docker run -d --name mongodb -p 27017:27017 mongo:latest
   ```

3. Install dependencies for each service:

   ```bash
   # API Gateway
   cd api-entrypoint && npm install && cd ..

   # User Service
   cd user-service && npm install && cd ..

   # Post Service
   cd post-service && npm install && cd ..

# Media Service
    cd media-service && npm install && cd ..
 
    # Story Service
   cd story-service && npm install && cd ..

   # Comment Service
   cd comment-service && npm install && cd ..

   # Notification Service
   cd notification-service && npm install && cd ..
   ```

4. Create `.env` files in each service directory (see Environment Variables section)

5. Start each microservice in separate terminals:

   ```bash
   # Terminal 1: API Gateway
   cd api-entrypoint && npm run dev

   # Terminal 2: User Service
   cd user-service && npm run dev

   # Terminal 3: Post Service
   cd post-service && npm run dev

   # Terminal 4: Media Service
   cd media-service && npm run dev

# Terminal 5: Story Service
   cd story-service && npm run dev

   # Terminal 7: Comment Service
   cd comment-service && npm run dev

   # Terminal 8: Notification Service
   cd notification-service && npm run dev
   ```

## Event-Driven Architecture

The application uses RabbitMQ for inter-service communication:

### Published Events:

- **post.created**: Published when a post is created, consumed by Search Service to index post
- **post.deleted**: Published when a post is deleted, consumed by Search Service (removes index) and Media Service (deletes associated media files)
- **post.liked**: Published when a post is liked/unliked, consumed by Notification Service
- **comment.created**: Published when a comment is created, consumed by Notification Service
- **connectionReq.sent**: Published when a user sends a connection request, consumed by Notification Service

### Consumed Events:

#### Media Service:

- **post.deleted**: Deletes associated media files when posts are deleted

#### Notification Service:

- **post.liked**: Sends notifications to post owners when their posts are liked
- **comment.created**: Sends notifications to post owners when comments are added
- **connectionReq.sent**: Sends notifications to users when connection requests are sent

## Caching Strategy

- **Posts List**: Cached for 5 minutes (300 seconds) with pagination support
- **Individual Posts**: Cached for 1 hour (3600 seconds)
- **Stories**: Cached for 5 minutes (300 seconds)
- **Search Results**: Cached for 3 minutes (180 seconds)
- **User Profile Data**: Cached per request with custom expiration
- **Rate Limiting**: Uses Redis store for distributed rate limiting

## Testing

Run tests for each service:

```bash
# User Service tests (✅ Complete)
cd user-service && npm test

# Post Service tests (✅ Complete)
cd post-service && npm test

# Media Service tests (✅ Complete)
cd media-service && npm test

# Story Service tests (⚠️ Partial - model tests only)
cd story-service && npm test

# Comment Service tests (✅ Complete)
cd comment-service && npm test

# Notification Service tests (❌ Missing)
cd notification-service && npm test
```

### Test Structure

Each service includes:

- **Model Tests**: Database schema validation, CRUD operations
- **Controller Tests**: API endpoint testing with mocked dependencies
- **Setup Files**: Test configuration with MongoDB Memory Server
- **Mocking**: External services (Redis, RabbitMQ, other microservices)

Tests use MongoDB Memory Server for isolated database testing and Vitest as the test runner.

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register a new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh-token` - Refresh access token
- `POST /v1/auth/logout` - Logout user

### Posts (Protected)

- `POST /v1/posts/create-post` - Create a new post
- `GET /v1/posts/get-posts` - Get paginated posts
- `GET /v1/posts/get-post/:id` - Get post by ID
- `DELETE /v1/posts/delete-post/:id` - Delete post by ID

### Media (Protected)

- `POST /v1/media/upload-media` - Upload media file (multipart/form-data)

### Search (Protected)

- `GET /v1/search/posts?query=search_term` - Search posts by content *(moved to post-service when needed)*
- `GET /v1/search/users?query=search_term` - Search users by username *(now in user-service)*

### Stories (Protected)

- `POST /v1/stories/create-story` - Create a new story
- `GET /v1/stories/get-stories` - Get active stories
- `GET /v1/stories/get-story/:id` - Get story by ID
- `DELETE /v1/stories/delete-story/:id` - Delete story by ID

### Comments (Protected)

- `POST /v1/comments/add-comment/:postId` - Add comment to post
- `POST /v1/comments/add-reply/:postId` - Reply to comment
- `GET /v1/comments/fetch-comments-by-post/:postId` - Get comments for post
- `PUT /v1/comments/update-comment/:commentId` - Update comment
- `POST /v1/comments/toggle-like/:commentId` - Like/unlike comment
- `POST /v1/comments/toggle-dislike/:commentId` - Dislike/undislike comment
- `DELETE /v1/comments/delete-comment/:commentId` - Delete comment

### Notifications (Protected)

- `GET /v1/notifications/get-notifications` - Get user notifications
- `PUT /v1/notifications/mark-read/:notificationId` - Mark notification as read
- `DELETE /v1/notifications/delete-notification/:notificationId` - Delete notification

## Development Tools

- **HTTP Requests**: Use the `.http` files in `api-entrypoint/src/__http__/` for testing endpoints
- **Docker**: Full containerization with docker-compose.yml
- **Testing**: Comprehensive test suite with Vitest and MongoDB Memory Server

## Security Features

- JWT authentication with refresh tokens
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator
- Password hashing with bcrypt (12 rounds)

## 👥 Team

- **DevDad-Main** - Lead Developer & Project Maintainer - softwaredevdad@gmail.com

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run tests and ensure they pass
6. Submit a pull request

## License

ISC
