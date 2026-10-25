# Nutrition Tracker

A small phone-friendly web app for logging food against an **exchange-based meal plan**
(servings of carbs, protein, fat and veggies per meal) instead of counting calories.

- **Today**: progress for each food group, a checklist (training day, vitamin D3, creatine), water, and the four meals with their targets
- **Add food**: pick from the exchange library, type in a nutrition label (it converts grams to exchanges), or enter servings directly
- **History**: the last 14 days compared to target, plus averages
- **Settings**: edit servings per meal, the water and calorie goals, and back up or restore your data

Label math the app uses: **15 g carbs = 1 carb · 7 g protein = 1 protein · 5 g fat = 1 fat** (fiber is subtracted from carbs).

## Privacy

There is no server and no account. Your log is saved in your browser's `localStorage`
on that device only, so nothing you eat is ever pushed to this repo. To move your data
between devices, use **Settings → Export backup** and then **Import backup**.

## Use it on your phone

1. Open the GitHub Pages URL (see the repo's **About** box) in Safari (iPhone) or Chrome (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen / Install app**.
3. It opens full screen like an app and works offline after the first visit.

## Run it locally

Requires [Node.js](https://nodejs.org). No install step and no dependencies.

```bash
node scripts/serve.js
```

Then open http://localhost:8080.

## Project layout

| File | What it does |
|---|---|
| `index.html` | Page shell: header, tab bar, add-food sheet |
| `app.js` | All app logic: storage, totals, rendering, events |
| `foods.js` | Food exchange library (edit this to add foods) |
| `styles.css` | Styling, including dark mode |
| `sw.js` | Service worker for offline use |
| `manifest.webmanifest` | Home-screen app name, icon and colors |
| `scripts/make-icons.js` | Regenerates the PNG icons from code |
| `scripts/serve.js` | Local dev server |

## Making changes (the PR workflow)

`main` is what's live: every merge to `main` redeploys GitHub Pages within a minute or two.

```bash
git switch main && git pull                 # start from the latest
git switch -c feature/short-description     # make a branch
# ...edit files, test with node scripts/serve.js...
git add -A && git commit -m "Describe the change"
git push -u origin HEAD
gh pr create --fill                         # open the pull request
```

Review the PR on GitHub (Files changed tab), then **Merge**, and delete the branch.
After a merge, run `git switch main && git pull` locally.

> If you change the list of files the app loads, bump `CACHE` in `sw.js` so phones pick up the new files.
