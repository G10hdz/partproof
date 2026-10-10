#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: bash scripts/agents.sh prepare mac|pop | run 1..6 | check'
}

root="$(git rev-parse --show-toplevel)"
plan='docs/superpowers/plans/2026-10-09-partproof-six-agents.md'
worktrees="${PARTPROOF_WORKTREES:-$(dirname "$root")/partproof-agents}"

case "${1:-}" in
  prepare)
    case "${2:-}" in
      mac) ids=(1 2 3) ;;
      pop) ids=(4 5 6) ;;
      *) usage; exit 2 ;;
    esac
    if [[ -n "$(git -C "$root" status --porcelain)" ]]; then
      echo 'Commit or stash the reviewed base before preparing worktrees.' >&2
      exit 1
    fi
    git -C "$root" ls-files --error-unmatch "$plan" src/contracts.ts >/dev/null
    mkdir -p "$worktrees"
    for id in "${ids[@]}"; do
      git -C "$root" worktree add -b "partproof/agent-$id" "$worktrees/agent-$id" HEAD
    done
    ;;
  run)
    case "${2:-}" in 1|2|3|4|5|6) id="$2" ;; *) usage; exit 2 ;; esac
    target="$worktrees/agent-$id"
    [[ -d "$target" ]] || { echo 'Run prepare on this machine first.' >&2; exit 1; }
    command -v opencode >/dev/null
    exec opencode run --dir "$target" -m "${PARTPROOF_MODEL:-opencode/big-pickle}" --auto \
      "Read $plan and both linked specs. Implement only Task $id in your worktree, honoring its file ownership, frozen src/contracts.ts, acceptance tests and dependency checkpoints. Do not edit other agents files or secrets. Run your tests and typecheck. Commit only owned files. If a dependency checkpoint is absent, stop and report it; never invent a stub that approves purchases. Do not launch other agents or run real payments."
    ;;
  check)
    bash -n "$root/scripts/agents.sh"
    [[ -f "$root/$plan" && -f "$root/src/contracts.ts" ]]
    echo 'Launcher syntax and handoff files: OK'
    ;;
  *) usage; exit 2 ;;
esac
