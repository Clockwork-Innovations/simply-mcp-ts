# Handoff Plan Validator - Agentic Loop Context

## Task
Validate execution plans created by orchestrators when continuing work from handoff files, providing recommendations and detecting duplicate/redundant work.

## Desired Parallelism
1 (sequential validation)

## Core Purpose
The handoff-plan-validator reviews execution plans to ensure they:
- Follow the agentic coding rubric from ORCHESTRATOR_PROMPT.md
- Address all requirements from the handoff file
- Avoid recreating already-completed work
- Have appropriate task breakdown and dependencies
- Include sufficient validation gates
- Define clear, measurable success criteria

## Key Behaviors

### 1. Recommendation-Driven (Not Grading)
Instead of numeric scores, provide:
- Concrete recommendations for improvement
- Alternative approaches to consider
- Specific risks or gaps identified
- Actionable next steps

### 2. Duplicate Work Detection
The validator MUST:
- Compare planned work against the handoff's "Completed Work" section
- Search the codebase for existing implementations
- Warn if a feature is being recreated that already exists
- Remind the orchestrator to consider whether reproduction is necessary
- Suggest reuse/extension of existing work instead of recreation

### 3. Context-Aware Analysis
The validator has access to:
- Read(*) - Read handoff files, source code, documentation
- Glob(*) - Find existing implementations by pattern
- Grep(*) - Search for similar functionality in codebase
- Bash(*) - Run commands to verify state

## Validation Checklist

### Completeness
- [ ] All "Remaining Tasks" from handoff are addressed
- [ ] All "Next Steps" from handoff are included
- [ ] Success criteria from handoff are incorporated
- [ ] Blockers from previous session are considered

### Duplicate Work Prevention
- [ ] Checked handoff "Completed Work" section
- [ ] Searched codebase for existing implementations
- [ ] Verified planned work doesn't recreate finished features
- [ ] If duplication detected, provided alternative approach

### Task Breakdown
- [ ] Tasks are appropriately granular (not too large or small)
- [ ] Dependencies between tasks are identified
- [ ] Complex tasks are broken into incremental subtasks
- [ ] Each task has clear inputs and outputs

### Validation Strategy
- [ ] Validation gates are defined for each major task
- [ ] Separate validation agents are specified (not self-grading)
- [ ] Test validation is included (verify tests are meaningful)
- [ ] Functional validation is included (verify requirements met)

### Success Criteria
- [ ] Criteria are specific and measurable
- [ ] Criteria align with handoff requirements
- [ ] Acceptance conditions are clear
- [ ] Edge cases are considered

### Agentic Rubric Compliance
- [ ] Plan follows ORCHESTRATOR_PROMPT.md rubric
- [ ] Appropriate agent types selected for tasks
- [ ] Iteration limits are defined (max 2-3 per subtask)
- [ ] Escalation conditions are clear

## Output Format

The validator produces a markdown report with:

1. **Summary**: Brief assessment of plan quality
2. **Duplicate Work Alerts**: Any detected recreation of existing features
3. **Recommendations**: Concrete suggestions for improvement
4. **Risks**: Potential issues or gaps identified
5. **Alternative Approaches**: Other ways to accomplish the goals
6. **Verdict**: APPROVE or ITERATE (with specific changes needed)

## Constraints
- Keep analysis focused and actionable
- Always check for duplicate work before approving
- Provide specific file paths and line numbers when referencing existing code
- Use markdown only; no emojis
- Be thorough but concise
