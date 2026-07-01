# FlowAI Visible MVP Output

Command run:

```bash
CI=true pnpm demo:flowai
```

Captured output:

```text
$ pnpm build && node examples/flowai-demo/visible-mvp-demo.mjs
$ pnpm -r build
Scope: 11 of 12 workspace projects
apps/studio build$ tsc -p tsconfig.json
packages/business-understanding build$ tsc -p tsconfig.json
packages/exporters build$ tsc -p tsconfig.json
packages/shared build$ tsc -p tsconfig.json
apps/studio build: Done
packages/source-ingestion build$ tsc -p tsconfig.json
packages/exporters build: Done
packages/workflow-dsl build$ tsc -p tsconfig.json
packages/shared build: Done
packages/business-understanding build: Done
packages/source-ingestion build: Done
packages/workflow-dsl build: Done
packages/runtime-core build$ tsc -p tsconfig.json
packages/workflow-generator build$ tsc -p tsconfig.json
packages/runtime-core build: Done
packages/workflow-generator build: Done
packages/channel-adapters build$ tsc -p tsconfig.json
packages/source-review build$ tsc -p tsconfig.json
packages/channel-adapters build: Done
packages/source-review build: Done
apps/api build$ tsc -p tsconfig.json
apps/api build: Done
FlowAI Visible MVP Demo
=======================
Path: text/markdown source -> SourceDocument -> facts/BusinessUnderstanding -> Workflow JSON -> runtime -> Telegram mock


## Clinic appointment
Input: bright-dental-clinic.md
1. SourceDocument / sourceRefs
{
  "document": {
    "id": "src_doc_3b53c067bcc744e7",
    "filename": "bright-dental-clinic.md",
    "status": "extracted",
    "mimeType": "text/markdown",
    "contentHash": "sha256:3b53c067bcc744e794f1199a03e85e28f9139ef9bb7d09ea2a82daea6de4e95f",
    "lineCount": 20,
    "warnings": [],
    "errors": []
  },
  "sourceRefs": [
    {
      "id": "src_doc_3b53c067bcc744e7#document",
      "label": "bright-dental-clinic.md",
      "locator": {
        "kind": "document"
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#line_1_20",
      "label": "bright-dental-clinic.md lines 1-20",
      "locator": {
        "kind": "line_range",
        "startLine": 1,
        "endLine": 20
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#heading_1",
      "label": "Bright Dental Clinic",
      "locator": {
        "kind": "heading",
        "heading": "Bright Dental Clinic",
        "line": 1
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#heading_5",
      "label": "Services",
      "locator": {
        "kind": "heading",
        "heading": "Services",
        "line": 5
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#heading_9",
      "label": "Required fields",
      "locator": {
        "kind": "heading",
        "heading": "Required fields",
        "line": 9
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#heading_14",
      "label": "FAQs",
      "locator": {
        "kind": "heading",
        "heading": "FAQs",
        "line": 14
      }
    },
    {
      "id": "src_doc_3b53c067bcc744e7#heading_18",
      "label": "Policies",
      "locator": {
        "kind": "heading",
        "heading": "Policies",
        "line": 18
      }
    }
  ],
  "reviewExcerpt": "# Bright Dental Clinic Category: clinic Goal: book appointments and answer common questions. ## Services - Dental checkup: Routine dental examination. - Teeth whitening: Cosmeti..."
}
2. Extracted business facts / BusinessUnderstanding draft
{
  "businessUnderstandingId": "bu_src_doc_3b53c067bcc744e7",
  "businessName": "Bright Dental Clinic",
  "category": "clinic",
  "services": [
    {
      "name": "Dental checkup",
      "requiredFields": [
        "name",
        "phone",
        "preferred date"
      ],
      "sourceRefs": [
        "src_doc_3b53c067bcc744e7#document"
      ]
    },
    {
      "name": "Teeth whitening",
      "requiredFields": [
        "name",
        "phone",
        "preferred date"
      ],
      "sourceRefs": [
        "src_doc_3b53c067bcc744e7#document"
      ]
    }
  ],
  "faqs": [
    {
      "question": "Do you accept emergency appointments?",
      "answer": "Emergency appointment requests are collected for staff follow-up.",
      "sourceRefs": [
        "src_doc_3b53c067bcc744e7#document"
      ]
    }
  ],
  "policies": [
    "Do not provide medical diagnosis.",
    "Cancellation requests should be made 24"
  ],
  "unknowns": []
}
3. WorkflowGenerationPlan summary
{
  "selectedTemplate": "clinic_booking",
  "capabilities": [
    "book_appointments",
    "handoff_to_human",
    "answer_faq"
  ],
  "requiredFields": [
    "name",
    "phone",
    "preferred_date"
  ],
  "blockers": [],
  "warnings": [
    "target_channel_metadata_only",
    "handoff_destination_unconfirmed"
  ]
}
4. Generated WorkflowDefinition summary
{
  "workflowId": "wf_bu_src_doc_3b53c067bcc744e7",
  "name": "Bright Dental Clinic appointment workflow draft",
  "valid": true,
  "nodes": [
    "start:start",
    "welcome:message",
    "route_intent:condition",
    "collect_appointment:field_collection",
    "answer_faq:message",
    "unsupported:message",
    "handoff_staff:handoff",
    "done:end"
  ],
  "tests": [
    "test_clinic_booking_happy_path",
    "test_clinic_unsupported_handoff",
    "test_clinic_missing_field_retry",
    "test_clinic_faq_path"
  ]
}
5. Runtime test conversation
bot: Welcome to Bright Dental Clinic. How can I help you today? | [choices: Book appointment, Common question, Talk to staff]
user: book appointment
bot: What is your name?
user: Huda Ali
bot: What phone number should the team use?
user: +966500000000
bot: What date do you prefer?
user: 2026-07-01
bot: Thanks. I will pass this appointment request to the team. | A staff member should follow up with you.
state: ended=true | currentNode=handoff_staff
6. Telegram preview mock output
{
  "adapterId": "258391d1-bab5-4324-b2e5-727909353282",
  "status": "ready",
  "workflowId": "wf_bu_src_doc_3b53c067bcc744e7",
  "telegramMessages": [
    {
      "type": "text",
      "text": "What is your name?"
    }
  ],
  "stateSummary": {
    "currentNodeId": "collect_appointment",
    "awaitingInput": {
      "kind": "field_collection",
      "nodeId": "collect_appointment",
      "fieldKey": "name"
    },
    "ended": false
  }
}

## Service lead
Input: clearspace-cleaning.txt
1. SourceDocument / sourceRefs
{
  "document": {
    "id": "src_doc_97569a2410768978",
    "filename": "clearspace-cleaning.txt",
    "status": "extracted",
    "mimeType": "text/plain",
    "contentHash": "sha256:97569a24107689784249f2f10b27500c28d6bbb5c54a4cbb848718bd55a1ce3c",
    "lineCount": 10,
    "warnings": [],
    "errors": []
  },
  "sourceRefs": [
    {
      "id": "src_doc_97569a2410768978#document",
      "label": "clearspace-cleaning.txt",
      "locator": {
        "kind": "document"
      }
    },
    {
      "id": "src_doc_97569a2410768978#line_1_10",
      "label": "clearspace-cleaning.txt lines 1-10",
      "locator": {
        "kind": "line_range",
        "startLine": 1,
        "endLine": 10
      }
    }
  ],
  "reviewExcerpt": "Business name: ClearSpace Cleaning Category: service company Goal: collect leads for cleaning requests. Services: - Office cleaning: Recurring office cleaning. - Move-out cleani..."
}
2. Extracted business facts / BusinessUnderstanding draft
{
  "businessUnderstandingId": "bu_src_doc_97569a2410768978",
  "businessName": "ClearSpace Cleaning",
  "category": "service_company",
  "services": [
    {
      "name": "Office cleaning",
      "requiredFields": [
        "name",
        "phone",
        "location"
      ],
      "sourceRefs": [
        "src_doc_97569a2410768978#document"
      ]
    },
    {
      "name": "Move-out cleaning",
      "requiredFields": [
        "name",
        "phone",
        "location"
      ],
      "sourceRefs": [
        "src_doc_97569a2410768978#document"
      ]
    }
  ],
  "faqs": [],
  "policies": [],
  "unknowns": []
}
3. WorkflowGenerationPlan summary
{
  "selectedTemplate": "service_lead",
  "capabilities": [
    "collect_leads",
    "handoff_to_human"
  ],
  "requiredFields": [
    "name",
    "phone",
    "location"
  ],
  "blockers": [],
  "warnings": [
    "target_channel_metadata_only",
    "handoff_destination_unconfirmed"
  ]
}
4. Generated WorkflowDefinition summary
{
  "workflowId": "wf_bu_src_doc_97569a2410768978",
  "name": "ClearSpace Cleaning lead workflow draft",
  "valid": true,
  "nodes": [
    "start:start",
    "welcome:message",
    "route_intent:condition",
    "ask_service_interest:question",
    "collect_lead:field_collection",
    "unsupported:message",
    "handoff_sales:handoff",
    "done:end"
  ],
  "tests": [
    "test_service_lead_happy_path",
    "test_service_unsupported_handoff",
    "test_service_missing_field_retry"
  ]
}
5. Runtime test conversation
bot: Welcome to ClearSpace Cleaning. How can I help you today? | [choices: Request service, Talk to a person]
user: lead
bot: Which service are you interested in? | [choices: Office cleaning, Move-out cleaning]
user: service_office_cleaning
bot: What is your name?
user: Noura
bot: What phone number should the team use?
user: +966511111111
bot: Please provide location.
user: Riyadh office
bot: Thanks. I will pass this request to the team. | A team member should follow up with you.
state: ended=true | currentNode=handoff_sales
6. Telegram preview mock output
{
  "adapterId": "2d97d53a-da39-4a9f-bcaa-af94d0edf387",
  "status": "ready",
  "workflowId": "wf_bu_src_doc_97569a2410768978",
  "telegramMessages": [
    {
      "type": "text",
      "text": "Which service are you interested in?",
      "replyMarkup": {
        "inline_keyboard": [
          [
            {
              "text": "Office cleaning",
              "callback_data": "flowai_choice:service_office_cleaning"
            }
          ],
          [
            {
              "text": "Move-out cleaning",
              "callback_data": "flowai_choice:service_move_out_cleaning"
            }
          ]
        ]
      }
    }
  ],
  "stateSummary": {
    "currentNodeId": "ask_service_interest",
    "awaitingInput": {
      "kind": "question",
      "nodeId": "ask_service_interest",
      "variableKey": "service_interest"
    },
    "ended": false
  }
}

## FAQ support through service workflow
Input: support-faq.md
1. SourceDocument / sourceRefs
{
  "document": {
    "id": "src_doc_bf2c6e9d8608b42c",
    "filename": "support-faq.md",
    "status": "extracted",
    "mimeType": "text/markdown",
    "contentHash": "sha256:bf2c6e9d8608b42c13ced452d0740ff37a85281e7ce43c7b5128876be68151d7",
    "lineCount": 16,
    "warnings": [],
    "errors": []
  },
  "sourceRefs": [
    {
      "id": "src_doc_bf2c6e9d8608b42c#document",
      "label": "support-faq.md",
      "locator": {
        "kind": "document"
      }
    },
    {
      "id": "src_doc_bf2c6e9d8608b42c#line_1_16",
      "label": "support-faq.md lines 1-16",
      "locator": {
        "kind": "line_range",
        "startLine": 1,
        "endLine": 16
      }
    },
    {
      "id": "src_doc_bf2c6e9d8608b42c#heading_1",
      "label": "FlowCare Support",
      "locator": {
        "kind": "heading",
        "heading": "FlowCare Support",
        "line": 1
      }
    },
    {
      "id": "src_doc_bf2c6e9d8608b42c#heading_5",
      "label": "Services",
      "locator": {
        "kind": "heading",
        "heading": "Services",
        "line": 5
      }
    },
    {
      "id": "src_doc_bf2c6e9d8608b42c#heading_8",
      "label": "Required fields",
      "locator": {
        "kind": "heading",
        "heading": "Required fields",
        "line": 8
      }
    },
    {
      "id": "src_doc_bf2c6e9d8608b42c#heading_12",
      "label": "FAQs",
      "locator": {
        "kind": "heading",
        "heading": "FAQs",
        "line": 12
      }
    }
  ],
  "reviewExcerpt": "# FlowCare Support Category: service company Goal: answer FAQs and collect support follow-up requests. ## Services - Support follow-up: Collect customer details when the FAQ doe..."
}
2. Extracted business facts / BusinessUnderstanding draft
{
  "businessUnderstandingId": "bu_src_doc_bf2c6e9d8608b42c",
  "businessName": "FlowCare Support",
  "category": "service_company",
  "services": [
    {
      "name": "Support follow-up",
      "requiredFields": [
        "name",
        "phone"
      ],
      "sourceRefs": [
        "src_doc_bf2c6e9d8608b42c#document"
      ]
    }
  ],
  "faqs": [
    {
      "question": "What are your support hours?",
      "answer": "Support requests are reviewed from 9 AM to 5 PM, Sunday to Thursday.",
      "sourceRefs": [
        "src_doc_bf2c6e9d8608b42c#document"
      ]
    },
    {
      "question": "Can the bot reset my account?",
      "answer": "No. The bot routes account reset requests to a human.",
      "sourceRefs": [
        "src_doc_bf2c6e9d8608b42c#document"
      ]
    }
  ],
  "policies": [],
  "unknowns": []
}
3. WorkflowGenerationPlan summary
{
  "selectedTemplate": "service_lead",
  "capabilities": [
    "collect_leads",
    "handoff_to_human",
    "answer_faq"
  ],
  "requiredFields": [
    "name",
    "phone"
  ],
  "blockers": [],
  "warnings": [
    "target_channel_metadata_only",
    "handoff_destination_unconfirmed"
  ]
}
4. Generated WorkflowDefinition summary
{
  "workflowId": "wf_bu_src_doc_bf2c6e9d8608b42c",
  "name": "FlowCare Support lead workflow draft",
  "valid": true,
  "nodes": [
    "start:start",
    "welcome:message",
    "route_intent:condition",
    "ask_service_interest:question",
    "collect_lead:field_collection",
    "answer_faq:message",
    "unsupported:message",
    "handoff_sales:handoff",
    "done:end"
  ],
  "tests": [
    "test_service_lead_happy_path",
    "test_service_unsupported_handoff",
    "test_service_missing_field_retry",
    "test_service_faq_path"
  ]
}
5. Runtime test conversation
bot: Welcome to FlowCare Support. How can I help you today? | [choices: Request service, Common question, Talk to a person]
user: faq
bot: Support requests are reviewed from 9 AM to 5 PM, Sunday to Thursday.
state: ended=false | currentNode=done
6. Telegram preview mock output
{
  "adapterId": "4afb9957-8b86-4b8d-9a11-a1b6ce5bc054",
  "status": "ready",
  "workflowId": "wf_bu_src_doc_bf2c6e9d8608b42c",
  "telegramMessages": [
    {
      "type": "text",
      "text": "Support requests are reviewed from 9 AM to 5 PM, Sunday to Thursday."
    }
  ],
  "stateSummary": {
    "currentNodeId": "done",
    "ended": false
  }
}

## Arabic clinic document
Input: arabic-clinic.md
1. SourceDocument / sourceRefs
{
  "document": {
    "id": "src_doc_80c505e3ba32cb45",
    "filename": "arabic-clinic.md",
    "status": "extracted",
    "mimeType": "text/markdown",
    "contentHash": "sha256:80c505e3ba32cb455c104e80ff6360467fdd505873ce8763bd45b0fe9d2cff6d",
    "lineCount": 14,
    "warnings": [],
    "errors": []
  },
  "sourceRefs": [
    {
      "id": "src_doc_80c505e3ba32cb45#document",
      "label": "arabic-clinic.md",
      "locator": {
        "kind": "document"
      }
    },
    {
      "id": "src_doc_80c505e3ba32cb45#line_1_14",
      "label": "arabic-clinic.md lines 1-14",
      "locator": {
        "kind": "line_range",
        "startLine": 1,
        "endLine": 14
      }
    },
    {
      "id": "src_doc_80c505e3ba32cb45#heading_1",
      "label": "عيادة النور",
      "locator": {
        "kind": "heading",
        "heading": "عيادة النور",
        "line": 1
      }
    },
    {
      "id": "src_doc_80c505e3ba32cb45#heading_5",
      "label": "Services",
      "locator": {
        "kind": "heading",
        "heading": "Services",
        "line": 5
      }
    },
    {
      "id": "src_doc_80c505e3ba32cb45#heading_8",
      "label": "Required fields",
      "locator": {
        "kind": "heading",
        "heading": "Required fields",
        "line": 8
      }
    },
    {
      "id": "src_doc_80c505e3ba32cb45#heading_12",
      "label": "FAQs",
      "locator": {
        "kind": "heading",
        "heading": "FAQs",
        "line": 12
      }
    }
  ],
  "reviewExcerpt": "# عيادة النور Category: clinic Goal: book appointments. ## Services - فحص الأسنان: فحص وتنظيف دوري. ## Required fields - name - phone ## FAQs Q: هل تقبلون الحالات الطارئة؟ A: يت..."
}
2. Extracted business facts / BusinessUnderstanding draft
{
  "businessUnderstandingId": "bu_src_doc_80c505e3ba32cb45",
  "businessName": "عيادة النور",
  "category": "clinic",
  "services": [
    {
      "name": "فحص الأسنان",
      "requiredFields": [
        "name",
        "phone"
      ],
      "sourceRefs": [
        "src_doc_80c505e3ba32cb45#document"
      ]
    }
  ],
  "faqs": [
    {
      "question": "هل تقبلون الحالات الطارئة؟",
      "answer": "يتم تحويل طلبات الطوارئ إلى الفريق للمتابعة.",
      "sourceRefs": [
        "src_doc_80c505e3ba32cb45#document"
      ]
    }
  ],
  "policies": [],
  "unknowns": []
}
3. WorkflowGenerationPlan summary
{
  "selectedTemplate": "clinic_booking",
  "capabilities": [
    "book_appointments",
    "handoff_to_human",
    "answer_faq"
  ],
  "requiredFields": [
    "name",
    "phone"
  ],
  "blockers": [],
  "warnings": [
    "target_channel_metadata_only",
    "handoff_destination_unconfirmed"
  ]
}
4. Generated WorkflowDefinition summary
{
  "workflowId": "wf_bu_src_doc_80c505e3ba32cb45",
  "name": "عيادة النور appointment workflow draft",
  "valid": true,
  "nodes": [
    "start:start",
    "welcome:message",
    "route_intent:condition",
    "collect_appointment:field_collection",
    "answer_faq:message",
    "unsupported:message",
    "handoff_staff:handoff",
    "done:end"
  ],
  "tests": [
    "test_clinic_booking_happy_path",
    "test_clinic_unsupported_handoff",
    "test_clinic_missing_field_retry",
    "test_clinic_faq_path"
  ]
}
5. Runtime test conversation
bot: Welcome to عيادة النور. How can I help you today? | [choices: Book appointment, Common question, Talk to staff]
user: book appointment
bot: What is your name?
user: سارة
bot: What phone number should the team use?
user: +966522222222
bot: Thanks. I will pass this appointment request to the team. | A staff member should follow up with you.
state: ended=true | currentNode=handoff_staff
6. Telegram preview mock output
{
  "adapterId": "eb3fb9c4-bdac-4511-9054-4c8304005b73",
  "status": "ready",
  "workflowId": "wf_bu_src_doc_80c505e3ba32cb45",
  "telegramMessages": [
    {
      "type": "text",
      "text": "What is your name?"
    }
  ],
  "stateSummary": {
    "currentNodeId": "collect_appointment",
    "awaitingInput": {
      "kind": "field_collection",
      "nodeId": "collect_appointment",
      "fieldKey": "name"
    },
    "ended": false
  }
}
Deferred capabilities: PDF, DOCX, crawling, RAG, AI extraction, persistence, auth/tenants, Studio UI, production Telegram, WhatsApp, exporters.
```

## Owner Review

### 1. What The Demo Proves

- The local path is visible and runnable from one command.
- Text and markdown examples become `SourceDocument` records with stable ids, content hashes, and sourceRefs.
- Deterministic facts can become `BusinessUnderstanding` drafts.
- Existing workflow generation can produce valid Workflow JSON for clinic appointment and service lead cases.
- The generated workflows can run through the local runtime test loop.
- Telegram preview mock can show channel-formatted output without production Telegram credentials.
- Arabic text survives ingestion, fact extraction, workflow naming, and runtime output.

### 2. What The Brain Is Doing Deterministically

- It recognizes explicit document structure: top heading, `Category:`, `Goal:`, `Services`, `Required fields`, `FAQs`, and `Policies`.
- It turns those explicit sections into services, required fields, FAQs, policies, scenarios, and source-backed references.
- It selects existing deterministic templates rather than inventing new workflows.
- It preserves sourceRefs from document evidence into business facts and workflow metadata.
- It blocks deferred capabilities by omission rather than pretending AI/RAG/crawling exists.

### 3. Where AI Is Still Missing

- The system cannot robustly understand messy real-world documents without explicit headings.
- It does not infer nuanced business rules, source conflicts, tone, or complete multilingual copy.
- It does not synthesize a rich BusinessGraph from arbitrary content.
- It cannot judge whether policies, services, prices, or product claims are current or safe beyond simple deterministic patterns.
- AI provider integration would be needed for flexible extraction, ambiguity handling, better owner review questions, and high-quality workflow copy.

### 4. What Looks Product-Ready

- The architecture path is coherent: source evidence -> business understanding -> workflow plan -> strict Workflow JSON -> runtime -> channel mock.
- SourceRefs are visible enough to prove the product is evidence-oriented rather than prompt-only.
- The clinic and service lead flows are tangible and testable.
- The Telegram mock proves channel preview can remain an adapter over the same runtime.
- The one-command demo is useful for owner review and future regression checks.

### 5. What Feels Fake Or Too Simple

- Extraction depends on clean demo headings and simple bullet formats.
- FAQ support is routed through existing clinic/service templates, not a standalone FAQ workflow.
- Policies are shallowly extracted; one policy title is visibly truncated as `Cancellation requests should be made 24`.
- The FAQ runtime output shows `currentNode=done` while `ended=false`, which may confuse reviewers.
- The bot copy is generic and not yet polished, especially for Arabic.
- There is no UI, upload flow, persistence, or real owner review step.

### 6. Recommended Decision

Recommended next decision: improve deterministic extraction before adding AI extraction.

Reason: the visible path is directionally right, but the demo exposes basic deterministic gaps that are cheap to fix and will make any later AI integration easier to evaluate. Specifically, improve section parsing, policy titles, FAQ-only behavior, runtime terminal state clarity, and demo copy. After that, add AI extraction behind the same evidence/sourceRef contract. Do not simplify the architecture yet; the current boundaries still match the product direction.
