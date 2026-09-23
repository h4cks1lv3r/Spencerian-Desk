package com.royal.spencerianlab;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

/** Runs with a 32 MiB heap: aggregate transfer must never allocate the whole backup. */
public final class FileTransferTest {
    private static int checks;
    private static void expect(boolean value, String message) {
        checks++;
        if (!value) throw new AssertionError(message);
    }
    private static final class RepeatingInput extends InputStream {
        private long remaining;
        boolean closed;
        RepeatingInput(long count) { remaining = count; }
        public int read() { if (remaining == 0) return -1; remaining--; return 'x'; }
        public int read(byte[] bytes, int offset, int length) {
            if (remaining == 0) return -1;
            int count = (int)Math.min(remaining, length);
            Arrays.fill(bytes, offset, offset + count, (byte)'x'); remaining -= count; return count;
        }
        public void close() { closed = true; }
    }
    private static final class CountingOutput extends OutputStream {
        long count;
        public void write(int value) { count++; }
        public void write(byte[] value, int offset, int length) { count += length; }
    }
    public static void main(String[] args) throws Exception {
        long large = 50_000_001L;
        CountingOutput output = new CountingOutput();
        FileTransfer.copyBounded(new RepeatingInput(large), output, FileTransfer.MAX_BACKUP_BYTES);
        expect(output.count == large, "Backup copy must stream more than the legacy 40 MB limit on a small heap");
        CountingOutput beyondInt = new CountingOutput();
        long beyondIntBytes = (long)Integer.MAX_VALUE + 9L;
        FileTransfer.copyBounded(new RepeatingInput(beyondIntBytes), beyondInt, FileTransfer.MAX_BACKUP_BYTES);
        expect(beyondInt.count == beyondIntBytes, "Aggregate transfer counters must not overflow at 2 GiB");
        expect(FileTransfer.MAX_BACKUP_BYTES > 24_000_000_000L, "Streaming limit must cover all 2,000 maximum-sized journal images");
        CountingOutput limited = new CountingOutput(); boolean rejected = false;
        try { FileTransfer.copyBounded(new RepeatingInput(9000), limited, 8999L); }
        catch (IOException expected) { rejected = true; }
        expect(rejected && limited.count <= 8999, "Long byte limits must reject before writing the excess block");
        boolean stalled = false;
        try { FileTransfer.copyBounded(new InputStream() {
            @Override public int read() { return 0; }
            @Override public int read(byte[] buffer, int offset, int length) { return 0; }
        }, new CountingOutput(), 100L); }
        catch (IOException expected) { stalled = true; }
        expect(stalled, "A provider stream that makes no progress must not block export forever");
        RepeatingInput source = new RepeatingInput(large); long chars = 0;
        try (FileTransfer.TextChunks chunks = new FileTransfer.TextChunks(source, FileTransfer.MAX_BACKUP_BYTES)) {
            String chunk;
            while ((chunk = chunks.next()) != null) {
                if (chunk.length() > 32768) throw new AssertionError("Bridge text chunk too large");
                chars += chunk.length();
            }
        }
        expect(chars == large, "Incremental text import must stream more than 40 MB with bounded chunks");
        expect(source.closed, "Closing the decoder must close its provider stream");
        StringBuilder unicode = new StringBuilder();
        for (int i = 0; i < 32767; i++) unicode.append('a');
        unicode.append("\ud83d\udd8b\u2766\u00e9\n");
        for (int i = 0; i < 33000; i++) unicode.append("\u03b1");
        String text = unicode.toString(); StringBuilder restored = new StringBuilder();
        try (FileTransfer.TextChunks chunks = new FileTransfer.TextChunks(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)), 200000)) {
            String chunk;
            while ((chunk = chunks.next()) != null) {
                expect(chunk.isEmpty() || !Character.isHighSurrogate(chunk.charAt(chunk.length() - 1)), "Chunks must not split supplementary characters");
                restored.append(chunk);
            }
        }
        expect(text.equals(restored.toString()), "UTF-8 and surrogate boundaries must preserve exact backup text");
        boolean malformed = false;
        try (FileTransfer.TextChunks chunks = new FileTransfer.TextChunks(new ByteArrayInputStream(new byte[]{(byte)0xc3, 0x28}), 10)) { chunks.next(); }
        catch (IOException expected) { malformed = true; }
        expect(malformed, "Malformed UTF-8 must fail rather than silently corrupt user text");
        boolean incomplete = false;
        try (FileTransfer.TextChunks chunks = new FileTransfer.TextChunks(new ByteArrayInputStream(new byte[]{(byte)0xf0, (byte)0x9f, (byte)0x96}), 10)) { chunks.next(); }
        catch (IOException expected) { incomplete = true; }
        expect(incomplete, "A truncated UTF-8 sequence at end of backup must fail");
        boolean oversized = false;
        try (FileTransfer.TextChunks chunks = new FileTransfer.TextChunks(new ByteArrayInputStream("\u00e9".getBytes(StandardCharsets.UTF_8)), 1)) { chunks.next(); }
        catch (IOException expected) { oversized = true; }
        expect(oversized, "Import safety cap must count bytes, including multibyte UTF-8");
        byte[] payload = new byte[FileTransfer.MAX_CHUNK_BYTES]; Arrays.fill(payload, (byte)0xa5);
        ByteArrayOutputStream decoded = new ByteArrayOutputStream();
        FileTransfer.decodeBase64To(Base64.getEncoder().encodeToString(payload), decoded, FileTransfer.MAX_CHUNK_BYTES);
        expect(Arrays.equals(payload, decoded.toByteArray()), "A maximum-sized export chunk must preserve all bytes");
        boolean tooBig = false;
        try { FileTransfer.decodeBase64To(Base64.getEncoder().encodeToString(new byte[FileTransfer.MAX_CHUNK_BYTES + 1]), new CountingOutput(), FileTransfer.MAX_CHUNK_BYTES); }
        catch (IOException expected) { tooBig = true; }
        expect(tooBig, "A chunk one byte over the limit must fail");
        expect(FileTransfer.MAX_FILE_BYTES == 40_000_000, "Legacy single-message limits must remain unchanged");
        System.out.println("PASS: " + checks + " bounded file-transfer checks (32 MiB heap)");
    }
}
