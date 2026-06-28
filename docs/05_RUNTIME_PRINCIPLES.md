# 05 Runtime Principles

- Runtime interprets JSON; it never executes workflow code.
- Runtime is channel-agnostic.
- Runtime returns channel-neutral output.
- Runtime produces trace events for review and debugging.
- Runtime can be tested without Telegram, WhatsApp, or web widget.
- Runtime must work before generator, crawling, RAG, and UI.
- Runtime should be deterministic where possible.
- AI and RAG nodes may use injected providers later, but provider behavior must not redefine workflow semantics.

