import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      // Clone the response since we can only read the body once
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      
      // Check if response is HTML (likely an error page)
      if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
        errorMessage = 'Server returned an HTML error page instead of JSON. Please try again or contact support.';
      } else {
        // Try to parse as JSON first
        try {
          const errorData = JSON.parse(text);
          // Handle our standardized API error format
          if (errorData.error && typeof errorData.error === 'object') {
            errorMessage = errorData.error.message || JSON.stringify(errorData.error);
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } catch (parseError) {
          // If not JSON, use the raw text
          errorMessage = text;
        }
      }
    } catch (e) {
      console.error('Error parsing error response:', e);
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

// Overloaded function to support both calling patterns
export async function apiRequest(url: string, options: { method: string; body?: string; headers?: Record<string, string> }): Promise<any>;
export async function apiRequest(method: string, url: string, data?: unknown, options?: { isFormData?: boolean; debug?: boolean; credentials?: RequestCredentials; headers?: Record<string, string> }): Promise<any>;
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method: string; body?: string; headers?: Record<string, string> },
  data?: unknown | undefined,
  options?: { 
    isFormData?: boolean; 
    debug?: boolean;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  let method: string;
  let url: string;
  let requestData: unknown;
  let requestOptions: any = {};

  // Handle both calling patterns
  if (typeof urlOrOptions === 'string') {
    // Old pattern: apiRequest(method, url, data, options)
    method = urlOrMethod;
    url = urlOrOptions;
    requestData = data;
    requestOptions = options || {};
  } else {
    // New pattern: apiRequest(url, { method, data, headers })
    url = urlOrMethod;
    method = urlOrOptions?.method || 'GET';
    // Check if urlOrOptions has 'data' property (new mutation pattern) or 'body' property (old pattern)
    requestData = (urlOrOptions as any)?.data || (urlOrOptions?.body ? JSON.parse(urlOrOptions.body) : undefined);
    requestOptions = { headers: urlOrOptions?.headers || {} };
  }

  const isFormData = requestOptions?.isFormData || false;
  const debug = requestOptions?.debug || false;
  
  // Log for debugging if requested
  if (debug || url.includes('/api/product-drafts')) {
    console.log(`API Request: ${method} ${url}`, requestData, requestOptions);
  }
  
  const fetchOptions: RequestInit = {
    method,
    credentials: requestOptions?.credentials || "include",
    body: requestData ? (isFormData ? requestData as FormData : JSON.stringify(requestData)) : undefined,
  };
  
  // Set headers
  fetchOptions.headers = {
    ...(requestData && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(requestOptions?.headers || {})
  };
  
  console.log('Full fetch options:', fetchOptions);
  
  const res = await fetch(url, fetchOptions);

  try {
    await throwIfResNotOk(res);
    
    // Parse JSON response
    const responseJson = await res.json();
    
    // Log successful response for debugging
    if (debug || url.includes('/api/product-drafts')) {
      console.log(`API Response: ${method} ${url}`, responseJson);
    }
    
    return responseJson;
  } catch (error) {
    // Always log errors for product-drafts API calls
    if (url.includes('/api/product-drafts')) {
      console.error(`API Error: ${method} ${url}`, error);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // If there's a params object in queryKey[1], convert it to URL query parameters
    if (queryKey[1] && typeof queryKey[1] === 'object') {
      const params = new URLSearchParams();
      Object.entries(queryKey[1]).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const responseJson = await res.json();
    
    // Return the entire responseJson to ensure the client can access both the success flag
    // and data properties. This makes our API more robust handling both standardized and
    // non-standardized responses.
    return responseJson;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
