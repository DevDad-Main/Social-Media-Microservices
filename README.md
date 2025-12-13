# Social Media Microservices

A scalable backend application for a social media platform built using microservices architecture. This project demonstrates modern backend development practices with Node.js, Express, MongoDB, Redis, and RabbitMQ.

## Architecture

The application consists of the following microservices:

- **API Gateway (api-entrypoint)**: Acts as the single entry point for all client requests, handles authentication, rate limiting, and routes requests to appropriate services.
- **User Service**: Manages user registration, authentication, login, logout, and token refresh.
- **Post Service**: Handles post creation, retrieval, deletion, and management with event-driven updates.
- **Media Service**: Manages media uploads and storage using Cloudinary, with automatic cleanup on post deletion.
- **Story Service**: Manages user story creation, retrieval, and expiration with media support.
- **Search Service**: Provides full-text search functionality for posts using MongoDB text indexes and Redis caching.

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Message Queue**: RabbitMQ with AMQP (topic exchange)
- **Authentication**: JWT with refresh tokens
- **Media Storage**: Cloudinary
- **Validation**: Joi
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

2. Create `.env` files in each service directory (see Environment Variables section below)

3. Start all services:

   ```bash
   docker-compose up --build
   ```

4. The API will be available at `http://localhost:3000`

To stop the services:

```bash
docker-compose down
```

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

  # Search Service
    cd search-service && npm install && cd ..

    # Story Service
    cd story-service && npm install && cd ..
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

    # Terminal 5: Search Service
    cd search-service && npm run dev

    # Terminal 6: Story Service
    cd story-service && npm run dev
    ```

## Environment Variables

Create `.env` files in each service directory. Use the appropriate URLs based on your deployment method.

### For Docker Compose (Quick Start)

### API Gateway (.env)

```
PORT=3000
REDIS_URL=redis://redis:6379
USER_SERVICE_URL=http://user-service:3001
POST_SERVICE_URL=http://post-service:3002
MEDIA_SERVICE_URL=http://media-service:3003
SEARCH_SERVICE_URL=http://search-service:3004
```

### User Service (.env)

```
PORT=3001
MONGO_URI=mongodb://mongodb:27017/social_media_users
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here
```

### Post Service (.env)

```
PORT=3002
MONGO_URI=mongodb://mongodb:27017/social_media_posts
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your_jwt_secret_here
```

### Media Service (.env)

```
PORT=3003
MONGO_URI=mongodb://mongodb:27017/social_media_media
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Search Service (.env)

```
PORT=3004
MONGO_URI=mongodb://mongodb:27017/social_media_search
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your_jwt_secret_here
```

### Story Service (.env)

```
PORT=3005
MONGO_URI=mongodb://mongodb:27017/social_media_stories
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### For Local Development

Replace the service names with `localhost` in the URLs above (e.g., `REDIS_URL=redis://localhost:6379`, `MONGO_URI=mongodb://localhost:27017/social_media_users`).

#### API Gateway (.env)

```
PORT=3000
REDIS_URL=redis://localhost:6379
USER_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
MEDIA_SERVICE_URL=http://localhost:3003
SEARCH_SERVICE_URL=http://localhost:3004
STORY_SERVICE_URL=http://localhost:3005
```

#### User Service (.env)

```
PORT=3001
MONGO_URI=mongodb://localhost:27017/social_media_users
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
```

#### Post Service (.env)

```
PORT=3002
MONGO_URI=mongodb://localhost:27017/social_media_posts
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your_jwt_secret_here
```

#### Media Service (.env)

```
PORT=3003
MONGO_URI=mongodb://localhost:27017/social_media_media
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Search Service (.env)

```
PORT=3004
MONGO_URI=mongodb://localhost:27017/social_media_search
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your_jwt_secret_here
```

#### Story Service (.env)

```
PORT=3005
MONGO_URI=mongodb://localhost:27017/social_media_stories
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note**: For Docker Compose deployment, replace `localhost` with the service names (e.g., `mongodb`, `redis`, `rabbitmq`) as shown in the Quick Start environment variables above.

## Event-Driven Architecture

The application uses RabbitMQ for inter-service communication:

- **post.created**: Published when a post is created, consumed by Search Service to index the post
- **post.deleted**: Published when a post is deleted, consumed by Search Service (removes index) and Media Service (deletes associated media files)
- **post.liked**: Published when a post is liked/unliked, consumed by other services for analytics
- **story.created**: Published when a story is created, consumed by Search Service to index the story
- **story.deleted**: Published when a story is deleted, consumed by Search Service (removes index) and Media Service (deletes associated media files)

## Caching Strategy

- **Posts**: Cached for 5 minutes with pagination support
- **Individual Posts**: Cached for 1 hour
- **Stories**: Cached for 3 minutes
- **Search Results**: Cached for 3 minutes
- **User Data**: Cached for 10 minutes
- **Rate Limiting**: Uses Redis store for distributed rate limiting

## Testing

Run tests for each service:

```bash
# User Service tests
cd user-service && npm test

# Post Service tests
cd post-service && npm test

# Media Service tests (Note: requires Cloudinary credentials)
cd media-service && npm test

# Search Service tests
cd search-service && npm test
```

Tests use MongoDB Memory Server for isolated database testing.

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

- `GET /v1/search/posts?query=search_term` - Search posts by content
- `GET /v1/search/users?query=search_term` - Search users by username

### Stories (Protected)

- `POST /v1/stories/create-story` - Create a new story
- `GET /v1/stories/get-stories` - Get active stories
- `GET /v1/stories/get-story/:id` - Get story by ID
- `DELETE /v1/stories/delete-story/:id` - Delete story by ID

## Development Tools

- **HTTP Requests**: Use the `.http` files in `api-entrypoint/src/__http__/` for testing endpoints
- **Docker**: Full containerization with docker-compose.yml

## Security Features

- JWT authentication with refresh tokens
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js for security headers
- CORS configuration
- Input validation with Joi
- Password hashing with bcrypt (12 rounds)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run tests and ensure they pass
6. Submit a pull request

## License

ISC
