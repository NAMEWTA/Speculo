---
name: to-prd
description: Turn the current conversation context into a PRD plan, saved as docs/plan/<YYYY-MM-DD>-<name>.md, and optionally publish it to the project issue tracker. Use when the user wants to create a PRD or execution plan from the current context.
---

This skill takes the current conversation context and codebase understanding and produces a PRD, saved as a plan document under `docs/plan/`. Do NOT interview the user — just synthesize what you already know.

Publishing to an issue tracker is optional. If a project issue tracker and triage label vocabulary have been provided, you can also publish there — run `/setup-matt-pocock-skills` if not. When no tracker is configured, the `docs/plan/` document is the deliverable.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities to extract deep modules that can be tested in isolation.

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

Check with the user that these modules match their expectations. Check with the user which modules they want tests written for.

3. Write the PRD using the template below and save it to `docs/plan/<YYYY-MM-DD>-<name>.md`:
   - `<YYYY-MM-DD>` is today's date — resolve the real current date (e.g. `date +%F`), do not guess.
   - `<name>` is a short kebab-case slug of the feature/plan (e.g. `react-migration`).
   - Create `docs/plan/` if it does not exist. Do not overwrite an existing plan for the same feature without checking — bump the slug or confirm with the user first.

4. (Optional) If a project issue tracker is configured, also publish the PRD there and apply the `ready-for-agent` triage label — no need for additional triage. Skip this step when no tracker is available.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>
