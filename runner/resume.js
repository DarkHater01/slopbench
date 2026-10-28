// Resume rules for a sweep the free tier can cut short. Pure functions so they
// can be checked without Docker or a key.
const keyOf = (r) => `${r.model}|${r.task}|${r.variant}|${r.rep}`;

// The free limit is account-wide, not per model: once this message appears, every
// remaining run fails the same way, so the sweep stops and the next one resumes.
const quotaSpent = (message) => /free usage limit reached/i.test(String(message || ""));

// A retried key replaces its failed record instead of appending a second one:
// two records for one rep would read as a duplicate to score.js.
const withoutFailed = (raw, key) => raw.filter((r) => !(r.error && keyOf(r) === key));

module.exports = { quotaSpent, withoutFailed, keyOf };
