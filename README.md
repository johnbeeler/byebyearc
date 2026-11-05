# Bye Bye Arc

Arc is shutting down on December 22, 2026. This site compares the browsers that could replace it, feature by feature, against Arc.

**Live site:** https://bye-bye-arc.space.fast

## What's here

- `data/browsers.json` holds every browser, with its engine, platforms, version and price, plus 20 features and whether it looks vibe-coded. Each fact links to its source.
- `site/` is the page itself: plain HTML, CSS and JavaScript, with no build step. It draws everything from `browsers.json`, so adding a browser only takes a new entry in that file.

## Run it locally

```
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000/.

## How facts are graded

- **Features:** each is `yes`, `partial`, `no` or `unknown`. Arc's own behavior is the bar for "yes". Every "partial" says what's missing, and anything we couldn't confirm is marked "unknown" instead of guessed.
- **Vibe-coded:**
  - `confirmed`: the maker says the browser was built mostly with AI coding tools.
  - `seems`: public, checkable evidence, such as AI co-author lines on most code changes.
  - `unknown`: the code is private and there's no statement.
  - `no`: we checked and found no such evidence.

Not affiliated with The Browser Company or any browser listed.
