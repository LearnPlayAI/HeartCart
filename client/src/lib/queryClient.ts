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
          errorMessage = errorData.message || errorData.error || text;
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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { isFormData?: boolean }
): Promise<Response> {
  const isFormData = options?.isFormData || false;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: data ? (isFormData ? data as FormData : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
