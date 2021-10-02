#!/bin/bash

echo "Change to working directory"
cd /Users/BenRombaut/dev/goodreads_translator_to_firebase;

echo "Activate py env"
source env/bin/activate;

echo "Running goodreads_translator.py"
python goodreads_translator.py;

echo "Syncing with F3"
/usr/local/bin/node build/index.js;
# npm run start;
