FROM node:18-alpine

# 安裝基本 Git 與 OpenSSH 
RUN apk add --no-cache git openssh-client

WORKDIR /app

# 先複製 Package 檔案並安裝依賴
COPY package*.json ./
RUN npm ci

# 複製其餘 Source Code 與啟動腳本
COPY src/ ./src
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]