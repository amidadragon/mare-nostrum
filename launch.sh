#!/bin/bash
export PATH=/opt/homebrew/bin:$PATH
cd /Users/ioio/mare-nostrum
git pull
node node_modules/.bin/electron electron.js
