// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

// Package health implements the `health` command, which emits a structured
// snapshot of the CLI's diagnostic data (version, build, runtime, config and
// auth state). Unlike `doctor`, which runs pass/fail connectivity probes,
// `health` is a purely local, read-only data dump intended for machine
// consumption (support bundles, bug reports, agent self-inspection).
package health

import (
	"context"
	"runtime"
	"time"

	"github.com/spf13/cobra"

	larkauth "github.com/larksuite/cli/internal/auth"
	"github.com/larksuite/cli/internal/build"
	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/core"
	"github.com/larksuite/cli/internal/output"
)

// HealthOptions holds inputs for the health command.
type HealthOptions struct {
	Factory *cmdutil.Factory
	Ctx     context.Context
}

// NewCmdHealth creates the health command.
func NewCmdHealth(f *cmdutil.Factory) *cobra.Command {
	opts := &HealthOptions{Factory: f}

	cmd := &cobra.Command{
		Use:   "health",
		Short: "Report CLI health data: version, runtime, config, and auth state",
		Long: `Emit a structured, local-only snapshot of the CLI's health data.

Unlike ` + "`doctor`" + `, which performs pass/fail connectivity checks, ` + "`health`" + `
collects no network state and never fails on missing config — it always prints
a JSON snapshot describing the build, Go runtime, config location, and the
locally known authentication state. Useful for support bundles, bug reports,
and agent self-inspection.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			opts.Ctx = cmd.Context()
			return healthRun(opts)
		},
	}
	cmdutil.DisableAuthCheck(cmd)

	return cmd
}

// runtimeData describes the Go runtime the CLI is executing in.
type runtimeData struct {
	GoVersion string `json:"go_version"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
	NumCPU    int    `json:"num_cpu"`
}

// buildData describes how this binary was built.
type buildData struct {
	Version string `json:"version"`
	Date    string `json:"date,omitempty"`
}

// configData describes the on-disk config location and whether it loaded.
type configData struct {
	Dir     string `json:"dir"`
	Path    string `json:"path"`
	Present bool   `json:"present"`
	AppID   string `json:"app_id,omitempty"`
	Brand   string `json:"brand,omitempty"`
}

// authData describes the locally known authentication state. It performs no
// network calls; TokenStatus is derived from the stored token's expiry.
type authData struct {
	LoggedIn    bool   `json:"logged_in"`
	UserName    string `json:"user_name,omitempty"`
	UserOpenID  string `json:"user_open_id,omitempty"`
	TokenStored bool   `json:"token_stored"`
	TokenStatus string `json:"token_status,omitempty"` // "valid" | "needs_refresh" | "expired"
}

// healthData is the full snapshot emitted by the command.
type healthData struct {
	OK        bool        `json:"ok"`
	Timestamp string      `json:"timestamp"`
	Build     buildData   `json:"build"`
	Runtime   runtimeData `json:"runtime"`
	Config    configData  `json:"config"`
	Auth      authData    `json:"auth"`
}

func healthRun(opts *HealthOptions) error {
	f := opts.Factory

	data := healthData{
		OK:        true,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Build: buildData{
			Version: build.Version,
			Date:    build.Date,
		},
		Runtime: runtimeData{
			GoVersion: runtime.Version(),
			OS:        runtime.GOOS,
			Arch:      runtime.GOARCH,
			NumCPU:    runtime.NumCPU(),
		},
		Config: collectConfigData(f),
	}
	data.Auth = collectAuthData(f, data.Config)

	output.PrintJson(f.IOStreams.Out, data)
	return nil
}

// collectConfigData resolves config locations and, if the active app loads,
// its non-sensitive identity (app ID and brand). The app secret is never
// included in the snapshot.
func collectConfigData(f *cmdutil.Factory) configData {
	cd := configData{
		Dir:  core.GetConfigDir(),
		Path: core.GetConfigPath(),
	}
	if _, err := core.LoadMultiAppConfig(); err != nil {
		return cd
	}
	cd.Present = true

	cfg, err := f.Config()
	if err != nil || cfg == nil {
		return cd
	}
	cd.AppID = cfg.AppID
	cd.Brand = string(cfg.Brand)
	return cd
}

// collectAuthData reports the locally known login state without any network
// access. It only inspects the stored token's local validity.
func collectAuthData(f *cmdutil.Factory, cd configData) authData {
	ad := authData{}
	if !cd.Present || cd.AppID == "" {
		return ad
	}

	cfg, err := f.Config()
	if err != nil || cfg == nil || cfg.UserOpenId == "" {
		return ad
	}
	ad.LoggedIn = true
	ad.UserName = cfg.UserName
	ad.UserOpenID = cfg.UserOpenId

	stored := larkauth.GetStoredToken(cfg.AppID, cfg.UserOpenId)
	if stored == nil {
		return ad
	}
	ad.TokenStored = true
	ad.TokenStatus = larkauth.TokenStatus(stored)
	return ad
}
