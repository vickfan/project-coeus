#!/bin/sh

# 確保 logs 緩衝目錄存在
mkdir -p notes/conversation notes/raw-notes

# 初始化一個乾淨嘅本地 Repo 
git init

# 🌟 啟動 Git 稀疏檢索 (Sparse-Checkout)
git config core.sparseCheckout true

# 設定白名單：Hetzner 淨係需要追蹤同同步呢幾個路徑
echo 'notes/conversation/' >> .git/info/sparse-checkout
echo 'notes/raw-notes/' >> .git/info/sparse-checkout
echo 'src/' >> .git/info/sparse-checkout

# 綁定你的 Private Repo（利用環境變數傳入的 COEUS_NOTES_TOKEN）
git remote add origin "https://${COEUS_NOTES_TOKEN}@github.com/${COEUS_USERNAME}/${COEUS_NOTES_REPO}.git"

# 首次拉取：這時 permanent-cards/ 會被徹底無視並隔絕
git pull origin main

# 啟動 Node.js TG Bot
exec node src/tg-bot.mjs