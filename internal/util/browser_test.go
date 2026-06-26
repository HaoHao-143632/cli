// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package util

import (
	"os/exec"
	"testing"
)

func TestOpenBrowserRejectsNonHTTP(t *testing.T) {
	cases := []string{
		"file:///etc/passwd",
		"javascript:alert(1)",
		"ftp://example.com",
		"  http://example.com", // leading space makes scheme empty
	}
	for _, c := range cases {
		if err := OpenBrowser(c); err == nil {
			t.Errorf("OpenBrowser(%q) = nil, want error for non-http(s) URL", c)
		}
	}
}

func TestOpenBrowserLaunchesForHTTP(t *testing.T) {
	// Stub the command lookup and exec so the test never spawns a real browser.
	origCmd := browserCommand
	origExec := execCommand
	t.Cleanup(func() {
		browserCommand = origCmd
		execCommand = origExec
	})

	var gotName string
	var gotArgs []string
	browserCommand = func() (string, []string) { return "stub", []string{"--base"} }
	execCommand = func(name string, args ...string) *exec.Cmd {
		gotName = name
		gotArgs = args
		// `true` exists on the test platforms and exits immediately.
		return exec.Command("true")
	}

	url := "https://example.com/verify?code=abc"
	if err := OpenBrowser(url); err != nil {
		t.Fatalf("OpenBrowser(%q) returned error: %v", url, err)
	}
	if gotName != "stub" {
		t.Errorf("command name = %q, want %q", gotName, "stub")
	}
	if len(gotArgs) != 2 || gotArgs[0] != "--base" || gotArgs[1] != url {
		t.Errorf("command args = %v, want [--base %s]", gotArgs, url)
	}
}
