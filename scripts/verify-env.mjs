const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

try {
  const url = new URL(process.env.VITE_SUPABASE_URL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL must use http or https');
} catch {
  console.error('VITE_SUPABASE_URL must be a valid HTTP/HTTPS URL.');
  process.exit(1);
}

console.log('Supabase environment variables: OK');
