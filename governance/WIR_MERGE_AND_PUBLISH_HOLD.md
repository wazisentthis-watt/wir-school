# WIR merge & publication safety audit

**Report date:** 2026-11-03 (America/New_York, EST).  
**Scope:** `wazisentthis-watt/wir-school`, including WIR: Connected and
SLOTTA; original game source and assets are not modified.
**Owner directive:** **PROPOSAL / HOLD**, no unapproved merging, release,
publishing, or visual-canon replacement.

## Verified historical audit

GitHub returned the same owner login `wazisentthis-watt` for creating,
moving to ready, and merging PRs #9–#12:

| PR | Ready (UTC) | Merged (UTC) | Interval | Approving reviews |
|---|---|---|---|---|
| 9 | 2026-11-03 13:38:13 | 13:38:19 | 6 sec | 0 |
| 10 | 2026-11-03 13:53:47 | 13:53:53 | 6 sec | 0 |
| 11 | 2026-11-03 14:15:10 | 14:15:23 | 13 sec | 0 |
| 12 | 2026-11-03 14:37:15 | 14:37:23 | 8 sec | 0 |

**Timezone correction:** Eastern time on November 3 is UTC-5, so these
merges happened at **08:38, 08:53, 09:15 and 09:37 EST**, respectively.

Evidence: GitHub PR metadata, issue event timelines and PR review lists.
`auto_merge` was null on each; repository `allow_auto_merge` was false.
These records **do not identify whether the owner account was operated by a
person, personal access token, app, or an AI-enabled process**. The actor is
the *account* `wazisentthis-watt`; do not invent a more specific culprit.

**Root cause:** `GET /branches/main` reported
`protected:false`, no required status checks, and `GET /rulesets`
returned `[]`. Checks passing and "draft" state were not enforceable
approval barriers. The connected app's branch-protection endpoint returned
HTTP 403 (`Resource not accessible by integration`).

Repo metadata: `has_pages:true`, `private:false`. The accessible
`.github/workflows` directory contained only four existing test workflows
(`metal-syntax`, `physics-tests`, `slotta-browser-qa`,
`mission-load-qa`), and **no explicit deploy-pages workflow**.
This does **not prove Pages is unpublished**. A Pages branch source may publish
without a repo-stored deployment workflow. The connected GitHub API could
not read the Pages settings endpoint, so the **publishing source is unknown**.

## Security code included in this draft

- `.github/wir-hold-policy.json`: authoritative base policy initially
  `mode=HOLD`, no approved merges/releases and no public publishing.
- `governance/wir-hold-gate.mjs`: fails closed on unknown/missing policy,
  invalid SHA or absent exact PR+SHA approval; release needs separate
  SHA approval and public-release switch.
- `.github/workflows/wir-hold-authorization.yml`: always-on PR/merge-group
  and default-branch audit jobs, reads policy and gate **from trusted main**
  (never a PR-supplied authorization). **Intentionally fails** while HOLD.
  The first governance bootstrap PR fails because the gate is not yet
  installed on `main`: correct fail-closed behavior.
- `.github/workflows/wir-hold-draft-keeper.yml`:
  `pull_request_target` backup that attempts `gh pr ready --undo`
  on ready-for-review transitions while main policy is HOLD.
  It executes only trusted base source, never PR code under a write token.
  GitHub Actions scheduling makes it **race-prone**; not a security boundary.
- `.github/CODEOWNERS`: requests `wazisentthis-watt` review for source,
  governance and CI. CODEOWNERS alone is not enforcement; owner cannot
  approve their **own** PR in GitHub's normal required-review flow.
- `governance/wir-publication-audit.mjs`: flags new GitHub Actions Pages,
  release, direct write-permission and gh-pages publish routes. It **cannot**
  block legacy Pages branch publication or external integrations.
- `governance/*.test.mjs`: deterministic checks for historic PR patterns,
  scope/commit binding, malicious PR-local policy override, and publish HOLD.

The statuses `WIR HOLD - required merge authorization` and
`WIR HOLD - required publishing authorization` are **advisory until
required in a repository ruleset/branch protection**. A failed check by
itself does not block merging without that repository-level rule.

## ADMIN SETTINGS REQUIRED TO COMPLETE THE LOCK

The connector cannot change these settings in chat. GitHub's connected
repository metadata showed user-level `permissions.admin=true` but the
integration itself received **403** trying to read branch protection, and
the available GitHub connector has no ruleset/protection mutation action.

1. Open [Rulesets](https://github.com/wazisentthis-watt/wir-school/settings/rules).
   Create a new **branch ruleset**, active, targeting **main**.
   Require pull requests and **both** HOLD checks by their exact names:
   `WIR HOLD - required merge authorization` and
   `WIR HOLD - required publishing authorization`.
   Prefer GitHub Actions as the trusted check source when available.
   Block force pushes and deletions; allow **no actor/app bypasses**.
   Set up up-to-date branch requirements if desired.
2. Require an independent approval review / CODEOWNERS approval if a second
   trusted reviewer with repository write access is available. If this is a
   single-owner repo, the owner's own PR does **not** satisfy independent
   approval. Do not invent an automatic reviewer; the HOLD checks alone can
   serve as an intentional temporary full stop.
3. Owner must explicitly bootstrap this **governance-only** PR. The first
   policy workflow cannot pass because main initially has no trusted policy.
   After a deliberate governance review and installation on main, activating
   the ruleset makes future default HOLD checks binding. This bootstrap
   exception must be a deliberate administrative action, **not** an AI merge.
4. Open [Pages settings](https://github.com/wazisentthis-watt/wir-school/settings/pages).
   Check the actual publishing source. **Disable Pages temporarily**, or
   select a controlled GitHub Actions source with required protected
   deployment-environment reviewers before allowing public game output.
   Do not delete or replace the existing site or WIR original assets.
5. Open [Actions settings](https://github.com/wazisentthis-watt/wir-school/settings/actions).
   Make normal workflows read-only where feasible; review apps, PATs,
   credentials and any account-authenticated automations able to make
   PRs ready or merge. The historical GitHub actor alone cannot distinguish
   manual versus automated account use.
6. Verify the main branch again with GitHub API: `protected:true`, required
   HOLD checks present, no bypass actors, and Pages release source reviewed.

**Admin controls are the essential missing security boundary.** The
`pull_request_target` draft keeper is helpful but does not win against
a 6-second ready-to-merge action reliably.

## Verification expectations

The separate policy regression job **should pass** (pure unit tests).
The merge and publication authorization jobs **must fail** while HOLD.
**Do not mark those expected failures as defects, retry to green by
bypassing policy, or merge the branch automatically.**

A stronger future approval flow may use a protected owner release manifest,
a GitHub App that validates owner approval, or a protected environment
requiring an independent reviewer. Neither the code nor these documents
alone can guarantee that the owner account has consented to a particular
merger or publish action.

References:
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
