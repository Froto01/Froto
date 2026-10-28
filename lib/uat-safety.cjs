const UAT_DATABASE_HOST = 'ep-damp-snow-axcqoelf-pooler.c-4.us-east-2.aws.neon.tech';

function checkUatEnvironment(env = process.env) {
  const errors = [];
  for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']) if (!env[key]?.trim()) errors.push(`Missing ${key}`);
  if (env.CLERK_SECRET_KEY && !env.CLERK_SECRET_KEY.startsWith('sk_test_')) errors.push('Only a Clerk development-instance secret key is allowed');
  if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_test_')) errors.push('Only a Clerk development-instance publishable key is allowed');
  if (env.DATABASE_URL) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.replace('-pooler.', '.') !== UAT_DATABASE_HOST.replace('-pooler.', '.') || url.pathname !== '/froto_automated_uat') errors.push('DATABASE_URL must target the dedicated automated UAT database');
    } catch { errors.push('DATABASE_URL is invalid'); }
  }
  if (env.RESEND_API_KEY) errors.push('Outbound email must be disabled for automated UAT');
  if (env.UAT_BASE_URL && env.UAT_BASE_URL !== 'http://127.0.0.1:3100') errors.push('Automated browser tests must use the local isolated application');
  return errors;
}

module.exports.UAT_DATABASE_HOST = UAT_DATABASE_HOST;
module.exports.checkUatEnvironment = checkUatEnvironment;
