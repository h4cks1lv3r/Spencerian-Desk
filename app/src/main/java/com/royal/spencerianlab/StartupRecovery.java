package com.royal.spencerianlab;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.webkit.WebView;
import java.util.HashSet;
import java.util.Set;

/** A native fallback that does not depend on WebView, bundled assets, or saved credentials. */
final class StartupRecovery {
    private static final int PAPER = Color.rgb(248, 246, 241);
    private static final int INK = Color.rgb(37, 41, 36);
    private static final int MUTED = Color.rgb(98, 100, 88);

    private StartupRecovery() { }

    /** Call on the UI thread. Replaces Activity content; retry must attempt startup on that thread. */
    static void show(Activity activity, Throwable failure, Runnable retry) {
        final String details = diagnostics(activity, failure);
        final int padding = dp(activity, 24);
        LinearLayout page = new LinearLayout(activity);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setBackgroundColor(PAPER);
        page.setPadding(padding, padding, padding, padding);

        TextView label = text(activity, "THE SPENCERIAN DESK", 12, MUTED);
        label.setLetterSpacing(0.14f);
        page.addView(label);
        TextView title = text(activity, "The writing desk could not open", 28, INK);
        title.setTypeface(Typeface.create("serif", Typeface.NORMAL));
        title.setPadding(0, dp(activity, 14), 0, dp(activity, 12));
        page.addView(title);
        TextView explanation = text(activity,
            "Try opening it again. If it still fails, copy the startup details below and send them with your report.", 16, MUTED);
        explanation.setPadding(0, 0, 0, dp(activity, 16));
        page.addView(explanation);

        Button retryButton = new Button(activity);
        retryButton.setText("Try again");
        retryButton.setAllCaps(false);
        retryButton.setTextColor(INK);
        retryButton.setMinHeight(dp(activity, 48));
        retryButton.setEnabled(retry != null);
        retryButton.setOnClickListener(view -> {
            try { retry.run(); }
            catch (RuntimeException | LinkageError error) { show(activity, error, retry); }
        });
        page.addView(retryButton, new LinearLayout.LayoutParams(-1, -2));

        Button copy = new Button(activity);
        copy.setText("Copy startup details");
        copy.setAllCaps(false);
        copy.setTextColor(INK);
        copy.setMinHeight(dp(activity, 48));
        copy.setOnClickListener(view -> {
            try {
                ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) throw new IllegalStateException();
                clipboard.setPrimaryClip(ClipData.newPlainText("The Spencerian Desk startup", details));
                Toast.makeText(activity, "Startup details copied", Toast.LENGTH_SHORT).show();
            } catch (RuntimeException error) {
                Toast.makeText(activity, "Could not copy. Select the details below to copy them.", Toast.LENGTH_LONG).show();
            }
        });
        page.addView(copy, new LinearLayout.LayoutParams(-1, -2));

        TextView report = text(activity, details, 12, INK);
        report.setTypeface(Typeface.MONOSPACE);
        report.setTextIsSelectable(true);
        report.setPadding(0, dp(activity, 16), 0, dp(activity, 12));
        page.addView(report, new LinearLayout.LayoutParams(-1, -2));
        ScrollView scroll = new ScrollView(activity);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(PAPER);
        // MainActivity opts into edge-to-edge only on Android 11 and later.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            scroll.setOnApplyWindowInsetsListener(MainActivity::applyContentInsets);
        scroll.addView(page, new ScrollView.LayoutParams(-1, -2));
        activity.setContentView(scroll);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) scroll.requestApplyInsets();
    }

    private static TextView text(Activity activity, String value, int size, int color) {
        TextView view = new TextView(activity);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setLineSpacing(dp(activity, 2), 1);
        return view;
    }

    private static int dp(Activity activity, int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private static String diagnostics(Activity activity, Throwable failure) {
        StringBuilder output = new StringBuilder("The Spencerian Desk startup report\n");
        try {
            PackageInfo app = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            output.append("App: ").append(bounded(app.versionName, 80)).append(" (").append(app.versionCode).append(")\n");
        } catch (RuntimeException | android.content.pm.PackageManager.NameNotFoundException error) {
            output.append("App: version unavailable\n");
        }
        output.append("Android: ").append(bounded(Build.VERSION.RELEASE, 80))
            .append(" (API ").append(Build.VERSION.SDK_INT).append(")\n")
            .append("Device: ").append(bounded(Build.MANUFACTURER, 80)).append(' ')
            .append(bounded(Build.MODEL, 120)).append('\n');
        try {
            // This queries provider metadata without creating a WebView instance.
            PackageInfo provider = WebView.getCurrentWebViewPackage();
            output.append("WebView: ").append(provider == null ? "No provider reported"
                : bounded(provider.packageName, 160) + " " + bounded(provider.versionName, 100)).append('\n');
        } catch (RuntimeException | LinkageError error) {
            output.append("WebView: metadata unavailable (").append(error.getClass().getSimpleName()).append(")\n");
        }
        Set<Throwable> seen = new HashSet<>();
        int causes = 0;
        int frames = 0;
        for (Throwable error = failure; error != null && causes < 4 && seen.add(error); error = error.getCause()) {
            output.append(causes++ == 0 ? "\nFailure: " : "\nCaused by: ")
                .append(error.getClass().getName()).append(": ").append(bounded(error.getMessage(), 700)).append('\n');
            for (StackTraceElement frame : error.getStackTrace()) {
                if (frames++ >= 24) { output.append("  [stack truncated]\n"); break; }
                output.append("  at ").append(bounded(frame.toString(), 240)).append('\n');
            }
        }
        return bounded(output.toString(), 10000);
    }

    private static String bounded(String value, int maximum) {
        if (value == null || value.isEmpty()) return "(none)";
        return value.length() <= maximum ? value : value.substring(0, maximum) + "…";
    }
}
