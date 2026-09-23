package com.royal.spencerianlab;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** File transfer limits are independent of the much smaller AI image/request caps. */
final class FileTransfer {
    static final int MAX_FILE_BYTES = 40_000_000;
    private FileTransfer() { }

    static void decodeBase64To(String encoded, OutputStream output, int maximum) throws IOException {
        if (encoded == null || encoded.length() > ((long) maximum + 2L) / 3L * 4L)
            throw new IOException("File is too large.");
        try (InputStream input = Base64.getDecoder().wrap(new AsciiStringInputStream(encoded))) {
            copyBounded(input, output, maximum);
        }
    }
    static void copyBounded(InputStream input, OutputStream output, int maximum) throws IOException {
        byte[] buffer = new byte[8192]; int count, total = 0;
        while ((count = input.read(buffer)) != -1) {
            if (count > maximum - total) throw new IOException("File is too large.");
            output.write(buffer, 0, count); total += count;
        }
    }
    static String readUtf8Bounded(InputStream input, int maximum) throws IOException {
        StringBuilder text = new StringBuilder(); char[] chars = new char[8192]; int count;
        // Avoid allocating a whole byte array, its copy, and a whole string for the same backup.
        Reader reader = new InputStreamReader(new LimitedInputStream(input, maximum), StandardCharsets.UTF_8);
        while ((count = reader.read(chars)) != -1) text.append(chars, 0, count);
        return text.toString();
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
        private final InputStream input; private final int maximum; private int count;
        LimitedInputStream(InputStream input, int maximum) { this.input = input; this.maximum = maximum; }
        @Override public int read() throws IOException {
            int result = input.read();
            if (result != -1 && ++count > maximum) throw new IOException("File is too large.");
            return result;
        }
        @Override public int read(byte[] buffer, int position, int length) throws IOException {
            int result = input.read(buffer, position, length);
            if (result > maximum - count) throw new IOException("File is too large.");
            if (result > 0) count += result;
            return result;
        }
    }
}
