#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
mkdir -p "$PROJECT_DIR/build/native-tests"
java com.sun.tools.javac.Main --release 8 -encoding UTF-8 -d "$PROJECT_DIR/build/native-tests" "$PROJECT_DIR/app/src/main/java/com/royal/spencerianlab/FileTransfer.java" "$PROJECT_DIR/tests/native/FileTransferTest.java"
java -Xmx32m -classpath "$PROJECT_DIR/build/native-tests" com.royal.spencerianlab.FileTransferTest
