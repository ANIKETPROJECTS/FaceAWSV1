# Face Recognition API - Android Integration Guide

## Overview
Complete REST API for face recognition, registration, authentication, and user management. Built with AWS Rekognition and S3.

---

## Base URL
```
https://{your-domain}/api/face
```

Replace `{your-domain}` with your deployed server URL.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [Health Check](#1-health-check)
   - [Face Registration](#2-face-registration)
   - [Face Authentication](#3-face-authentication)
   - [Face Verification](#4-face-verification)
   - [Get All Users](#5-get-all-users)
   - [Get User Details](#6-get-user-details)
   - [Delete User](#7-delete-user)
3. [Error Handling](#error-handling)
4. [Android Integration Examples](#android-integration-examples)
5. [Best Practices](#best-practices)

---

## Authentication

Currently, the API does **not require authentication headers**. However, consider implementing API key authentication in production:

```java
// Future: Add to all requests if API key is implemented
headers.put("Authorization", "Bearer YOUR_API_KEY");
```

---

## Endpoints

### 1. Health Check

**Check if the API server is running**

```http
GET /health
```

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Face Recognition API is running",
  "timestamp": "2025-11-30T15:00:00.000Z"
}
```

**Android Example:**
```java
OkHttpClient client = new OkHttpClient();
Request request = new Request.Builder()
    .url("https://your-domain/api/face/health")
    .get()
    .build();

client.newCall(request).enqueue(new Callback() {
    @Override
    public void onResponse(Call call, Response response) throws IOException {
        if (response.isSuccessful()) {
            String body = response.body().string();
            // Parse JSON response
        }
    }
    
    @Override
    public void onFailure(Call call, IOException e) {
        // Handle error
    }
});
```

---

### 2. Face Registration

**Register a new face with a name**

```http
POST /register
Content-Type: multipart/form-data
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Yes | Full name of the person (max 100 chars) |
| `image` | File (JPEG/PNG) | Yes | Face image (min 100x100px, max 5MB) |

**Response (201 Created)**
```json
{
  "success": true,
  "message": "Face registered successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "faceId": "12345678-1234-1234-1234-123456789012",
    "imageUrl": "https://s3.amazonaws.com/...",
    "confidence": 98.5,
    "createdAt": "2025-11-30T15:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - No face detected
```json
{
  "success": false,
  "error": "No face detected in the image. Please provide a clear face image."
}
```

**400 Bad Request** - Multiple faces detected
```json
{
  "success": false,
  "error": "Multiple faces detected. Please provide an image with only one face."
}
```

**409 Conflict** - Face already registered
```json
{
  "success": false,
  "error": "This face is already registered",
  "existingUser": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe"
  }
}
```

**Android Example (Using Retrofit):**
```java
// Define the service interface
public interface FaceRecognitionService {
    @Multipart
    @POST("register")
    Call<RegistrationResponse> registerFace(
        @Part("name") RequestBody name,
        @Part MultipartBody.Part image
    );
}

// Usage
File imageFile = new File(imagePath);
RequestBody imageBody = RequestBody.create(imageFile, MediaType.parse("image/jpeg"));
MultipartBody.Part imageMultipart = MultipartBody.Part.createFormData("image", imageFile.getName(), imageBody);
RequestBody nameBody = RequestBody.create(userName, MediaType.parse("text/plain"));

FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
Call<RegistrationResponse> call = service.registerFace(nameBody, imageMultipart);

call.enqueue(new Callback<RegistrationResponse>() {
    @Override
    public void onResponse(Call<RegistrationResponse> call, Response<RegistrationResponse> response) {
        if (response.isSuccessful()) {
            String userId = response.body().getData().getUserId();
            // Store userId for future operations
        }
    }
    
    @Override
    public void onFailure(Call<RegistrationResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

### 3. Face Authentication

**Authenticate a face against all registered faces**

```http
POST /authenticate
Content-Type: multipart/form-data
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | File (JPEG/PNG) | Yes | Face image to authenticate |
| `threshold` | Number | No | Match confidence threshold (0-100, default: 80) |

**Response (200 OK - Authenticated)**
```json
{
  "success": true,
  "message": "Authentication successful",
  "authenticated": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "similarity": 95.5,
    "confidence": 98.2,
    "imageUrl": "https://s3.amazonaws.com/..."
  }
}
```

**Response (401 Unauthorized - Not Found)**
```json
{
  "success": false,
  "error": "Face not recognized. User not registered.",
  "authenticated": false
}
```

**Android Example (Using Retrofit):**
```java
// Service interface
public interface FaceRecognitionService {
    @Multipart
    @POST("authenticate")
    Call<AuthResponse> authenticateFace(
        @Part MultipartBody.Part image,
        @Part("threshold") RequestBody threshold
    );
}

// Usage
File imageFile = new File(imagePath);
RequestBody imageBody = RequestBody.create(imageFile, MediaType.parse("image/jpeg"));
MultipartBody.Part imageMultipart = MultipartBody.Part.createFormData("image", imageFile.getName(), imageBody);
RequestBody thresholdBody = RequestBody.create("80", MediaType.parse("text/plain"));

FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
service.authenticateFace(imageMultipart, thresholdBody).enqueue(new Callback<AuthResponse>() {
    @Override
    public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
        if (response.isSuccessful() && response.body().isAuthenticated()) {
            String name = response.body().getData().getName();
            String userId = response.body().getData().getUserId();
            // User authenticated successfully
        } else {
            // Authentication failed
        }
    }
    
    @Override
    public void onFailure(Call<AuthResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

### 4. Face Verification

**Verify a face against a specific registered user**

```http
POST /verify/{userId}
Content-Type: multipart/form-data
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String | Yes | MongoDB ID of the user to verify against |

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | File (JPEG/PNG) | Yes | Face image to verify |
| `threshold` | Number | No | Match confidence threshold (0-100, default: 80) |

**Response (200 OK - Verified)**
```json
{
  "success": true,
  "message": "Face verified successfully",
  "verified": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "similarity": 92.3,
    "confidence": 97.1
  }
}
```

**Response (401 Unauthorized - Does Not Match)**
```json
{
  "success": false,
  "error": "Face does not match the registered user",
  "verified": false,
  "userId": "507f1f77bcf86cd799439011",
  "userName": "John Doe"
}
```

**Response (404 Not Found)**
```json
{
  "success": false,
  "error": "User not found",
  "verified": false
}
```

**Android Example (Using Retrofit):**
```java
// Service interface
public interface FaceRecognitionService {
    @Multipart
    @POST("verify/{userId}")
    Call<VerifyResponse> verifyFace(
        @Path("userId") String userId,
        @Part MultipartBody.Part image,
        @Part("threshold") RequestBody threshold
    );
}

// Usage
String userId = "507f1f77bcf86cd799439011";
File imageFile = new File(imagePath);
RequestBody imageBody = RequestBody.create(imageFile, MediaType.parse("image/jpeg"));
MultipartBody.Part imageMultipart = MultipartBody.Part.createFormData("image", imageFile.getName(), imageBody);
RequestBody thresholdBody = RequestBody.create("80", MediaType.parse("text/plain"));

FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
service.verifyFace(userId, imageMultipart, thresholdBody).enqueue(new Callback<VerifyResponse>() {
    @Override
    public void onResponse(Call<VerifyResponse> call, Response<VerifyResponse> response) {
        if (response.isSuccessful() && response.body().isVerified()) {
            // Face verified as the specified user
        } else {
            // Verification failed
        }
    }
    
    @Override
    public void onFailure(Call<VerifyResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

### 5. Get All Users

**Retrieve a paginated list of all registered users**

```http
GET /users?limit=20&skip=0
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | Number | 100 | Number of users to return (max 100) |
| `skip` | Number | 0 | Number of users to skip (pagination offset) |

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "imageUrl": "https://s3.amazonaws.com/...",
        "createdAt": "2025-11-30T15:00:00.000Z"
      },
      {
        "userId": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "imageUrl": "https://s3.amazonaws.com/...",
        "createdAt": "2025-11-30T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "skip": 0,
      "hasMore": true
    }
  }
}
```

**Android Example (Using Retrofit):**
```java
// Service interface
public interface FaceRecognitionService {
    @GET("users")
    Call<UsersListResponse> getAllUsers(
        @Query("limit") int limit,
        @Query("skip") int skip
    );
}

// Usage
FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
service.getAllUsers(20, 0).enqueue(new Callback<UsersListResponse>() {
    @Override
    public void onResponse(Call<UsersListResponse> call, Response<UsersListResponse> response) {
        if (response.isSuccessful()) {
            List<User> users = response.body().getData().getUsers();
            int total = response.body().getData().getPagination().getTotal();
            // Update UI with user list
        }
    }
    
    @Override
    public void onFailure(Call<UsersListResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

### 6. Get User Details

**Retrieve details of a specific registered user**

```http
GET /users/{userId}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String | Yes | MongoDB ID of the user |

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "imageUrl": "https://s3.amazonaws.com/...",
    "confidence": 98.5,
    "createdAt": "2025-11-30T15:00:00.000Z",
    "updatedAt": "2025-11-30T15:00:00.000Z"
  }
}
```

**Response (404 Not Found)**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Android Example (Using Retrofit):**
```java
// Service interface
public interface FaceRecognitionService {
    @GET("users/{userId}")
    Call<UserDetailsResponse> getUserDetails(
        @Path("userId") String userId
    );
}

// Usage
String userId = "507f1f77bcf86cd799439011";
FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
service.getUserDetails(userId).enqueue(new Callback<UserDetailsResponse>() {
    @Override
    public void onResponse(Call<UserDetailsResponse> call, Response<UserDetailsResponse> response) {
        if (response.isSuccessful()) {
            User user = response.body().getData();
            String name = user.getName();
            String imageUrl = user.getImageUrl();
            // Display user details
        }
    }
    
    @Override
    public void onFailure(Call<UserDetailsResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

### 7. Delete User

**Delete a registered user and remove their face data**

```http
DELETE /users/{userId}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String | Yes | MongoDB ID of the user to delete |

**Response (200 OK)**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe"
  }
}
```

**Response (404 Not Found)**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Android Example (Using Retrofit):**
```java
// Service interface
public interface FaceRecognitionService {
    @DELETE("users/{userId}")
    Call<DeleteResponse> deleteUser(
        @Path("userId") String userId
    );
}

// Usage
String userId = "507f1f77bcf86cd799439011";
FaceRecognitionService service = retrofit.create(FaceRecognitionService.class);
service.deleteUser(userId).enqueue(new Callback<DeleteResponse>() {
    @Override
    public void onResponse(Call<DeleteResponse> call, Response<DeleteResponse> response) {
        if (response.isSuccessful()) {
            // User deleted successfully
            // Refresh user list
        }
    }
    
    @Override
    public void onFailure(Call<DeleteResponse> call, Throwable t) {
        // Handle error
    }
});
```

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters or no face detected |
| 401 | Unauthorized | Authentication failed or face not verified |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Face already registered |
| 500 | Server Error | Internal server error |

### Error Response Format

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "details": "Additional technical details (in development mode)"
}
```

### Android Error Handling Pattern

```java
service.authenticateFace(imageMultipart, thresholdBody).enqueue(new Callback<AuthResponse>() {
    @Override
    public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
        if (response.isSuccessful()) {
            // Handle success
            AuthResponse body = response.body();
            if (body.isAuthenticated()) {
                String name = body.getData().getName();
                // Proceed with authentication
            } else {
                // Handle failed authentication
            }
        } else {
            // Handle HTTP error
            try {
                String errorBody = response.errorBody().string();
                // Parse error JSON
                JSONObject json = new JSONObject(errorBody);
                String error = json.getString("error");
                // Show error to user
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
    
    @Override
    public void onFailure(Call<AuthResponse> call, Throwable t) {
        // Handle network error
        if (t instanceof SocketTimeoutException) {
            // Request timeout
        } else if (t instanceof IOException) {
            // Network error
        } else {
            // Other errors
        }
    }
});
```

---

## Android Integration Examples

### Setup Retrofit in build.gradle

```groovy
dependencies {
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.10.0'
    
    // Image loading
    implementation 'com.squareup.picasso:picasso:2.8'
    
    // Permissions (for camera and file access)
    implementation 'androidx.activity:activity:1.7.0'
}
```

### Create Retrofit Instance

```java
public class ApiClient {
    private static final String BASE_URL = "https://your-domain/api/face/";
    private static Retrofit retrofit = null;
    
    public static Retrofit getClient() {
        if (retrofit == null) {
            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
            
            retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        }
        return retrofit;
    }
}
```

### Define Response Models

```java
public class RegistrationResponse {
    private boolean success;
    private String message;
    private RegistrationData data;
    
    public static class RegistrationData {
        private String userId;
        private String name;
        private String faceId;
        private String imageUrl;
        private double confidence;
        private String createdAt;
        
        // Getters and setters
        public String getUserId() { return userId; }
        public String getName() { return name; }
        public double getConfidence() { return confidence; }
    }
    
    // Getters
    public boolean isSuccess() { return success; }
    public RegistrationData getData() { return data; }
}

public class AuthResponse {
    private boolean success;
    private String message;
    private boolean authenticated;
    private AuthData data;
    
    public static class AuthData {
        private String userId;
        private String name;
        private double similarity;
        private double confidence;
        private String imageUrl;
        
        // Getters
        public String getUserId() { return userId; }
        public String getName() { return name; }
        public double getSimilarity() { return similarity; }
    }
    
    public boolean isAuthenticated() { return authenticated; }
    public AuthData getData() { return data; }
}
```

### Complete Face Registration Flow

```java
public class FaceRegistrationActivity extends AppCompatActivity {
    private FaceRecognitionService apiService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);
        
        apiService = ApiClient.getClient().create(FaceRecognitionService.class);
    }
    
    private void registerFace(String userName, String imagePath) {
        File imageFile = new File(imagePath);
        
        // Create request body for image
        RequestBody imageBody = RequestBody.create(imageFile, MediaType.parse("image/jpeg"));
        MultipartBody.Part imagePart = MultipartBody.Part.createFormData("image", imageFile.getName(), imageBody);
        
        // Create request body for name
        RequestBody namePart = RequestBody.create(userName, MediaType.parse("text/plain"));
        
        // Make API call
        apiService.registerFace(namePart, imagePart).enqueue(new Callback<RegistrationResponse>() {
            @Override
            public void onResponse(Call<RegistrationResponse> call, Response<RegistrationResponse> response) {
                if (response.isSuccessful()) {
                    RegistrationResponse regResponse = response.body();
                    String userId = regResponse.getData().getUserId();
                    double confidence = regResponse.getData().getConfidence();
                    
                    Toast.makeText(FaceRegistrationActivity.this, 
                        "Registration successful! ID: " + userId, 
                        Toast.LENGTH_LONG).show();
                    
                    // Save userId locally or send to server
                    // Transition to next activity
                } else {
                    handleError(response);
                }
            }
            
            @Override
            public void onFailure(Call<RegistrationResponse> call, Throwable t) {
                Toast.makeText(FaceRegistrationActivity.this, 
                    "Error: " + t.getMessage(), 
                    Toast.LENGTH_SHORT).show();
            }
        });
    }
    
    private void handleError(Response<?> response) {
        try {
            String errorBody = response.errorBody().string();
            JSONObject json = new JSONObject(errorBody);
            String error = json.getString("error");
            Toast.makeText(FaceRegistrationActivity.this, error, Toast.LENGTH_LONG).show();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

### Complete Face Authentication Flow

```java
public class FaceAuthenticationActivity extends AppCompatActivity {
    private FaceRecognitionService apiService;
    private TextureView cameraView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_auth);
        
        apiService = ApiClient.getClient().create(FaceRecognitionService.class);
        cameraView = findViewById(R.id.camera_view);
        
        setupCamera();
    }
    
    private void authenticateWithFace(String imagePath) {
        File imageFile = new File(imagePath);
        
        RequestBody imageBody = RequestBody.create(imageFile, MediaType.parse("image/jpeg"));
        MultipartBody.Part imagePart = MultipartBody.Part.createFormData("image", imageFile.getName(), imageBody);
        RequestBody threshold = RequestBody.create("80", MediaType.parse("text/plain"));
        
        apiService.authenticateFace(imagePart, threshold).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                if (response.isSuccessful()) {
                    AuthResponse authResponse = response.body();
                    if (authResponse.isAuthenticated()) {
                        String userName = authResponse.getData().getName();
                        String userId = authResponse.getData().getUserId();
                        double similarity = authResponse.getData().getSimilarity();
                        
                        showSuccessDialog(userName, userId, similarity);
                        // Allow user to proceed
                    } else {
                        showFailureDialog("Face not recognized");
                    }
                } else {
                    showFailureDialog("Authentication failed");
                }
            }
            
            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                showFailureDialog("Error: " + t.getMessage());
            }
        });
    }
    
    private void setupCamera() {
        // Setup camera capture
        // When face is captured, call authenticateWithFace(imagePath)
    }
    
    private void showSuccessDialog(String name, String userId, double similarity) {
        new AlertDialog.Builder(this)
            .setTitle("Authentication Success")
            .setMessage("Welcome, " + name + "!\nConfidence: " + String.format("%.1f", similarity) + "%")
            .setPositiveButton("OK", (dialog, which) -> {
                // Proceed to main activity
            })
            .show();
    }
    
    private void showFailureDialog(String message) {
        new AlertDialog.Builder(this)
            .setTitle("Authentication Failed")
            .setMessage(message)
            .setPositiveButton("Retry", (dialog, which) -> setupCamera())
            .show();
    }
}
```

---

## Best Practices

### 1. Image Quality Requirements
- **Minimum size:** 100x100 pixels
- **Maximum size:** 5MB
- **Format:** JPEG or PNG
- **Face visibility:** Face should occupy at least 20% of image
- **Lighting:** Good lighting, avoid shadows on face
- **Angle:** Face should be straight (0-15 degrees tilt acceptable)

### 2. Threshold Configuration
```
- Conservative (95%+): Very high security, may reject legitimate users
- Standard (80-90%): Balanced security and usability
- Permissive (70-79%): High usability, lower security
```

### 3. Error Handling Best Practices

```java
private void handleApiResponse(Response<?> response) {
    if (response.isSuccessful()) {
        // Process success response
    } else {
        switch (response.code()) {
            case 400:
                // Invalid request - check image quality
                break;
            case 401:
                // Unauthorized - face not recognized
                break;
            case 404:
                // Not found - user doesn't exist
                break;
            case 409:
                // Conflict - face already registered
                break;
            case 500:
                // Server error - retry later
                break;
        }
    }
}
```

### 4. Network Considerations

```java
private OkHttpClient createOkHttpClient() {
    return new OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .addInterceptor(chain -> {
            // Add request logging
            Request request = chain.request();
            System.out.println("Sending request: " + request.url());
            return chain.proceed(request);
        })
        .build();
}
```

### 5. Data Privacy

- **Store userId securely** in SharedPreferences with encryption:
```java
SharedPreferences prefs = getSharedPreferences("face_auth", MODE_PRIVATE);
// Encrypt before storing
prefs.edit().putString("user_id", encryptString(userId)).apply();
```

- **Never store face images** on device - only server URLs
- **Use HTTPS** in production (not HTTP)
- **Implement token-based authentication** for production

### 6. User Experience Tips

```java
// Show loading state during API call
progressBar.setVisibility(View.VISIBLE);

apiService.authenticateFace(imagePart, threshold).enqueue(new Callback<AuthResponse>() {
    @Override
    public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
        progressBar.setVisibility(View.GONE);
        // Update UI
    }
    
    @Override
    public void onFailure(Call<AuthResponse> call, Throwable t) {
        progressBar.setVisibility(View.GONE);
        // Show error
    }
});
```

### 7. Camera Permissions (Android 6.0+)

```java
private static final int PERMISSION_REQUEST_CODE = 100;

private void requestCameraPermission() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            PERMISSION_REQUEST_CODE);
    } else {
        startCamera();
    }
}

@Override
public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == PERMISSION_REQUEST_CODE && grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        startCamera();
    }
}
```

---

## Troubleshooting

### "No face detected"
- Ensure face is clearly visible
- Check lighting conditions
- Increase image resolution
- Face should fill at least 20% of the image

### "Multiple faces detected"
- Only one person per image
- Ensure background has no faces
- Move other people out of frame

### "Face not recognized"
- Lower the similarity threshold
- Ensure good image quality during registration
- Try different lighting conditions
- Ensure the same person in both images

### "Network timeout"
- Check internet connection
- Increase timeout values in OkHttpClient
- Retry the request
- Check server status

### "401 Unauthorized"
- Face data may not exist in database
- Threshold may be too high
- User may have been deleted

---

## Support & Feedback

For issues or feature requests, contact the development team with:
1. Request endpoint and HTTP method
2. Request body (if applicable)
3. Response received
4. Error message
5. Device and Android version

---

**Last Updated:** November 30, 2025
**API Version:** 1.0
**Status:** Production Ready
