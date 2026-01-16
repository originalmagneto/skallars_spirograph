---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Skallars Brand Guidelines (STRICT)

All frontend implementations MUST adhere to these brand tokens:

### 1. Typography
- **Primary Font**: `General Sans` (Variable). Do NOT use any other font (e.g., Inter, Roboto, Bricolage) unless explicitly requested for a specific localized exception.
- **Weights**: Use a range of weights from the variable font to create hierarchy.
- **Implementation**: Ensure `GeneralSans-Variable.woff2` is loaded.

### 2. Color Palette
- **Brand Indigo (Primary)**: `#210059` (Deep, serious, elite). Use for backgrounds, primary text, and strong branding elements.
- **Brand Lime (Accent)**: `#91CF17` (Innovative, expressive, rebel). Use for calls-to-action, highlights, and active states.
- **Text**: `#09060E` (Near black) for body text on light backgrounds.
- **Secondary**: `#5E00FF` (Bright Purple) - usage limited to specific illustrative accents.

### 3. Usage Rules
- **Logo**: Use the Primary (Indigo) or Stacked/Emblem versions.
- **Tone**: "Serious, Elite" mixed with "Innovative, Rebel".
- **Visuals**: Use the spirograph patterns (`Illo.svg` style) as background elements or subtle textures.

### 4. Code Implementation
- Use CSS Variables:
  - `--brand-indigo`: `262 100% 17%` (approx matches #210059)
  - `--brand-accent`: `79 79% 45%` (approx matches #91CF17)
- Tailwind: Use `bg-primary` (mapped to Indigo) and `text-accent` (mapped to Lime) for consistency.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.