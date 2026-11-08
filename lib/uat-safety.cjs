const UAT_APP_ORIGIN = 'https://localhost:3100';
const UAT_DATABASE_HOST = 'ep-damp-snow-axcqoelf-pooler.c-4.us-east-2.aws.neon.tech';

// Parse only: never connect, resolve DNS, or include connection strings in errors.
// Both pooled and direct endpoints must resolve to the same pinned UAT target.
function checkDatabaseTarget(value, key, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${key} is invalid`);
    return;
  }
  try {
    const url = new URL(value);
    const host = UAT_DATABASE_HOST.replace('-pooler.', '.');
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || ![UAT_DATABASE_HOST, host].includes(url.hostname)
      || url.pathname !== '/froto_automated_uat'
      || (url.port !== '' && url.port !== '5432')
      || url.hash) {
      errors.push(`${key} must target the dedicated automated UAT database`);
      return;
    }
    // Drivers can let query parameters override host, database, or credentials.
    // Keep a small allowlist instead of trying to enumerate every override.
    const allowed = {
      sslmode: /^(?:require|verify-ca|verify-full)$/,
      channel_binding: /^(?:prefer|require)$/,
      connect_timeout: /^[1-9][0-9]*$/,
    };
    const seen = new Set();
    for (const [name, parameter] of url.searchParams) {
      if (!Object.hasOwn(allowed, name) || !allowed[name].test(parameter) || seen.has(name)) {
        errors.push(`${key} contains unsupported connection options`);
        return;
      }
      seen.add(name);
    }
  } catch {
    errors.push(`${key} is invalid`);
  }
}

function checkUatEnvironment(env = process.env) {
  const errors = [];
  for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']) if (!env[key]?.trim()) errors.push(`Missing ${key}`);
  if (env.CLERK_SECRET_KEY && !env.CLERK_SECRET_KEY.startsWith('sk_test_')) errors.push('Only a Clerk development-instance secret key is allowed');
  if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')) errors.push('Only a Clerk development-instance publishable key is allowed');
  for (const key of ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
    if (env[key] && !/^(?:sk|pk)_test_[A-Za-z0-9_-]+={0,2}$/.test(env[key].trim())) errors.push(`${key} must be the full copied development key, without quotes, spaces or an ellipsis`);
  }
  if (env.DATABASE_URL) checkDatabaseTarget(env.DATABASE_URL, 'DATABASE_URL', errors);
  // Current browser UAT does not run migrations and need not supply DIRECT_URL.
  // If present (including an empty value), it must pass the same target guard.
  if (env.DIRECT_URL !== undefined) checkDatabaseTarget(env.DIRECT_URL, 'DIRECT_URL', errors);
  if (env.RESEND_API_KEY) errors.push('Outbound email must be disabled for automated UAT');
  if (env.UAT_BASE_URL && env.UAT_BASE_URL !== UAT_APP_ORIGIN) errors.push('Automated browser tests must use the local isolated application');
  return errors;
}

module.exports.UAT_DATABASE_HOST = UAT_DATABASE_HOST;
module.exports.checkUatEnvironment = checkUatEnvironment;

module.exports.UAT_APP_ORIGIN = UAT_APP_ORIGIN;
