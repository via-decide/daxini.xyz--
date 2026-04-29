Branch: simba/fix-vercel-500-internalservererror-functioninvoc
Title: Fix Vercel 500 INTERNAL_SERVER_ERROR (FUNCTION_INVOCATION_FAILED) - S...

## Summary
- Repo orchestration task for via-decide/daxini.xyz
- Goal: Fix Vercel 500 INTERNAL_SERVER_ERROR (FUNCTION_INVOCATION_FAILED) - Serverless function crash

## Testing Checklist
- [ ] Run unit/integration tests
- [ ] Validate command flow
- [ ] Validate generated artifact files

## Risks
- Prompt quality depends on repository metadata completeness.
- GitHub API limits/token scope can block deep inspection.

## Rollback
- Revert branch and remove generated artifact files if workflow output is invalid.