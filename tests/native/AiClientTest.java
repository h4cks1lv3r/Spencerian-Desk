package com.royal.spencerianlab;

import java.net.URL;
import java.security.cert.Certificate;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import javax.net.ssl.HttpsURLConnection;

/** Request cancellation and truncation boundaries; no network, provider keys, or Android runtime. */
public final class AiClientTest {
    private static int checks;
    private static void expect(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }
    private static boolean canceled(AiClient.Cancellation token) {
        try { token.check(); return false; } catch (AiClient.UserError expected) { return true; }
    }
    private static final class FakeConnection extends HttpsURLConnection {
        final AtomicInteger disconnects = new AtomicInteger();
        FakeConnection() throws Exception { super(new URL("https://example.invalid/")); }
        @Override public void disconnect() { disconnects.incrementAndGet(); }
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() { }
        @Override public String getCipherSuite() { return "test"; }
        @Override public Certificate[] getLocalCertificates() { return null; }
        @Override public Certificate[] getServerCertificates() { return null; }
    }
    public static void main(String[] args) throws Exception {
        expect(AiClient.isTokenLimit("openai", "length"), "OpenAI length finish reason flags truncation");
        expect(AiClient.isTokenLimit("custom", "length"), "Compatible endpoint length reason flags truncation");
        expect(AiClient.isTokenLimit("anthropic", "max_tokens"), "Anthropic max_tokens flags truncation");
        expect(AiClient.isTokenLimit("anthropic", "model_context_window_exceeded"), "Anthropic context-window exhaustion flags truncation");
        expect(AiClient.isTokenLimit("gemini", "MAX_TOKENS"), "Gemini MAX_TOKENS flags truncation");
        expect(!AiClient.isTokenLimit("openai", "stop") && !AiClient.isTokenLimit("anthropic", "end_turn")
            && !AiClient.isTokenLimit("gemini", "STOP"), "Normal completion reasons remain complete");
        expect(!AiClient.isTokenLimit("anthropic", "length") && !AiClient.isTokenLimit("gemini", "max_tokens")
            && !AiClient.isTokenLimit("openai", ""), "Only each provider's explicit token-limit reason is recognized");
        AiClient.Response partial = AiClient.finishResponse("  partial text  ", true);
        expect(partial.truncated && "partial text".equals(partial.text), "Partial prose is preserved with a separate truncation flag");
        AiClient.Response complete = AiClient.finishResponse(" complete ", false);
        expect(!complete.truncated && "complete".equals(complete.text), "Complete prose has no truncation flag");
        char[] text = new char[50000]; Arrays.fill(text, 'a');
        String atLimit = new String(text);
        expect(!AiClient.finishResponse(atLimit, false).truncated, "Exactly 50,000 characters is complete");
        AiClient.Response shortened = AiClient.finishResponse(atLimit + "b", false);
        expect(shortened.truncated && shortened.text.length() == 50000, "Local response cap also flags incomplete output");
        AiClient.Response unicode = AiClient.finishResponse(atLimit.substring(1) + "\uD83D\uDD8B", false);
        expect(unicode.truncated && unicode.text.length() == 49999, "Local cap does not split a surrogate pair");
        boolean emptyLimit = false;
        try { AiClient.finishResponse("  ", true); }
        catch (AiClient.UserError expected) { emptyLimit = expected.getMessage().contains("response limit"); }
        expect(emptyLimit, "Reasoning-only exhausted output explains the token limit");
        boolean empty = false;
        try { AiClient.finishResponse("", false); }
        catch (AiClient.UserError expected) { empty = expected.getMessage().contains("no text"); }
        expect(empty, "Empty normal response retains actionable failure");

        AiClient.Cancellation preCanceled = new AiClient.Cancellation(); preCanceled.cancel();
        boolean rejected = false;
        try { preCanceled.attach(new FakeConnection()); } catch (AiClient.UserError expected) { rejected = true; }
        expect(rejected && canceled(preCanceled), "Cancellation before connection creation prevents starting the request");
        AiClient.Cancellation active = new AiClient.Cancellation(); FakeConnection old = new FakeConnection();
        active.attach(old); active.cancel(); active.cancel();
        expect(old.disconnects.get() == 1 && canceled(active), "Cancel disconnects an active request once and remains canceled");
        AiClient.Cancellation next = new AiClient.Cancellation(); FakeConnection current = new FakeConnection();
        next.attach(current); active.cancel();
        expect(current.disconnects.get() == 0 && !canceled(next), "Canceling an old request cannot disconnect its successor");
        next.detach(current); next.cancel();
        expect(current.disconnects.get() == 0, "A completed request releases its connection from the token");

        // Repeated simultaneous attach/cancel verifies both interleavings: rejected attachment or disconnection.
        for (int i = 0; i < 100; i++) {
            AiClient.Cancellation race = new AiClient.Cancellation(); FakeConnection connection = new FakeConnection();
            CountDownLatch start = new CountDownLatch(1); AtomicInteger accepted = new AtomicInteger();
            Thread attach = new Thread(() -> { try { start.await(); race.attach(connection); accepted.incrementAndGet(); } catch (AiClient.UserError expected) { } catch (InterruptedException e) { throw new AssertionError(e); } });
            Thread cancel = new Thread(() -> { try { start.await(); race.cancel(); } catch (InterruptedException e) { throw new AssertionError(e); } });
            attach.start(); cancel.start(); start.countDown(); attach.join(); cancel.join();
            if (!canceled(race) || connection.disconnects.get() != accepted.get()) throw new AssertionError("Cancellation/connection race left a live request");
        }
        expect(true, "100 cancellation/attachment races leave no live request");
        System.out.println("PASS: " + checks + " AI transport boundary checks");
    }
}
