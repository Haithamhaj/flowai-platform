# 14 Security Rules

- No secrets in repo.
- No secrets in workflow JSON.
- No raw webhook URLs inside workflow definitions.
- Use `tokenSecretRef`, `webhookId`, or equivalent reference patterns.
- No `eval`.
- No `new Function`.
- No arbitrary JavaScript workflow expressions.
- Strict validation at API and runtime boundaries.
- Upload/file safety must be designed before document ingestion.
- Channel webhook verification is required before production channel adapters.
- OSS licenses must be reviewed before copying or vendoring code.
- Runtime must produce audit traces for meaningful state transitions.

