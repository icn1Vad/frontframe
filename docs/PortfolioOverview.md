# ProofSpace frontend portfolio overview

ProofSpace explores a review workflow in which an AI finding can be inspected against its source and carried through human review. The full product spans web interaction, business services, and agent execution; this repository is its public frontend snapshot.

## Contribution and context

Kaifeng Yan contributes product-flow design, interactive frontend demonstrations, React / Next.js development, and cross-service integration within the team. The public case study describes task lists, asynchronous feedback, evidence positioning, and product demonstrations without exposing customer documents or private service code.

## What to review

1. Module registration and the persistent application shell.
2. Typed domain identifiers, state transitions, and feature-specific ports.
3. Task-list pagination and reusable asynchronous table behavior.
4. The separation between mock behavior and HTTP integration contracts.

## Public snapshot versus complete deployment

Mock adapters make the interface inspectable without the private backend. A working mock interaction is not evidence of production authorization, persistence, or successful private deployment. The architecture document identifies remaining integration work.

See [FrontendArchitecture.md](FrontendArchitecture.md), [BackendApiContract.md](BackendApiContract.md), and [the public project case](https://icn1vad.github.io/projects/proofspace/).
