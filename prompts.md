# Article Generator Prompts

This document outlines how the **AI Lab** settings in Skallars Spirograph are transformed into the final prompt sent to the Gemini API.

## Core Prompt Structure

The prompt is constructed dynamically in `src/lib/aiService.ts` (`getAIArticlePrompt`). It consists of a **System Identity**, **Configuration Block**, **Style/Tone Guidelines**, and **Output Instructions**.

### 1. System Identity
Every request starts with this elite persona definition:
> You are an elite expert writer for SKALLARS Law, a boutique legal practice of attorneys and legal consultants. Your task is to write a world-class legal article that demonstrates deep expertise and strategic value.

### 2. Configuration Block
This section injects your specific inputs:

-   **Topic**: `[User Input]`
-   **Type**: `[Article Type]` (e.g., Deep Dive, News)
-   **Target Length**: `[Length]` + `[Word Count Guide]`
    -   *Example*: "Report (Target ~2500 words. Keep within ±10%...)"
-   **Research Depth**:
    -   *Deep*: "Deep. Use Google Search grounding when available to verify claims and include citations."
    -   *Quick*: "Quick. Use only the provided links and prior knowledge; do not fabricate sources."
-   **Tone**: `[Tone Label]`

### 3. Dynamic Context Injection

The prompt conditionally includes these blocks if data is present:

#### A. Research Sources (User provided links)
> **### RESEARCH SOURCES**
> CRITICAL: Analyze and synthesize the following sources to enrich the article. You MUST cite specific facts/figures from these sources where possible.
> [Link 1]
> [Link 2]...

#### B. Research Brief (Pre-generated)
> **### RESEARCH BRIEF (PRE-COMPILED)**
> Use the following research notes and sources. Do NOT invent new sources; cite from these notes.
> [Summary, Key Points, Facts, etc.]

#### C. Approved Outline
> **### APPROVED OUTLINE**
> Use this outline exactly. Do not add or remove sections unless strictly necessary.
> [H2 Section 1...]

---

## Variable Components

The settings you choose in the UI map to specific instruction blocks.

### Style Guides (`Article Type`)
Changing the **Article Type** injects a specific style recipe:

| Type | Structure Instruction | Tone Instruction |
| :--- | :--- | :--- |
| **Deep Dive** | Comprehensive analysis. Intro -> Background -> Key Issues -> Analysis -> Implications -> Conclusion. | Authoritative, analytical, thought-provoking. |
| **News** | Inverted Pyramid. Lead (Who/What/When) -> Key Details -> Context -> Implementation. | Objective, factual, concise, urgent. |
| **Trends** | Current State -> The Shift -> Evidence/Data -> Future Outlook. | Forward-looking, speculative but grounded, exciting. |
| **Law** | Formal legal brief. Issue -> Legislation -> Analysis -> Application -> Risks. | Precise, formal, guarded but clear. |
| **Tax** | Situation -> Tax Implications -> Calculations -> Recommendations. | Practical, advisory, detailed. |
| **Regulatory** | Regulation -> Scope -> Requirements -> Timeline -> Action Plan. | Clear, precise, compliance-first. |

### Tone Guides (`Tone / Voice`)
Changing the **Tone** injects specific vocabulary and phrasing rules:

| Tone | Instruction |
| :--- | :--- |
| **Client-Friendly** | Clear, approachable, and confidence-building. Avoid legalese unless essential. |
| **Legal Memo** | Formal, precise, and risk-aware. Use structured reasoning and cite applicable rules. |
| **Executive** | Strategic, high-level, and decision-oriented. Focus on implications, not minutiae. |
| **News Brief** | Concise, factual, and timely. Emphasize what happened and why it matters now. |
| **Neutral** | Balanced and objective. Avoid strong opinions or marketing language. |

*Note: You can override these with "Custom Tone Instructions" in the UI.*

### Length Guides
The **Target Length** slider controls the word count guidance:

-   **Short**: "Focus on brevity (300-500 words). Stick to the core message. No fluff."
-   **Medium**: "Standard depth (700-900 words). Balanced capability and detail."
-   **Large**: "Extensive coverage (1200w+). Include historical context..."
-   **Report**: "Maximum depth (2500 words+). Whitepaper quality. Executive summary + Detailed Chapters..."
-   **Custom**: "Target ~[N] words. Keep within ±10% unless the topic clearly requires more."

---

## Writing Rules (Hardcoded)

Regardless of settings, these rules are always enforced to ensure consistent quality:

1.  **Professionalism**: Business-grade language. No generic AI phrases.
2.  **Value**: Every paragraph must add value. No filler.
3.  **Multilingual**: Generate all selected languages (SK, EN, DE, CN) simultaneously.
4.  **Formatting**:
    -   **HTML Only**: No markdown.
    -   **Rich Structure**: Use `<h2>` for sections, `<h3>` for subsections.
    -   **Skimmability**: Use `<ul>` lists and `<strong>` bold terms (2-3 per paragraph).
    -   **Quotes**: One `<blockquote>` every major section.
5.  **Citations**: Use inline citations `[1]` and a `Sources & References` section.

## Output Format

The model is instructed to strictly return a **JSON object**:

```json
{
  "title_en": "Title (EN)",
  "excerpt_en": "Summary (EN)",
  "content_en": "HTML string (EN)",
  "meta_title_en": "SEO Title...",
  "meta_description_en": "SEO Desc...",
  ... (repeated for other languages) ...
  "sources": [{"title": "...", "url": "..."}],
  "tags": ["tag1", "tag2"]
}
```

## Dynamic Model Adjustments

The system automatically detects the selected Gemini model variant (e.g., Flash, Pro, 3.0) and tunes the parameters and prompt instruction.

### Parameter Tuning

| Model Family | Temperature | TopP | Max Tokens | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Flash** (Standard) | 0.7 | 0.95 | 8192 | Balanced creativity and speed. |
| **Pro / Ultra** | 0.4 | 0.95 | 16384 | Lower temperature for precision and adherence to complex logic. |
| **Gemini 3.0** | 0.3 | 0.95 | 32768 | Very low temperature to prevent hallucination; high token limit for massive context. |

### Prompt Injection

For advanced models (**Pro**, **Ultra**, **Gemini 3.0**), an additional system instruction is prepended to the prompt to leverage their reasoning capabilities:

> Deploy your advanced reasoning capabilities to ensure maximum depth, nuance, and logical coherence.

### Thinking Models
If a **Thinking** model (e.g., `gemini-2.0-flash-thinking`) is detected, the `thinking_config` is automatically enabled, allowing the model to "think" before generating the JSON response.

### Gemini 3 Integration (Thinking Level)

For **Gemini 3** models (e.g., `gemini-3-flash-preview`), the system automatically switches from the legacy `thinking_budget` to the new **Thinking Level** parameter:
-   **Default**: `high` (Maximum reasoning depth).
-   **Structure**: `{ thinking_config: { thinking_level: "high" } }`.
This usage replaces the token budget system for cleaner, more predictable reasoning behavior.
