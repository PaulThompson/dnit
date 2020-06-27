#!/bin/bash

# an example task

cd "$( dirname "${BASH_SOURCE[0]}" )"

echo "writing msg.txt"
echo helloworld > msg.txt
