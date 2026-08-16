function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and add your Supabase project values.`,
    );
  }
  return value;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  return {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceRoleKey(): string {
  return getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}