#!/bin/sh

mkdir -p /app/notes/raw-notes

exec node src/telegramBot.mjs
