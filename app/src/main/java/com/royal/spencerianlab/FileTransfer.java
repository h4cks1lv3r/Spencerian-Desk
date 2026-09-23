package com.royal.spencerianlab;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.charset.CodingErrorAction;
import java.util.Base64;

/** File transfer limits are independent of the much smaller AI image/request caps. */
final class FileTransfer {
    static final int MAX_FILE_BYTES = 40_000_000;
    static final int MAX_CHUNK_BYTES = 196_608;
    // Covers all 2,000 maximum-sized journal images plus metadata. Memory remains
    // bounded by chunk size; the file must also fit available device storage.
    static final long MAX_BACKUP_BYTES = 32L * 1024 * 1024 * 1024;
    private FileTransfer() { }

    static void decodeBase64To(String encoded, OutputStream output, int maximum) throws IOException {
        if (encoded == null || encoded.length() > ((long) maximum + 2L) / 3L * 4L)
            throw new IOException("File is too large.");
        try (InputStream input = Base64.getDecoder().wrap(new AsciiStringInputStream(encoded))) {
            copyBounded(input, output, maximum);
        }
    }
    static void copyBounded(InputStream input, OutputStream output, int maximum) throws IOException {
        copyBounded(input, output, (long) maximum);
    }
    static void copyBounded(InputStream input, OutputStream output, long maximum) throws IOException {
        byte[] buffer = new byte[8192]; int count; long total = 0;
        while ((count = input.read(buffer)) != -1) {
            if (count == 0) throw new IOException("Could not read file data.");
            if (count > maximum - total) throw new IOException("File is too large.");
            output.write(buffer, 0, count); total += count;
        }
    }
    static String readUtf8Bounded(InputStream input, int maximum) throws IOException {
        StringBuilder text = new StringBuilder(); char[] chars = new char[8192]; int count;
        // Avoid allocating a whole byte array, its copy, and a whole string for the same backup.
        Reader reader = utf8Reader(input, maximum);
        while ((count = reader.read(chars)) != -1) {
            if (count == 0) throw new IOException("Could not read backup data.");
            text.append(chars, 0, count);
        }
        return text.toString();
    }
    static Reader utf8Reader(InputStream input, long maximum) {
        return new InputStreamReader(new LimitedInputStream(input, maximum), StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT));
    }
    /** Retains decoder state across requests, so neither UTF-8 nor surrogate pairs are split. */
    static final class TextChunks implements java.io.Closeable {
        private final Reader reader;
        private int pending = -1;
        TextChunks(InputStream input, long maximum) { reader = utf8Reader(input, maximum); }
        String next() throws IOException {
            char[] chars = new char[32_768]; int count = 0;
            if (pending != -1) { chars[count++] = (char) pending; pending = -1; }
            for (;;) {
                int read = reader.read(chars, count, chars.length - count);
                if (read == -1) {
                    if (count == 0) return null;
                    if (Character.isHighSurrogate(chars[count - 1])) throw new IOException("Incomplete UTF-8 character.");
                    return new String(chars, 0, count);
                }
                // A positive-length Reader request must make progress. Do not
                // spin indefinitely on a broken document provider stream.
                if (read == 0) throw new IOException("Could not read backup data.");
                count += read;
                if (Character.isHighSurrogate(chars[count - 1])) {
                    pending = chars[--count];
                    if (count == 0) { chars[count++] = (char) pending; pending = -1; continue; }
                }
                return new String(chars, 0, count);
            }
        }
        @Override public void close() throws IOException { reader.close(); }
    }
    private static final class AsciiStringInputStream extends InputStream {
        private final String value; private int offset;
        AsciiStringInputStream(String value) { this.value = value; }
        @Override public int read() throws IOException {
            if (offset == value.length()) return -1;
            char c = value.charAt(offset++);
            if (c > 127) throw new IOException("Invalid base64 data.");
            return c;
        }
        @Override public int read(byte[] buffer, int position, int length) throws IOException {
            if (length == 0) return 0;
            if (offset == value.length()) return -1;
            int available = Math.min(length, value.length() - offset);
            for (int i = 0; i < available; i++) {
                char c = value.charAt(offset++);
                if (c > 127) throw new IOException("Invalid base64 data.");
                buffer[position + i] = (byte)c;
            }
            return available;
        }
    }
    private static final class LimitedInputStream extends InputStream {
        private final InputStream input; private final long maximum; private long count;
        LimitedInputStream(InputStream input, long maximum) { this.input = input; this.maximum = maximum; }
        @Override public int read() throws IOException {
            int result = input.read();
            if (result != -1 && ++count > maximum) throw new IOException("File is too large.");
            return result;
        }
        @Override public void close() throws IOException { input.close(); }
        @Override public int read(byte[] buffer, int position, int length) throws IOException {
            int result = input.read(buffer, position, length);
            if (result > maximum - count) throw new IOException("File is too large.");
            if (result > 0) count += result;
            return result;
        }
    }
}
