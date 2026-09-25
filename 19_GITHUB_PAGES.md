# 19 — GitHub Pages Deployment

## Goal

The production game should run as a static browser site from GitHub Pages unless the chosen engine requires a documented alternative.

## Build requirements

- deterministic production build;
- relative asset paths compatible with a repository subpath;
- no mandatory server-side runtime for the game;
- compressed assets where practical;
- clear cache/version behavior.

## Repository configuration

Configure GitHub Actions to:

1. check out the repository;
2. install the exact required runtime/dependencies;
3. validate content;
4. run tests;
5. build the production site;
6. upload the Pages artifact;
7. deploy to GitHub Pages.

## Base path

The build must support a repository subpath. Do not assume the game is always served from `/`.

## Release gate

Deployment must fail when tests or the production build fail. Do not publish a broken build just because the action reached the deployment step.

## Manual verification

After deployment, test the public page from a clean browser session. Verify assets, navigation, save data behavior, and console errors.
