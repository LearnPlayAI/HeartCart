# JSON Response Error Prevention System

## Problem Summary
Components were experiencing "Unexpected token '<!DOCTYPE html>' is not valid JSON" errors when the server returned HTML error pages instead of JSON responses. This typically happens during server errors, authentication failures, or network issues.

## Root Cause
When API endpoints fail, the server may return HTML error pages (like 500 error pages) instead of JSON. Components that don't handle this properly try to parse HTML as JSON, causing parsing errors.

## Solution Applied

### Enhanced Error Handling Pattern
All systemSettings API mutations now use this enhanced error handling pattern:

```typescript
mutationFn: async (data) => {
  try {
    const result = await apiRequest('METHOD', '/api/endpoint', data);
    
    // Verify the request succeeded
    if (!result?.success) {
      throw new Error('Failed to save setting');
    }
    
    return result;
  } catch (error: any) {
    // Enhanced error handling for different types of errors
    if (error.message && error.message.includes('<!DOCTYPE html>')) {
      throw new Error('Server error occurred. Please check your connection and try again.');
    }
    if (error.message && error.message.includes('JSON')) {
      throw new Error('Invalid server response. Please try again or contact support.');
    }
    throw error;
  }
},
onError: (error: any) => {
  console.error('API save error:', error);
  toast({
    title: "Error",
    description: error.message || "Failed to save. Please try again.",
    variant: "destructive",
  });
}
```

## Fixed Components

### July 7, 2025 - VAT System JSON Error Prevention
- **VATSettingsCard.tsx**: Enhanced error handling for VAT settings mutations
- **SalesRepMessageCard.tsx**: Enhanced error handling for sales rep message mutations  
- **ProductSharingCard.tsx**: Enhanced error handling for product sharing message mutations
- **WebsiteShareCard.tsx**: Enhanced error handling and standardized to use apiRequest consistently

### Key Improvements
1. **Consistent Error Detection**: All components now detect HTML responses and provide user-friendly error messages
2. **Better Error Logging**: Console errors logged for debugging while showing user-friendly messages in UI
3. **Standardized API Usage**: WebsiteShareCard now uses apiRequest consistently instead of mixing fetch/apiRequest
4. **Success Validation**: All mutations verify the result.success property before proceeding

## Prevention Guidelines

### For New Components
1. **Always use enhanced error handling** for mutations that interact with external APIs
2. **Check result.success** before considering the operation successful
3. **Provide user-friendly error messages** instead of raw error messages
4. **Log errors to console** for debugging while showing clean UI messages

### API Request Patterns
- **Use apiRequest consistently** - don't mix with native fetch() unless specifically needed for file uploads
- **Handle both network and server errors** - network failures and server HTML responses
- **Validate response structure** - check for expected success/data properties

## Related Documentation
- `/docs/json/jsonfixes.md` - Previous JSON error fixes for CRUD operations
- `client/src/lib/queryClient.ts` - apiRequest function implementation
- All systemSettings components follow this pattern for consistency

## Testing Recommendations
1. Test with network disconnection to verify error handling
2. Test with invalid authentication to verify server error handling  
3. Test rapid successive saves to verify mutation state handling
4. Monitor console for any remaining JSON parsing errors in development

This system ensures that no component will break due to unexpected HTML responses from the server, providing a robust and user-friendly error handling experience.