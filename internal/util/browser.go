// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package util

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"runtime"
)

// browserCommand returns the command and base arguments used to open a URL in
// the user's default browser for the current platform. It is a variable so
// tests can stub it.
var browserCommand = func() (string, []string) {
	switch runtime.GOOS {
	case "darwin":
		return "open", nil
	case "windows":
		// rundll32 avoids quoting pitfalls of `cmd /c start`.
		return "rundll32", []string{"url.dll,FileProtocolHandler"}
	default:
		// Linux, *BSD, etc.
		return "xdg-open", nil
	}
}

// execCommand is indirected for testing.
var execCommand = exec.Command

// CanOpenBrowser reports whether the current environment likely has a usable
// graphical browser. It returns false for headless/remote sessions where
// launching a browser would fail or hang, so callers can fall back to printing
// the URL instead.
func CanOpenBrowser() bool {
	switch runtime.GOOS {
	case "darwin", "windows":
		return true
	default:
		// On Linux/Unix a graphical session is required. Without a display
		// server (typical for SSH sessions, CI, and containers) xdg-open has
		// nothing to open.
		if os.Getenv("DISPLAY") == "" && os.Getenv("WAYLAND_DISPLAY") == "" {
			return false
		}
		return true
	}
}

// OpenBrowser opens rawURL in the user's default browser. Only http and https
// URLs are accepted to avoid handing arbitrary schemes or shell-sensitive
// strings to the platform opener.
func OpenBrowser(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("refusing to open non-http(s) URL: %q", rawURL)
	}

	name, baseArgs := browserCommand()
	args := append(append([]string{}, baseArgs...), u.String())
	cmd := execCommand(name, args...)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch %s: %w", name, err)
	}
	// Release the process so we don't block on the browser staying open.
	return cmd.Process.Release()
}
