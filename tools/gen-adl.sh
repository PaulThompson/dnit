#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

set -x

SCRIPT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT=$SCRIPT_DIR/..
ADLC=$SCRIPT_DIR/adlc

APP_ADL_DIR=$ROOT/adl
APP_ADL_FILES=`find $APP_ADL_DIR -iname '*.adl'`

ADL_STDLIB_DIR=`$ADLC show --adlstdlib`
ADL_STDLIB_SYS_FILES=`find ${ADL_STDLIB_DIR} -name '*.adl'`

# Generate Typescript for unit testing code
OUTPUT_DIR=$ROOT/adl-gen
$ADLC typescript \
  --searchdir $APP_ADL_DIR \
  --outputdir $OUTPUT_DIR \
  --manifest=$OUTPUT_DIR/.manifest \
  --include-rt \
  --include-resolver \
  --runtime-dir runtime \
  ${ADL_STDLIB_DIR}/sys/types.adl \
  ${APP_ADL_FILES}

cd adl-gen
ADLFILES=$(find . -type f -name '*.ts')
for file in ${ADLFILES}; do
  sed --in-place -r -e 's/import (.*) from "(.*)";/import \1 from "\2.ts";/g' ${file}
  sed --in-place -r -e "s/import (.*) from '(.*)';/import \1 from \"\2.ts\";/g" ${file}
done
