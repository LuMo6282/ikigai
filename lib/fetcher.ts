class FetchError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `HTTP ${status}: ${statusText}`)
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

export async function fetcher<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options

  let finalUrl = url
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value)
    })
    finalUrl += `?${searchParams.toString()}`
  }

  const response = await fetch(finalUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  })

  if (!response.ok) {
    let errorMessage: string | undefined
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.message || errorBody.error
    } catch {
      // Ignore JSON parse errors, use default message
    }
    throw new FetchError(response.status, response.statusText, errorMessage)
  }

  return response.json()
}

// Convenience methods
export const api = {
  get: <T = any>(url: string, params?: Record<string, string>) => 
    fetcher<T>(url, { method: 'GET', params }),
  
  post: <T = any>(url: string, data?: any) => 
    fetcher<T>(url, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  patch: <T = any>(url: string, data?: any) => 
    fetcher<T>(url, { 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: <T = any>(url: string) => 
    fetcher<T>(url, { method: 'DELETE' }),
}