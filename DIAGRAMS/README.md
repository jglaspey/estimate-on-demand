# Diagrams Overview

This folder contains diagrams (as code) describing the EOD system. All diagrams use Mermaid so they render in most IDEs and docs sites.

Files:
- `C4-Context.md` – System context (Level 1)
- `C4-Container-current.md` – Container view for the current in-repo implementation
- `C4-Container-production.md` – Container view for planned Railway deployment (web + worker + Redis)
- `C4-Component-backend.md` – Backend components and interactions
- `sequence-upload-to-review.md` – End-to-end upload → extraction → analysis → review flow
- `ERD.md` – Database entity-relationship diagram (based on `prisma/schema.prisma`)
- `state-job.md` – Job lifecycle state machine
- `state-document.md` – Document lifecycle state machine

Tips:
- Keep these alongside code and update in PRs.
- Use the container vs production views according to environment.


