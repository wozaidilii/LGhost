#!/usr/bin/env bash
# 本番 Neon へ schema / seed（.env.neon を使用）
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.neon"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE がありません。Neon 接続文字列を設定してください。"
  exit 1
fi

CMD=${1:-push}
case "$CMD" in
  push)
    echo "→ Neon db push..."
    npx dotenv -e "$ENV_FILE" -- npx prisma db push
    ;;
  seed)
    echo "→ Neon seed..."
    npx dotenv -e "$ENV_FILE" -- npm run db:seed
    ;;
  *)
    echo "Usage: $0 [push|seed]"
    exit 1
    ;;
esac
echo "✓ 完了"
