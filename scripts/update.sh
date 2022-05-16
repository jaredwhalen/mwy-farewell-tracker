message="${1:-Update!}"

git pull

npm run build

git config --global user.email "jared.m.whalen@gmail.com"
git config --global user.name "jaredwhalen"

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
