# 00 Project Context

FlowAI is a Business-to-Workflow Chatbot Generator.

Users can start from:

- Business website
- Documents/PDFs
- Direct business interview/conversation

FlowAI should understand the business, extract services, FAQs, policies, forms, scenarios, escalation paths, missing questions, and business rules, then produce a validated workflow chatbot.

## First Proof Path

Workflow DSL -> Validator -> Runtime Interpreter -> API Test Loop -> Telegram Preview.

## Old Backend Status

The old backend is reference-only. Do not copy old code, preserve old architecture, migrate modules, or refactor it as the new product.

## Most Important Failure Mode

Building too much before the safe core exists. The DSL, validator, runtime, and trace contract must be clear before AI generation, crawling, UI, channels, and persistence expand.

