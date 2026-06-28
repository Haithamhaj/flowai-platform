# 04 Workflow DSL Principles

Workflow definitions are strict JSON only.

## Top-Level Properties

- `version`
- `workflowId`
- `name`
- `description`
- `sourceSummary`
- `assumptions`
- `nodes`
- `edges`
- `variables`
- `knowledgeSources`
- `tools`
- `channels`
- `tests`
- `publishStatus`
- `createdAt`
- `updatedAt`

## Initial Node Types

`start`, `message`, `question`, `field_collection`, `condition`, `ai_response`, `rag_answer`, `action`, `webhook`, `handoff`, `end`.

## Conditions

Conditions use a safe constrained AST. They are never JavaScript strings and never arbitrary expressions.

Allowed operator families include equality, existence, containment, list membership, boolean composition, comparisons, and `intent_is`.

## Security

- No secrets in workflow JSON.
- No raw webhook URLs in workflow definitions.
- Use references such as `tokenSecretRef` or `webhookId`.
- Validate all workflow definitions at every boundary.

## Tiny Workflow Outline

```json
{
  "nodes": [
    { "id": "start", "type": "start" },
    { "id": "welcome", "type": "message", "message": "How can I help?" },
    { "id": "route", "type": "condition" },
    { "id": "handoff", "type": "handoff", "message": "A person will help you." }
  ],
  "edges": [
    { "source": "start", "target": "welcome" },
    { "source": "welcome", "target": "route" },
    { "source": "route", "target": "handoff", "fallback": true }
  ]
}
```

