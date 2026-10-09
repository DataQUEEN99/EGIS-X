# AEGIS-X Threat Model & Safety Architecture

## 1. Threat Boundary Overview

AEGIS-X manages automated cloud reliability diagnosis and autonomous remediation. Because autonomous recovery engines possess execution capabilities (e.g. service restart, pod scaling, rollback), security boundaries must strictly isolate the AI model from raw system shell execution.

```
[ Telemetry & AI Model ] ---> ( Diagnostic Output ) ---> [ Safe Remediation Engine ]
                                                                 |
                                                     Policy Preconditions Check
                                                                 |
                                                       Risk Classification
                                                                 |
                                                +----------------+----------------+
                                                |                                 |
                                          (LOW Risk)                        (HIGH Risk)
                                                |                                 |
                                         [ Auto-Approve ]                [ Human Approval Gate ]
                                                |                                 |
                                                +----------------+----------------+
                                                                 |
                                                       [ Sandbox Execution ]
                                                       (Dry-Run Default)
```

## 2. Security Principles & Controls

1. **No Model Shell Execution**: The AI diagnosis engine never executes arbitrary shell scripts. All remediation actions are limited to a predefined allowlist (`RESTART_SERVICE`, `SCALE_SERVICE`, `ROLLBACK_DEPLOYMENT`).
2. **Dry-Run by Default**: Autonomous remediation operates in dry-run mode by default unless explicitly configured otherwise.
3. **Human-in-the-Loop Approval Gate**: High-risk actions (e.g. deployment rollbacks or primary database operations) require explicit operator approval.
4. **Least Privilege & Preconditions**: Precondition policies enforce safe bounds (e.g., maximum replica limits, blast radius restrictions).
5. **Secret Isolation**: Secrets, credentials, and API keys are loaded via environment variables and never logged or exposed via endpoints.
