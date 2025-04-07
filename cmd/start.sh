#!/bin/bash
set -e

# project root
DIR=/Users/clovu/projects/i/fetch-mini-app-test
IS_CLONE=0

if [ ! -d $DIR ];then
  git clone git@github.com:clovu/fetch-mini-app.git $DIR
  IS_CLONE=1 # mark as clone, so it won't pull again
fi

# Ensure we are in the correct directory
cd $DIR

# Configure temporary user information (required step)
export GIT_AUTHOR_NAME="GitHub Actions"
export GIT_AUTHOR_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
# export XIAOTIE_TOKEN=
# export GIT_TOKEN=

if [ $IS_CLONE -eq 0]; then
  git pull git@github.com:clovu/fetch-mini-app.git main
fi

# It must use Bun
bun install
bun --bun run dev

git add data
git commit -m "chore: fetch data"
git push https://$GIT_TOKEN@github.com/clovu/fetch-mini-app.git main
