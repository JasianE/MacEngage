---
name: refactor-ui
description: Refactor an existing UI to match a provided reference design while preserving all functionality and only rendering data-backed elements.
---

# refactor-ui

Refactor a given UI to visually match a provided reference (HTML + screenshot) **without changing functionality**.

## Core Rules

1. **No functionality changes**
   - Do not change data flow, API calls, routing, state, or behavior.
   - Visual/layout/styling changes only.

2. **Render data-backed UI only**
   - If the reference design includes elements that have **no data in the app**, do **not** render them.
   - Do not create placeholders, mock values, or fake metrics.

3. **Reference-driven styling**
   - Match layout, spacing, typography, colors, and component structure to the reference as closely as possible.
   - Prioritize refactoring existing components over creating new ones.

## Inputs

The user will provide:
- Reference UI HTML
- Reference screenshot
- Target UI files/pages to refactor

## Usage

Use this skill when reskinning or visually refactoring any UI to match a reference design while keeping all existing behavior intact.

## Steps

1. **Identify scope**
   - Determine which pages/components are in scope.
   - Identify available data and existing components.

2. **Map reference → app**
   - Map each reference UI element to an existing data-backed element.
   - Explicitly omit any reference elements without data.

3. **Create a plan**
   - List files to change.
   - List which reference elements will be implemented vs omitted.
   - Describe layout/styling changes at a high level.

4. **Wait for approval**
   - Do not modify code until the plan is approved.

5. **Implement**
   - Apply visual refactor only.
   - Preserve all component APIs and logic.

6. **Verify**
   - Confirm behavior is unchanged.
   - Summarize changes and omitted elements.

## Done Criteria

- UI visually matches the reference
- No new functionality added
- No existing behavior changed
- Only data-backed elements are rendered