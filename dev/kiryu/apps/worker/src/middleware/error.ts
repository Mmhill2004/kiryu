import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types/env';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler for the Hono app
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  const requestId = c.get('requestId') || 'unknown';
  
  console.error(`[${requestId}] Error:`, {
    name: err.name,
    message: err.message,
    stack: c.env.ENVIRONMENT === 'development' ? err.stack : undefined,
  });

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({
      error: c.env.ENVIRONMENT === 'development' ? err.message : 'Request error',
      statusCode: err.status,
      requestId,
    }, err.status);
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    return c.json({
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
      details: c.env.ENVIRONMENT === 'development' ? err.details : undefined,
      requestId,
    }, err.statusCode);
  }

  // Handle validation errors (from Zod)
  if (err.name === 'ZodError') {
    return c.json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: c.env.ENVIRONMENT === 'development' ? (err as any).errors : undefined,
      requestId,
    }, 400);
  }

  // Generic error response
  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'An unexpected error occurred',
    requestId,
  }, 500);
}

/**
 * Helper to create common API errors
 */
export const Errors = {
  notFound: (resource: string) => 
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),
  
  badRequest: (message: string, details?: unknown) => 
    new ApiError(400, message, 'BAD_REQUEST', details),
  
  unauthorized: (message = 'Unauthorized') => 
    new ApiError(401, message, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Forbidden') => 
    new ApiError(403, message, 'FORBIDDEN'),
  
  conflict: (message: string) => 
    new ApiError(409, message, 'CONFLICT'),
  
  rateLimit: () => 
    new ApiError(429, 'Rate limit exceeded', 'RATE_LIMIT'),
  
  integrationError: (integration: string, message: string, details?: unknown) => 
    new ApiError(502, `${integration} integration error: ${message}`, 'INTEGRATION_ERROR', details),
  
  internal: (message = 'Internal server error') => 
    new ApiError(500, message, 'INTERNAL_ERROR'),
};
