#!/usr/bin/env bash
set -euo pipefail
source_root="$(git rev-parse --show-toplevel)"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
mkdir -p "$test_dir/repo/scripts" "$test_dir/repo/src" "$test_dir/repo/docs/superpowers/plans" "$test_dir/bin"
cp "$source_root/scripts/agents.sh" "$test_dir/repo/scripts/"
touch "$test_dir/repo/src/contracts.ts" "$test_dir/repo/docs/superpowers/plans/2026-10-09-partproof-six-agents.md"
git -C "$test_dir/repo" init -q
git -C "$test_dir/repo" add .
git -C "$test_dir/repo" -c user.name=Test -c user.email=test@example.invalid commit -qm base
cd "$test_dir/repo"
export PARTPROOF_WORKTREES="$test_dir/worktrees"
bash scripts/agents.sh check
touch dirty
if bash scripts/agents.sh prepare mac >/dev/null 2>&1; then
  echo 'FAIL: dirty base accepted' >&2; exit 1
fi
rm dirty
bash scripts/agents.sh prepare mac >/dev/null 2>&1
bash scripts/agents.sh prepare pop >/dev/null 2>&1
for id in 1 2 3 4 5 6; do
  [[ "$(git -C "$PARTPROOF_WORKTREES/agent-$id" branch --show-current)" == "partproof/agent-$id" ]]
done
if bash scripts/agents.sh run 7 >/dev/null 2>&1; then
  echo 'FAIL: invalid agent accepted' >&2; exit 1
fi
cat > "$test_dir/bin/opencode" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == run && "$2" == --dir && "$3" == "$PARTPROOF_WORKTREES/agent-4" ]]
[[ "$4" == -m && "$5" == test/model && "$6" == --auto ]]
[[ "$7" == *'Implement only Task 4'* ]]
STUB
chmod +x "$test_dir/bin/opencode"
PATH="$test_dir/bin:$PATH" PARTPROOF_MODEL=test/model bash scripts/agents.sh run 4
echo 'PASS: dirty guard, six isolated branches, invalid id, selected agent and model'
