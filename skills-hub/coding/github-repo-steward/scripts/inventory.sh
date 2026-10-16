#!/usr/bin/env bash
# Read-only inventory of the authenticated GitHub user's repos and optional stars.
set -euo pipefail

usage() {
  echo "usage: inventory.sh [--stars] [--user LOGIN]" >&2
  exit 2
}

STARS=0
ACCOUNT_LOGIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stars) STARS=1; shift ;;
    --user) [[ $# -ge 2 && -n "$2" && "$2" != -* ]] || usage; ACCOUNT_LOGIN="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

if [[ -z "$ACCOUNT_LOGIN" ]]; then
  ACCOUNT_LOGIN=$(gh api user --jq .login)
fi

echo "# owner=$ACCOUNT_LOGIN"
echo "# repos"
printf '%s\n' "name	visibility	archived	fork	empty	pushed	stars	lang	url	description"
gh api graphql --paginate -f login="$ACCOUNT_LOGIN" -f query='
  query($login: String!, $endCursor: String) {
    repositoryOwner(login: $login) {
      repositories(first: 100, after: $endCursor, ownerAffiliations: OWNER) {
        nodes { name visibility isArchived isFork isEmpty pushedAt stargazerCount primaryLanguage { name } url description }
        pageInfo { hasNextPage endCursor }
      }
    }
  }' \
  --jq '.data.repositoryOwner.repositories.nodes[] | [
      .name,
      .visibility,
      (if .isArchived then "archived" else "active" end),
      (if .isFork then "fork" else "orig" end),
      (if .isEmpty then "empty" else "has-code" end),
      (.pushedAt // "-"),
      (.stargazerCount|tostring),
      ((.primaryLanguage.name) // "-"),
      .url,
      ((.description // "") | gsub("\t";" ") | gsub("\n";" "))
    ] | @tsv'

if [[ "$STARS" -eq 1 ]]; then
  echo
  echo "# stars"
  printf '%s\n' "starred_at	full_name	stars	lang	archived	fork	description"
  gh api --paginate -H "Accept: application/vnd.github.star+json" user/starred \
    --jq '.[] | [
        .starred_at,
        .repo.full_name,
        (.repo.stargazers_count|tostring),
        (.repo.language // "-"),
        (if .repo.archived then "archived" else "active" end),
        (if .repo.fork then "fork" else "orig" end),
        ((.repo.description // "") | gsub("\t";" ") | gsub("\n";" "))
      ] | @tsv'
fi
