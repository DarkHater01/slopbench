// Resume rules for a sweep the free tier can cut short. Pure functions so they
// can be checked without Docker or a key.
const keyOf = (r) => `${r.model}|${r.task}|${r.variant}|${r.rep}`;

// The free limit is account-wide, not per model: once this message appears, every
// remaining run fails the same way, so the sweep stops and the next one resumes.
const quotaSpent = (message) => /free usage limit reached/i.test(String(message || ""));

// A provider error is an outage and is worth retrying. A model that ignored the
// "write solution.py" instruction is a result: retrying it would launder the
// failure into a clean run.
const retryable = (r) =>
  !!r.error && /rate.?limit|free usage limit|timed out|ECONN|socket hang up|\b50[234]\b/i.test(r.error);

// A retried key replaces its failed record instead of appending a second one:
// two records for one rep would read as a duplicate to score.js.
const withoutFailed = (raw, key) => raw.filter((r) => !(r.error && keyOf(r) === key));

module.exports = { quotaSpent, retryable, withoutFailed, keyOf };
