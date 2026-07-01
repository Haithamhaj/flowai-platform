# Export And Integration Hub

## Purpose

The export hub gives the owner portable, copy-ready artifacts from a generated FlowAI workflow.

## Current Outputs

- FlowAI Workflow JSON export package.
- CRM mapping plan.
- Ticketing mapping plan.

## What It Does

- Validates Workflow JSON before export.
- Preserves strict Workflow JSON structure.
- Maps workflow variables to suggested external fields.
- Uses handoff nodes as routing hints.
- Reports unsupported webhook, action, AI, and RAG nodes.
- Removes secret-like channel settings before export.

## What It Does Not Do

- It does not connect to a CRM.
- It does not connect to a ticketing system.
- It does not create webhooks.
- It does not deploy or publish a bot.
- It does not store files.
- It does not change runtime behavior.

## Review Rule

Every mapping plan is a draft. A human must review external field names, routing, unsupported items, and target system requirements before production integration.
