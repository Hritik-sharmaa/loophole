import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

// Only keys the code reads today. Each slice adds the keys it starts
// using (PISTON_URL in S3, GEMINI_API_KEY in S5, ...).
export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  // require_tld: false allows http://localhost:3000
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  CORS_ORIGIN: string;

  // Supabase Postgres connection string (Session pooler URI).
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['postgres', 'postgresql'],
  })
  DATABASE_URL: string;

  @IsUrl({ require_protocol: true, protocols: ['https', 'http'] })
  SUPABASE_URL: string;

  // Server-only. Never sent to the web app (AGENTS.md hard rule 3).
  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_KEY: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const problems = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .map((message) => `  - ${message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }

  return env;
}
