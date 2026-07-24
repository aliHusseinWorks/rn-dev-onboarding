# 0003 — Pairing codes are single-use both ways, via a tombstone

Date: 2026-07-24 · Status: accepted

## Context

Relay entries are keyed by a ~62-bit random code. Deleting the KV entry when
the page consumed a result let a re-run of the same script silently
re-register the code — contradicting the "works once" promise shown to users.

## Decision

On first successful GET the relay overwrites the entry with a `used`
tombstone (same TTL) instead of deleting it. Re-POSTs get 409 and the script
prints its manual-paste fallback; re-GETs get 404. Entries and tombstones
expire after 10 minutes.

## Consequences

Best-effort only: Cloudflare KV is not atomic, so two GETs racing within
propagation can both read the report. Codes are unguessable, so that's the
same user's page double-fetching — accepted and documented in the handler.
