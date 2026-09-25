# 25 — Definition of Done

A feature is done only when all applicable conditions are true.

## Gameplay

- behavior matches the relevant design document;
- player feedback is visible/readable;
- invalid actions are handled clearly;
- no accidental soft lock was introduced.

## Code

- implementation uses existing architecture where possible;
- state transitions are explicit;
- no unexplained duplicated logic;
- errors are diagnosable;
- content is data-driven where practical.

## Tests

- new rules have tests;
- relevant regression tests pass;
- browser smoke flow passes for major systems.

## Content

- ids are unique;
- references resolve;
- dialogue and item text are readable;
- jokes do not replace essential instructions.

## Accessibility

- subtitles/text remain available;
- reduced motion still works;
- critical information is not color-only;
- surreal effects do not prevent puzzle completion.

## Release

- production build succeeds;
- GitHub Pages path works;
- save version is understood;
- documentation matches implementation.
