import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Gets the JWT secret from environment variables with fallback
 * @param configService - Optional ConfigService instance
 * @returns The JWT secret string
 */
export const getJwtSecret = (configService?: ConfigService): string => {
  // Get JWT_SECRET from environment, with explicit fallback
  let secret: string | undefined;
  
  if (configService) {
    secret = configService.get<string>('JWT_SECRET');
  }
  
  if (!secret) {
    secret = process.env.JWT_SECRET;
  }
  
  // Always ensure we have a valid secret
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production. Set it in your environment variables.');
    }
    secret = 'default-secret-change-in-production-min-32-chars-for-development-only';
    console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET in your .env file.');
  }

  const finalSecret = secret.trim();
  
  // Validate secret is not empty after trim
  if (!finalSecret) {
    throw new Error('JWT_SECRET cannot be empty. Please set JWT_SECRET in your .env file.');
  }

  return finalSecret;
};

export const getJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  const finalSecret = getJwtSecret(configService);

  const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || 
                    process.env.JWT_EXPIRES_IN || 
                    '7d';

  console.log('🔐 JWT Config initialized with secret length:', finalSecret.length);

  return {
    secret: finalSecret,
    signOptions: {
      expiresIn,
    },
  };
};

