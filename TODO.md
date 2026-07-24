# TODO

Cross-session parking lot. Add deferred ideas and known leftovers with a line
of context; tick (don't delete) when done. Team RN repos use Jira instead —
this file exists only because this repo has no board.

- [x] First commit + push of the detect feature, Cloudflare deploy setup, and
      docs system (`.claude/` committed too — it's the team's shared
      agents/skills wiring).
- [x] Connect the repo to Cloudflare Pages git integration ([0005](docs/decisions/0005-deploy-via-cloudflare-git-integration.md)) —
      live and verified end-to-end at rn-dev-onboarding.pages.dev.
- [ ] Verify Zoho Cliq's Windows install dir (`detect.ts` guesses
      `$env:LOCALAPPDATA\Programs\zoho-cliq`) on a machine that has it.
- [ ] Click-through of the live detect flow in a real browser (relay + scripts
      + render are verified; the in-browser polling UI was only smoke-tested).
