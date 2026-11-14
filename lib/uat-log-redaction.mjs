// CI output guard: never print credential-bearing UAT log lines.
// Keep complete lines buffered across stream chunks to prevent partial-token leaks.
// Include HTTP auth/cookie headers and connection URLs, not only Clerk development JWTs.
const sensitive = /(?:__clerk_db_jwt|[?&](?:__session|__clerk_ticket|ticket|token|access_token|refresh_token|session_token)(?:=|%3[dD])|\b(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)\s*:|\b(?:DATABASE_URL|DIRECT_URL|CLERK_SECRET_KEY|UAT_CLERK_SECRET_KEY|RESEND_API_KEY)\s*=|postgres(?:ql)?:\/\/|\b(?:sk_(?:test|live)_|rk_live_))/i;
export function redactUatLine(line) {
  return sensitive.test(line) ? '[UAT output redacted: authentication credential or URL]' : line;
}
export function createLineRedactor(write) {
  let pending = '';
  return {
    push(chunk) {
      pending += chunk.toString('utf8');
      let index;
      while ((index = pending.indexOf('\n')) !== -1) {
        write(redactUatLine(pending.slice(0, index)) + '\n');
        pending = pending.slice(index + 1);
      }
    },
    flush() {
      if (pending) write(redactUatLine(pending));
      pending = '';
    },
  };
}
