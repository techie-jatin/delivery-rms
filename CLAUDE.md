# CLAUDE.md
# Behavioral guidelines — read this before every coding session.

Merged from the project CLAUDE.md standard. These rules apply to every
file touched in this project.

---

## 1. Think before coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity first

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables made unused by YOUR changes only.

## 4. Goal-driven execution

Transform every task into verifiable goals before starting:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

## 5. Project-specific rules

- **API versioning:** all routes under `/api/v1/`
- **Backend always re-validates** what the frontend already checked (qty limits, zone check, stock)
- **Never trust frontend** for business-critical checks
- **DB changes via migrations only** — never edit DB manually
- **Geo provider swaps** happen only in `geoProvider.js` + `index.html` — nowhere else
- **Before each new phase:** review previous phase's verify checks pass

---

**These guidelines are working if:**
fewer rewrites, clarifying questions before implementation, and diffs
show only lines that directly serve the request.
