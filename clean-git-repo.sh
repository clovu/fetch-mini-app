cp -r . ../fetch-mini-app-backup
rm .git
git init
git branch -m main
git add .
git commit -m "Initial clean commit"
git remote add origin git@github.com:clovu/fetch-mini-app.git
git push -f origin main
rm ../fetch-mini-app-backup
