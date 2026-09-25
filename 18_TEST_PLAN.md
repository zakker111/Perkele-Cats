# 18 — Test Plan

## Test layers

### Unit tests

Test pure rules: health, inventory, equipment, pipe shots, beer state transitions, puzzle transitions, hazard cooldowns, save serialization.

### Integration tests

Test flows across systems: equip beer -> drink -> surreal -> recover; equip pipe -> fire six times -> empty; obtain bread -> consume -> health capped; solve puzzle -> unlock exit.

### Browser smoke test

Verify:

1. page loads;
2. scene renders;
3. player can click to move;
4. interaction works;
5. inventory opens;
6. equipment swaps;
7. pipe action works;
8. beer action works;
9. one puzzle completes;
10. save/load works.

## Regression cases

Always test the unusual equipment rule because it is easy to break:

- pipe equipped + click drink = blocked with explanation;
- swap to beer + click drink = allowed;
- swap back to pipe during surreal state = allowed unless encounter data says otherwise.

## Hazard tests

Ensure one intended cat/hammer hit causes one intended damage event and cooldowns prevent frame-by-frame damage spam.

## Content validation

Run content-reference validation before production builds.

## Definition of test success

A build is not release-ready if the core vertical slice cannot be completed from a fresh state in a normal browser.
