# InstaLabel API Setup Guide

## Configuration

### 1. API Base URL

The API base URL is configured in `src/config/env.ts`:

```typescript
export const ENV = {
  // API Configuration
  API_BASE_URL: 'https://label.veste.pk',
  // ... rest of config
};
```

### 2. API Endpoints Structure

The app uses this endpoint:

```
POST /login          - User login
```

## API Response Format

### Login Response

```json
{
  "token": "jwt_token_here",
  "uuid": "user_id",
  "email": "user@example.com",
  "name": "Full Name"
}
```

### Error Response

```json
{
  "message": "User not found"
}
```

## Features Implemented

✅ **Complete Authentication Flow**

- Login with email/password
- JWT token-based authentication
- Automatic token storage
- Secure logout

✅ **API Service**

- Centralized API calls
- Error handling
- Request/response logging
- Token management

✅ **Authentication Context**

- Global auth state management
- Persistent login sessions
- User profile management

✅ **Security Features**

- Secure token storage
- Session validation

## Testing

### 1. Test Login

- Enter valid credentials from your system
- Check console logs for API requests
- Verify token storage

### 2. Test Logout

- Login successfully
- Click logout button
- Verify tokens are cleared

## Common Issues

### Issue: "Network error"

**Solution**: Check your internet connection and API availability

### Issue: "User not found"

**Solution**: Use valid credentials that exist in your system

### Issue: "Token expired"

**Solution**: Simply log out and log back in

## Development Notes

- All API calls are logged in development mode
- Tokens are stored securely using AsyncStorage
- The app automatically handles authentication state
- Error messages are user-friendly and informative
- No forgot password or signup functionality (handled on website)
- Simple JWT token-based authentication

## Current Status

✅ **API Endpoint Verified**

- Endpoint `/login` is working correctly
- API responds with proper JSON format
- Error handling is working as expected

✅ **Ready for Production**

- API endpoint configured correctly
- Authentication system implemented
- Token management working
- User session persistence enabled

## Important Notes

⚠️ **Demo Credentials**: The demo credentials (`demo@example.com` / `password123`) mentioned in the code are for testing the UI only. You'll need to use actual user credentials that exist in your system.

The app is now fully configured to work with your API at `https://label.veste.pk/login`!

## Current Status

✅ **Ready for Production**

- API endpoint configured
- Authentication system implemented
- Token management working
- User session persistence enabled

The app is now fully configured to work with your API at `https://label.veste.pk/api/login`!
