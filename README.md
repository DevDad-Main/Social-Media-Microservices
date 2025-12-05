# Social Media Microservices

A scalable backend application for a social media platform built using microservices architecture. This project demonstrates modern backend development practices with Node.js, Express, MongoDB, Redis, and RabbitMQ.

## Architecture

The application consists of the following microservices:

- **API Gateway (api-entrypoint)**: Acts as the single entry point for all client requests, handles authentication, rate limiting, and routes requests to appropriate services.
- **User Service**: Manages user registration, authentication, login, logout, and token refresh.
- **Post Service**: Handles post creation, retrieval, and management.
- **Media Service**: Manages media uploads and storage using Cloudinary.
- **Search Service**: Placeholder for future search functionality.

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Message Queue**: RabbitMQ with AMQP
- **Authentication**: JWT with refresh tokens
- **Media Storage**: Cloudinary
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit with Redis store
- **Logging**: Winston
- **Testing**: Vitest with Supertest
- **Development**: Nodemon

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Redis
- RabbitMQ
- Cloudinary account (for media uploads)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/DevDad-Main/Social-Media-Microservices
   cd Social-Media-Microservices
   ```

2. Install dependencies for each service:

   ```bash
   # API Gateway
   cd api-entrypoint && npm install && cd ..

   # User Service
   cd user-service && npm install && cd ..

   # Post Service
   cd post-service && npm install && cd ..

   # Media Service
   cd media-service && npm install && cd ..

   # Search Service (optional)
   cd search-service && npm install && cd ..
   ```

## Environment Variables

Create `.env` files in each service directory with the following variables:

### API Gateway (.env)

```
PORT=3000
REDIS_URL=redis://localhost:6379
USER_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
MEDIA_SERVICE_URL=http://localhost:3003
```

### User Service (.env)

```
PORT=3001
MONGO_URI=mongodb://localhost:27017/social_media_users
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
```

### Post Service (.env)

```
PORT=3002
MONGO_URI=mongodb://localhost:27017/social_media_posts
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your_jwt_secret_here
```

### Media Service (.env)

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

## Running the Application

1. Start external services (MongoDB, Redis, RabbitMQ)

2. Start each microservice in separate terminals:

   ```bash
   # Terminal 1: API Gateway
   cd api-entrypoint && npm run dev

   # Terminal 2: User Service
   cd user-service && npm run dev

   # Terminal 3: Post Service
   cd post-service && npm run dev

   # Terminal 4: Media Service
   cd media-service && npm run dev
   ```

3. The API will be available at `http://localhost:3000`

## Testing

Run tests for each service:

```bash
# User Service tests
cd user-service && npm test

# Post Service tests
cd post-service && npm test

# Media Service tests
cd media-service && npm test
```

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register a new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout user

### Posts (Protected)

- `POST /v1/posts/create-post` - Create a new post
- `GET /v1/posts` - Get posts

### Media (Protected)

- `POST /v1/media/upload-media` - Upload media file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC
