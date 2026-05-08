// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package tutor

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/spf13/cobra"

	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/output"
)

type studyOptions struct {
	Minutes int
	Label   string
	NoTick  bool
}

func newCmdStudy(f *cmdutil.Factory) *cobra.Command {
	opts := &studyOptions{Minutes: 25}
	cmd := &cobra.Command{
		Use:   "study",
		Short: "Run a study (pomodoro) timer",
		Long: `Block for the given number of minutes and print a per-minute tick.

The timer stops cleanly on Ctrl-C; partial elapsed time is reported.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStudy(cmd.Context(), f.IOStreams.Out, opts)
		},
	}
	cmd.Flags().IntVarP(&opts.Minutes, "minutes", "m", 25, "study session length in minutes")
	cmd.Flags().StringVarP(&opts.Label, "label", "l", "", "optional session label")
	cmd.Flags().BoolVar(&opts.NoTick, "no-tick", false, "disable per-minute tick output")
	return cmd
}

func runStudy(ctx context.Context, out io.Writer, opts *studyOptions) error {
	if opts.Minutes <= 0 {
		return fmt.Errorf("--minutes must be positive, got %d", opts.Minutes)
	}
	if ctx == nil {
		ctx = context.Background()
	}

	start := time.Now()
	total := time.Duration(opts.Minutes) * time.Minute

	label := opts.Label
	if label == "" {
		label = "study session"
	}
	fmt.Fprintf(out, "▶  %s: %d min — started %s\n", label, opts.Minutes, start.Format("15:04:05"))

	if opts.NoTick {
		select {
		case <-ctx.Done():
			reportInterrupted(out, label, time.Since(start))
		case <-time.After(total):
			reportComplete(out, label, opts.Minutes)
		}
		return nil
	}

	tick := time.NewTicker(time.Minute)
	defer tick.Stop()
	deadline := time.NewTimer(total)
	defer deadline.Stop()

	for elapsed := 0; ; {
		select {
		case <-ctx.Done():
			reportInterrupted(out, label, time.Since(start))
			return nil
		case <-tick.C:
			elapsed++
			if elapsed < opts.Minutes {
				fmt.Fprintf(out, "··  %d/%d min\n", elapsed, opts.Minutes)
			}
		case <-deadline.C:
			reportComplete(out, label, opts.Minutes)
			return nil
		}
	}
}

func reportComplete(out io.Writer, label string, planned int) {
	fmt.Fprintf(out, "✓  %s complete — %d min\n", label, planned)
}

func reportInterrupted(out io.Writer, label string, actual time.Duration) {
	fmt.Fprintf(out, "✗  %s interrupted at %.1f min\n", label, actual.Minutes())
}

// ── stats ────────────────────────────────────────────────────────────────

func newCmdStats(f *cmdutil.Factory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "stats",
		Short: "Show flashcard study stats",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStats(f)
		},
	}
	return cmd
}

func runStats(f *cmdutil.Factory) error {
	store, err := LoadStore()
	if err != nil {
		return err
	}
	totalCards := len(store.Cards)
	totalReviews := 0
	totalCorrect := 0
	bySubject := make(map[string]map[string]int)
	for _, c := range store.Cards {
		totalReviews += c.ReviewCount
		totalCorrect += c.Correct
		key := c.Subject
		if key == "" {
			key = "(none)"
		}
		s, ok := bySubject[key]
		if !ok {
			s = map[string]int{"cards": 0, "reviews": 0, "correct": 0}
			bySubject[key] = s
		}
		s["cards"]++
		s["reviews"] += c.ReviewCount
		s["correct"] += c.Correct
	}

	out := map[string]interface{}{
		"ok":            true,
		"total_cards":   totalCards,
		"total_reviews": totalReviews,
		"total_correct": totalCorrect,
		"subjects":      bySubject,
		"store_path":    StorePath(),
	}
	if totalReviews > 0 {
		out["accuracy"] = float64(totalCorrect) / float64(totalReviews)
	}
	output.PrintJson(f.IOStreams.Out, out)
	return nil
}
