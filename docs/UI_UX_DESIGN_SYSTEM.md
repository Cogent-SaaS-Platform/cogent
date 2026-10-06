# Cogent UI/UX Design System & Spatial Architecture

> **Reference & Inspiration:** Zango AI Platform Architecture  
> **Core Tenet:** *Progressive Drill-Down, Contextual Split Panes, and Unbroken Spatial Continuity*  
> **Rule of Thumb:** *"Never throw the user onto a disconnected page when a contextual inspector, split pane, or progressive disclosure maintains spatial awareness."*

---

## 1. Visual & UX Deconstruction of the Reference Model

The Zango AI platform overview demonstrates an enterprise-grade compliance interface tailored for high-stakes regulatory decision-making. Rather than treating compliance as disconnected form submissions and isolated result pages, it implements a **spatial information architecture**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB LINEAGE: Horizon Scanning > FCA 2024/18 > Securitisation Rules > Obligation │
├────────────┬───────────────────────────────────────────┬───────────────────────────────┤
│ PERSISTENT │ MASTER WORKSPACE / DRILL-DOWN SURFACE     │ CONTEXTUAL SIDE-SHEET         │
│ SIDEBAR    │                                           │ INSPECTOR                     │
│            │ • Level 1: Summary Bar / Coverage Metric  │ • Live Metadata & Attributes  │
│ • Shield   │ • Level 2: Categorized Hierarchical Tree  │ • Synchronized Source Gazette │
│ • Radar    │ • Level 3: Master Obligation / Copy List  │ • Audit Trail & Comments      │
│ • Matrix   │ • Level 4: Split-View Diff / Criteria     │ • Actions & CCO Sign-Off      │
│ • Library  │                                           │ • Statutory Penalty Provenance│
└────────────┴───────────────────────────────────────────┴───────────────────────────────┘
```

### Key Architectural Strengths Identified
1. **Spatial Continuity (Zero Disorienting Bounces):**
   - The user never loses their bearing. Navigation occurs through smooth drill-downs, tabbed pivots, and in-place expansion.
   - Breadcrumb trails (e.g. `Regulation Library > Regulatory Instrument List > FCA 2024/18 > Obligation Details`) show exact provenance lineage at all times.
2. **Contextual Split Panes & Synchronized Source Proof:**
   - In Zango, clicking an obligation slides open a contextual pane showing the exact legal text side-by-side with the assessment criteria.
   - For Cogent: We pair the original draft copy directly with the **Verified Compliant Rewrite** and synchronize flagged violation spans with the **Official Nigerian Gazette Clauses** (ARCON Code 2022, CBN CPF 2019, FCCPC Guidelines).
3. **Multi-Layer Progressive Disclosure:**
   - **Layer 1 (The Verdict Strip):** At-a-glance health score, verdict chip, and deterministic financial exposure.
   - **Layer 2 (The Master Comparison Canvas):** Interactive original text with clickable violation markers next to the compliant rewrite.
   - **Layer 3 (Hierarchical Findings Tree):** Grouped by regulator (ARCON, CBN, FCCPC, SEC) and severity.
   - **Layer 4 (The Contextual Side-Sheet Inspector):** Deep-dive analysis of a single finding with statutory citations, verbatim legal text, penalty calculation provenance, and remediation actions.
   - **Layer 5 (Governance & Human Sign-off):** CCO attestation seal and audit ledger.
4. **Master-Detail with Persistent Context:**
   - Clicking a finding card or hovering over a flagged excerpt in the text does not take the user to a new route; it pins or opens the Inspector on the right, keeping both the source copy and the legal citation visible simultaneously.

---

## 2. Cogent's Elevation: How We Improve on the Reference Model

While the reference model excels at traditional GRC (Governance, Risk, Compliance) record keeping, Cogent addresses **fast-paced, high-risk Nigerian financial workflows**. We improve on the reference model in five critical dimensions:

| Dimension | Reference Architecture | Cogent Elevation |
| :--- | :--- | :--- |
| **Financial Exposure** | Generic qualitative risk tags (`Actionable`, `Informative`). | **Deterministic Naira Penalty Exposure Banner** (`₦11,500,000`) calculated deterministically from verified statutory schedules. |
| **Active Remediation** | Static criteria checkboxes (`Met` / `Not Met`). | **Instant Compliant AI Copy Rewrite** with inline diff tags, character/word counters, and SMS part calculators. |
| **Split-Pane Interactivity** | Static split views. | **Bi-Directional Interactive Highlighting**: Hovering an excerpt in the copy highlights the card; clicking a card highlights the text span and scrolls smoothly. |
| **Regulator Domain Fidelity** | Generic international frameworks. | **Dedicated Nigerian Regulatory Corpus**: Built-in support for CBN, ARCON, SEC, FCCPC, NDPC, NFIU with Gazette article references. |
| **Aesthetic Atmosphere** | Light enterprise SaaS gray. | **Elevated Institutional Dark Mode**: Midnight Slate (`#090D16`), emerald compliance glows, crimson statutory alert rings, and frosted glassmorphism (`backdrop-blur-xl`). |

---

## 3. Pillar 1: Marketing Shield Spatial Layout Specification

The Marketing Pre-Vetting Shield interface is structured into three coordinated spatial zones:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAR: Campaign Title | Channel Pill | ARCON ASP Status | Real-Time Telemetry & Hash         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 1: VERDICT BANNER & DETERMINISTIC EXPOSURE (Evidence-bounded chip + Risk Gauge + ₦ Exposure)     │
├───────────────────────────────────────────────────────────────────┬────────────────────────────────────┤
│ MAIN WORK SURFACE (Left / Center - 62% width)                     │ CONTEXTUAL SIDE INSPECTOR          │
│                                                                   │ (Right - 38% width)                │
│ ┌───────────────────────────────────────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ TAB 1: SPLIT-VIEW AUDIT (Original Copy vs Compliant Rewrite)  │ │ │ DYNAMIC INSPECTOR PANE         │ │
│ │ • Left: Copy with interactive red/amber highlighted spans     │ │ │ • Header: Rule Code & Regulator│ │
│ │ • Right: Verified Compliant Rewrite with 1-click copy & diff  │ │ │ • Statutory Gazette Citation   │ │
│ └───────────────────────────────────────────────────────────────┘ │ │ • Statutory Penalty Schedule   │ │
│                                                                   │ │ • "Why It Matters" Counsel Note │ │
│ ┌───────────────────────────────────────────────────────────────┐ │ │ • Mandatory Disclosure Formula │ │
│ │ TAB 2: FINDINGS FEED (Categorized by Regulator & Severity)    │ │ │ • Remediation Checklist Item   │ │
│ │ • ARCON Findings (e.g. Unregistered claim)                    │ │ └────────────────────────────────┘ │
│ │ • CBN CPF Findings (e.g. Missing APR disclosure)              │ │ ┌────────────────────────────────┐ │
│ │ • FCCPC Findings (e.g. "No credit check" violation)           │ │ │ LEVEL 6: CCO GOVERNANCE SEAL   │ │
│ └───────────────────────────────────────────────────────────────┘ │ │ • Status: PENDING_REVIEW       │ │
│                                                                   │ │ • Attestation Signature Box    │ │
│ ┌───────────────────────────────────────────────────────────────┐ │ │ • Authorize & Sign-off Button  │ │
│ │ TAB 3: ACTION REMEDIATION PLAN (Owner, Priority, Deadlines)   │ │ │ • SHA-256 Audit Seal Stamp     │ │
│ └───────────────────────────────────────────────────────────────┘ │ └────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Interaction & Motion Guidelines

1. **Side Sheet Inspector Behavior:**
   - When no specific finding is selected, the Right Inspector displays the **Executive Compliance Briefing** and **Aggregate Penalty Schedule**.
   - When the user clicks ANY highlighted violation in the text or ANY card in the findings list, the Inspector smoothly transitions to the **Statutory Clause Deep-Dive** for that exact finding without page reload.
   - A sticky "Close Inspector" or "Reset to Overview" button allows instant return to the overall brief.
2. **Bi-Directional Highlighting:**
   - Hovering over a flagged term in the original copy emits a visual accent ring around the corresponding item in the findings list and updates the Inspector.
   - Hovering over a finding card pulses the corresponding text span in the original copy.
3. **Tabs with Preserved State:**
   - Tabs (`Split-View Audit`, `Detailed Findings Tree`, `Remediation Action Plan`) switch immediately with zero lag and maintain scroll position.
4. **CCO Governance Drawer / Slide-Over:**
   - Formal sign-off is accessible directly in the right inspector or via an expandable modal drawer for full-screen dossier export.
