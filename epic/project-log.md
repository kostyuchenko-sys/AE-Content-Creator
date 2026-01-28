# Epic: Project Log

**Status**: draft  
**Owner**: AI + Vlad  
**Scope**: Ongoing technical log of decisions, changes, and milestones for Instories Project Builder.

---

## Tech Plan (for this epic)

### Goals

- **Single source of truth**: One place to track all major technical/product decisions and milestones.
- **Testable history**: Each log entry should be verifiable (linked to commits, branches, or artifacts when available).
- **Lightweight to maintain**: Log format must be simple enough to update on every meaningful change.

### Structure

- **Header metadata**
  - **Status**: `draft` → `active` → `on_hold` → `completed`.
  - **Owner**: who is responsible for keeping the log updated.
  - **Scope**: what this log covers.
- **Tech Plan**
  - This section (you are reading it now).
  - Must be reviewed and approved before we start using the log in a disciplined way.
- **Log entries**
  - Reverse-chronological list.
  - Each entry has:
    - **Date**
    - **Type**: `decision`, `feature`, `refactor`, `infra`, `bugfix`, `process`, etc.
    - **Summary**
    - **Details**
    - **Links**: optional references to PRs, branches, docs, or artifacts.
- **Status section**
  - Short summary of current state of the project and the log itself.

### Testable Steps

1. **Define log format**
   - [x] Create `epic/project-log.md` with:
     - [x] Metadata header.
     - [x] Tech Plan section (this one).
     - [x] Empty (or initial) `Log` section.
     - [x] Status section at the bottom.
   - [x] Link this epic from `epic/README.md`.
2. **Start using the log**
   - [ ] For each meaningful change in the project, add a new entry under `## Log`.
   - [ ] Keep entries reverse-chronological (newest first).
3. **Integrate with workflow**
   - [ ] When starting a new epic, reference relevant log entries in its Tech Plan.
   - [ ] When closing an epic, add a `decision` or `feature` entry summarizing outcomes.
4. **Review & refine**
   - [ ] After several entries are recorded, review the structure with Vlad.
   - [ ] Adjust fields (e.g., add/remove `Type` values) if needed, preserving backward compatibility.

### Example Entries

```markdown
- **2026-01-28** — **decision** — Defined project log format  
  - **Details**: Created `epic/project-log.md` with tech plan, log structure, and status section; linked from `epic/README.md`.  
  - **Links**: (optional) PR, branch, or doc links.

- **2026-02-01** — **feature** — Implemented core project scaffolding  
  - **Details**: Initialized repo, added base tooling (lint, formatter, test runner) and CI workflow.  
  - **Links**: `branch: feature/bootstrap`, `doc: /docs/architecture.md`.
```

---

## Log

*(Начни добавлять сюда записи, когда утвердишь план выше.)*

- **2026-01-28** — **decision** — Создан эпик лога проекта  
  - **Details**: Определена структура `project-log` эпика и формат записей, добавлена ссылка из `epic/README.md`.  
  - **Links**: (заполнить позже при появлении репозитория/PR).
- **2026-01-28** — **feature** — PoC и первая панель для AE Template Constructor  
  - **Details**: Реализован PoC-скрипт `ae-scripts/replace_placeholders_poc.jsx` (замена плейсхолдеров `PH*` в comp и pre-comp’ах по выделенным футажам) и создана минимальная CEP-панель `AE Content Constructor` (`extension/cep/AEContentConstructor`) с кнопкой `Build from selection`. После исправления манифеста и добавления CSInterface.js панель успешно отображается в AE. После фиксов загрузки шаблонов и встраивания JSX-кода панель полностью функциональна: загружает шаблоны из JSON, позволяет выбирать их и создаёт композиции с заменёнными плейсхолдерами.
  - **Links**: репозиторий `AE-Content-Creator`, epic `epic/ae-template-constructor.md`, `CEP_SETUP.md`.

---

## Status

- **Current status**: `draft` — план и формат определены, требуется твое подтверждение для перевода в `active` и регулярного использования.
- **Next actions**:
  - Подтвердить или скорректировать структуру записей (`Type`, поля, язык).
  - Начать фиксировать все значимые шаги в секции `Log`.

