// CI output guard: never print lines containing Clerk development-browser tokens.
// Keep complete lines buffered across stream chunks to prevent partial-token leaks.
const sensitive = /(?:__clerk_db_jwt|__clerk_db_jwt%3[dD]|[?&](?:__clerk_db_jwt|__session|__clerk_ticket|ticket|token)=|authorization\s*:\s*bearer|sk_test_)/i;
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
