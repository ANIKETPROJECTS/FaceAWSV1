# Face Recognition API Documentation

## Overview

This API provides face registration, authentication, and verification capabilities for Android applications using AWS Rekognition, AWS S3, and MongoDB.

## Base URL

```
/api/face
```

## Authentication

Currently, this API does not require authentication headers. For production use, consider implementing JWT tokens or API keys.

---

## Endpoints

### 1. Health Check

Check if the API server is running.

**Endpoint:** `GET /api/face/health`

**Response:**
```json
{
  "success": true,
  "message": "Face Recognition API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Face Registration

Register a new user with their face image.

**Endpoint:** `POST /api/face/register`

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's name |
| image | file | Yes | Face image (JPEG, PNG, or WebP, max 5MB) |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "faceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "imageUrl": "https://bucket.s3.region.amazonaws.com/faces/image.jpg",
    "confidence": 99.98,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing name or image
```json
{
  "success": false,
  "error": "Name is required"
}
```

- **400 Bad Request** - No face detected
```json
{
  "success": false,
  "error": "No face detected in the image. Please provide a clear face image."
}
```

- **400 Bad Request** - Multiple faces detected
```json
{
  "success": false,
  "error": "Multiple faces detected. Please provide an image with only one face."
}
```

- **409 Conflict** - Face already registered
```json
{
  "success": false,
  "error": "This face is already registered",
  "existingUser": {
    "id": "existing-user-id",
    "name": "Existing User"
  }
}
```

---

### 3. Face Authentication

Authenticate a face against all registered faces in the system.

**Endpoint:** `POST /api/face/authenticate`

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | file | Yes | Face image to authenticate |
| threshold | number | No | Similarity threshold (default: 80, range: 0-100) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "authenticated": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "similarity": 98.75,
    "confidence": 99.98,
    "imageUrl": "https://bucket.s3.region.amazonaws.com/faces/image.jpg"
  }
}
```

**Error Responses:**

- **400 Bad Request** - No face detected
```json
{
  "success": false,
  "error": "No face detected in the provided image",
  "authenticated": false
}
```

- **401 Unauthorized** - Face not recognized
```json
{
  "success": false,
  "error": "Face not recognized. User not registered.",
  "authenticated": false
}
```

---

### 4. Face Verification

Verify if a face matches a specific registered user.

**Endpoint:** `POST /api/face/verify/:userId`

**Content-Type:** `multipart/form-data`

**URL Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | The ID of the user to verify against |

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | file | Yes | Face image to verify |
| threshold | number | No | Similarity threshold (default: 80, range: 0-100) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Face verified successfully",
  "verified": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "similarity": 97.50,
    "confidence": 99.95
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Face does not match
```json
{
  "success": false,
  "error": "Face does not match the registered user",
  "verified": false,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "John Doe"
}
```

- **404 Not Found** - User not found
```json
{
  "success": false,
  "error": "User not found",
  "verified": false
}
```

---

### 5. Get All Users

Retrieve a list of all registered users with pagination.

**Endpoint:** `GET /api/face/users`

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| limit | number | No | Maximum number of results (default: 100) |
| skip | number | No | Number of records to skip for pagination |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/faces/image.jpg",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "limit": 100,
      "skip": 0,
      "hasMore": false
    }
  }
}
```

---

### 6. Get User by ID

Retrieve a specific user's details.

**Endpoint:** `GET /api/face/users/:userId`

**URL Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | The user's unique ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "imageUrl": "https://bucket.s3.region.amazonaws.com/faces/image.jpg",
    "confidence": 99.98,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 7. Delete User

Delete a user and all associated face data (S3 image and Rekognition face).

**Endpoint:** `DELETE /api/face/users/:userId`

**URL Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | The user's unique ID |

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

## Android Integration Examples

### Using Retrofit (Kotlin)

```kotlin
interface FaceApiService {
    @Multipart
    @POST("api/face/register")
    suspend fun registerFace(
        @Part("name") name: RequestBody,
        @Part image: MultipartBody.Part
    ): Response<RegisterResponse>

    @Multipart
    @POST("api/face/authenticate")
    suspend fun authenticateFace(
        @Part image: MultipartBody.Part,
        @Part("threshold") threshold: RequestBody?
    ): Response<AuthenticateResponse>

    @Multipart
    @POST("api/face/verify/{userId}")
    suspend fun verifyFace(
        @Path("userId") userId: String,
        @Part image: MultipartBody.Part
    ): Response<VerifyResponse>

    @GET("api/face/users")
    suspend fun getUsers(
        @Query("limit") limit: Int?,
        @Query("skip") skip: Int?
    ): Response<UsersResponse>
}
```

### Preparing Image for Upload

```kotlin
fun createImagePart(imageFile: File): MultipartBody.Part {
    val requestFile = imageFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
    return MultipartBody.Part.createFormData("image", imageFile.name, requestFile)
}

fun createNamePart(name: String): RequestBody {
    return name.toRequestBody("text/plain".toMediaTypeOrNull())
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "details": "Additional technical details (development mode only)"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (for registration) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (authentication/verification failed) |
| 404 | Not Found (user not found) |
| 409 | Conflict (face already registered) |
| 500 | Internal Server Error |

---

## Rate Limits and Best Practices

1. **Image Quality**: Use well-lit, front-facing photos for best results
2. **Image Size**: Maximum file size is 5MB
3. **Supported Formats**: JPEG, PNG, WebP
4. **Similarity Threshold**: Default is 80%. Increase for stricter matching, decrease for more lenient matching
5. **Single Face**: Registration requires exactly one face in the image

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string |
| AWS_ACCESS_KEY_ID | AWS access key |
| AWS_SECRET_ACCESS_KEY | AWS secret key |
| AWS_REGION | AWS region (e.g., ap-south-1) |
| AWS_S3_BUCKET | S3 bucket name for image storage |
| REKOGNITION_COLLECTION_ID | Rekognition collection name (default: face-auth-collection) |
| PORT | Server port (default: 5000) |
