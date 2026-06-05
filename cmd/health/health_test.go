// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package health

import (
	"encoding/json"
	"runtime"
	"testing"

	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/core"
)

func TestHealthRun_EmitsSnapshot(t *testing.T) {
	f, stdout, _, _ := cmdutil.TestFactory(t, &core.CliConfig{
		AppID: "test-app", AppSecret: "test-secret", Brand: core.BrandFeishu,
	})

	opts := &HealthOptions{Factory: f, Ctx: t.Context()}
	if err := healthRun(opts); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var got healthData
	if err := json.Unmarshal(stdout.Bytes(), &got); err != nil {
		t.Fatalf("output is not valid JSON: %v", err)
	}

	if !got.OK {
		t.Error("expected ok=true")
	}
	if got.Timestamp == "" {
		t.Error("expected a timestamp")
	}
	if got.Runtime.GoVersion != runtime.Version() {
		t.Errorf("go_version = %q, want %q", got.Runtime.GoVersion, runtime.Version())
	}
	if got.Runtime.OS != runtime.GOOS {
		t.Errorf("os = %q, want %q", got.Runtime.OS, runtime.GOOS)
	}
	if got.Build.Version == "" {
		t.Error("expected a build version")
	}
}

func TestHealthRun_NeverFailsWithoutConfig(t *testing.T) {
	// A factory whose Config() errors must still yield a successful snapshot.
	f, stdout, _, _ := cmdutil.TestFactory(t, nil)

	opts := &HealthOptions{Factory: f, Ctx: t.Context()}
	if err := healthRun(opts); err != nil {
		t.Fatalf("expected nil error without config, got %v", err)
	}

	var got healthData
	if err := json.Unmarshal(stdout.Bytes(), &got); err != nil {
		t.Fatalf("output is not valid JSON: %v", err)
	}
	if !got.OK {
		t.Error("expected ok=true even without config")
	}
	if got.Auth.LoggedIn {
		t.Error("expected logged_in=false without config")
	}
	if got.Config.Path == "" {
		t.Error("expected config path to be reported even when absent")
	}
}
