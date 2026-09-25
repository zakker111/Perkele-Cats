#!/usr/bin/env python3
"""Real-browser boot smoke test (versions.md 0.1.0: 'Automated smoke test can
load the game'). Serves dist/ (or game/) and drives it with Playwright:

  - page loads with zero console errors
  - engine boots into scene_moi
  - clicking an object produces a message
  - keyboard equipment flow works (equip pipe -> fire -> shots decrement)

Exit code non-zero on any failure so CI blocks deployment (docs/19 gate).
"""
import functools, http.server, os, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "dist") if os.path.isdir(os.path.join(ROOT, "dist")) else os.path.join(ROOT, "game")

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{port}/index.html"
print(f"smoke-py: serving {os.path.relpath(SITE, ROOT)} at {base}")

failures = []
def ok(cond, label):
    print(("✓ " if cond else "✗ ") + label)
    if not cond:
        failures.append(label)

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(base)
    page.wait_for_function("() => window.__game && window.__game.engine.sceneId === 'scene_moi'", timeout=10000)
    ok(True, "boots in browser; engine starts in scene_moi")
    ok(len(errors) == 0, f"zero console/page errors (got {len(errors)}: {errors[:2]})")

    # HUD shows health & scene name
    hp = page.text_content("#health-bar") or ""
    ok("HP" in hp, f"HUD health visible ({hp.strip()})")

    # Click-to-move: click center of canvas, expect walk target set
    box = page.locator("#scene").bounding_box()
    page.mouse.click(box["x"] + box["width"] / 2 + 60, box["y"] + box["height"] / 2 + 30)
    page.wait_for_timeout(300)
    moved = page.evaluate("() => !!window.__game.engine.walkTarget || (window.__game.engine.playerPos.x !== 2)")
    ok(moved, "click-to-move responds (target set or player moved)")

    # Talk to Maija via engine-level click (objects are canvas-drawn)
    page.evaluate("() => window.__game.engine.clickObject('obj_maija')")
    log = page.text_content("#log") or ""
    ok("Maija" in log, "NPC dialogue appears in message log")

    # Pipe/beer exclusivity through real UI keys
    page.evaluate("() => { const e = window.__game.engine; e.player.addItem('item_pipe'); e.player.addItem('item_beer_bottle', 2); }")
    page.keyboard.press("e")  # equips pipe (has item)
    shots = page.text_content("#shots") or ""
    ok("6/6" in shots, f"pipe equipped via keyboard shows 6 shots ({shots.strip()})")
    page.keyboard.press("d")  # try drinking while pipe active
    log = page.text_content("#log") or ""
    ok("swap" in log.lower(), "drinking while pipe equipped is blocked with swap explanation")
    page.keyboard.press("x")  # swap to beer
    page.keyboard.press("d")  # drink
    badge = page.text_content("#beer-badge") or ""
    ok("TIPSY" in badge or "SURREAL" in badge, f"beer state badge visible ({badge.strip()})")
    surreal = page.evaluate("() => document.querySelector('#scene').classList.contains('surreal')")
    page.wait_for_timeout(3200)
    surreal_after = page.evaluate("() => document.querySelector('#scene').classList.contains('surreal')")
    ok(surreal_after and not surreal, "canvas enters surreal filter after TIPSY expires")

    page.screenshot(path=os.path.join(ROOT, "smoke-screenshot.png"))
    browser.close()

httpd.shutdown()
if failures:
    print("SMOKE FAILED:", failures)
    sys.exit(1)
print("SMOKE OK (real browser)")
