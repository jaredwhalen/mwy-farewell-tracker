message="${1:-Update!}"

git pull

cat concerts.csv | python -c 'import csv, json, sys; print(json.dumps([dict(r) for r in csv.DictReader(sys.stdin)]))' > src/data/concerts.json
npm run build

git add .
git status
git commit -m "$message"
git push origin main

# Commit and push the changes
git add .
git commit -m "gh-pages commit"
git push origin gh-pages

# Deploy the code with the gh-pages module
node ./gh-pages.js
