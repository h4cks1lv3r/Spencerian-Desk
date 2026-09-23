#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
SPENCERIAN_SDK=${1:-${ANDROID_SDK_ROOT:-}}
if [ -z "$SPENCERIAN_SDK" ]; then echo "Provide the Android SDK path as argument 1."; exit 2; fi
mkdir -p "$PROJECT_DIR/build/native-tests"
java com.sun.tools.javac.Main --release 8 -encoding UTF-8 -classpath "$SPENCERIAN_SDK/platforms/android-36/android.jar" -d "$PROJECT_DIR/build/native-tests" "$PROJECT_DIR/app/src/main/java/com/royal/spencerianlab/AiClient.java" "$PROJECT_DIR/app/src/main/java/com/royal/spencerianlab/SecureProviderStore.java" "$PROJECT_DIR/app/src/main/java/com/royal/spencerianlab/FileTransfer.java" "$PROJECT_DIR/tests/native/NativeSafetyTest.java"
java -classpath "$PROJECT_DIR/build/native-tests:$SPENCERIAN_SDK/platforms/android-36/android.jar" com.royal.spencerianlab.NativeSafetyTest
