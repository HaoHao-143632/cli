// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package tutor

import (
	"bufio"
	"fmt"
	"io"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/output"
)

func newCmdFlashcard(f *cmdutil.Factory) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "flashcard",
		Aliases: []string{"card", "fc"},
		Short:   "Manage flashcards (add, list, delete, review)",
	}
	cmdutil.DisableAuthCheck(cmd)

	cmd.AddCommand(newCmdFlashcardAdd(f))
	cmd.AddCommand(newCmdFlashcardList(f))
	cmd.AddCommand(newCmdFlashcardDelete(f))
	cmd.AddCommand(newCmdFlashcardReview(f))
	return cmd
}

// ── add ──────────────────────────────────────────────────────────────────

type addOptions struct {
	Question string
	Answer   string
	Subject  string
	Tags     []string
}

func newCmdFlashcardAdd(f *cmdutil.Factory) *cobra.Command {
	opts := &addOptions{}
	cmd := &cobra.Command{
		Use:   "add",
		Short: "Add a flashcard",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runFlashcardAdd(f, opts)
		},
	}
	cmdutil.DisableAuthCheck(cmd)

	cmd.Flags().StringVarP(&opts.Question, "question", "q", "", "question text (required)")
	cmd.Flags().StringVarP(&opts.Answer, "answer", "a", "", "answer text (required)")
	cmd.Flags().StringVarP(&opts.Subject, "subject", "s", "", "subject/category, e.g. math, english")
	cmd.Flags().StringSliceVarP(&opts.Tags, "tags", "t", nil, "comma-separated tags")
	_ = cmd.MarkFlagRequired("question")
	_ = cmd.MarkFlagRequired("answer")
	return cmd
}

func runFlashcardAdd(f *cmdutil.Factory, opts *addOptions) error {
	q := strings.TrimSpace(opts.Question)
	a := strings.TrimSpace(opts.Answer)
	if q == "" || a == "" {
		return fmt.Errorf("question and answer must not be empty")
	}
	store, err := LoadStore()
	if err != nil {
		return err
	}
	card := store.Add(Flashcard{
		Question: q,
		Answer:   a,
		Subject:  strings.TrimSpace(opts.Subject),
		Tags:     opts.Tags,
	})
	if err := store.Save(); err != nil {
		return err
	}
	output.PrintJson(f.IOStreams.Out, map[string]interface{}{
		"ok":   true,
		"card": card,
	})
	return nil
}

// ── list ─────────────────────────────────────────────────────────────────

type listOptions struct {
	Subject string
	Format  string
}

func newCmdFlashcardList(f *cmdutil.Factory) *cobra.Command {
	opts := &listOptions{}
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List flashcards",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runFlashcardList(f, opts)
		},
	}
	cmdutil.DisableAuthCheck(cmd)
	cmd.Flags().StringVarP(&opts.Subject, "subject", "s", "", "filter by subject (case-insensitive)")
	cmd.Flags().StringVar(&opts.Format, "format", "json", "output format: json | table")
	return cmd
}

func runFlashcardList(f *cmdutil.Factory, opts *listOptions) error {
	store, err := LoadStore()
	if err != nil {
		return err
	}
	cards := store.Filter(opts.Subject)

	if opts.Format == "table" {
		rows := make([]map[string]interface{}, len(cards))
		for i, c := range cards {
			rows[i] = map[string]interface{}{
				"id":       c.ID,
				"subject":  c.Subject,
				"question": c.Question,
				"answer":   c.Answer,
				"reviews":  c.ReviewCount,
				"correct":  c.Correct,
			}
		}
		output.PrintTable(f.IOStreams.Out, rows)
		return nil
	}
	output.PrintJson(f.IOStreams.Out, map[string]interface{}{
		"ok":    true,
		"count": len(cards),
		"cards": cards,
	})
	return nil
}

// ── delete ───────────────────────────────────────────────────────────────

func newCmdFlashcardDelete(f *cmdutil.Factory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a flashcard by ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid id %q: must be an integer", args[0])
			}
			return runFlashcardDelete(f, id)
		},
	}
	cmdutil.DisableAuthCheck(cmd)
	return cmd
}

func runFlashcardDelete(f *cmdutil.Factory, id int) error {
	store, err := LoadStore()
	if err != nil {
		return err
	}
	if !store.Delete(id) {
		return fmt.Errorf("flashcard %d not found", id)
	}
	if err := store.Save(); err != nil {
		return err
	}
	output.PrintJson(f.IOStreams.Out, map[string]interface{}{
		"ok":      true,
		"deleted": id,
	})
	return nil
}

// ── review ───────────────────────────────────────────────────────────────

type reviewOptions struct {
	Subject string
	Limit   int
	Seed    int64 // for deterministic tests; 0 = use time
}

func newCmdFlashcardReview(f *cmdutil.Factory) *cobra.Command {
	opts := &reviewOptions{}
	cmd := &cobra.Command{
		Use:   "review",
		Short: "Interactively review flashcards (random order)",
		Long: `Interactively review flashcards in random order.

For each card the question is shown; press Enter to reveal the answer,
then type 'y' if you got it right, 'n' if not, or 'q' to quit early.
Review stats are persisted to the store.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runFlashcardReview(f, opts)
		},
	}
	cmdutil.DisableAuthCheck(cmd)
	cmd.Flags().StringVarP(&opts.Subject, "subject", "s", "", "filter by subject")
	cmd.Flags().IntVarP(&opts.Limit, "limit", "n", 0, "max cards to review (0 = all)")
	cmd.Flags().Int64Var(&opts.Seed, "seed", 0, "random seed (0 = time-based)")
	_ = cmd.Flags().MarkHidden("seed")
	return cmd
}

func runFlashcardReview(f *cmdutil.Factory, opts *reviewOptions) error {
	store, err := LoadStore()
	if err != nil {
		return err
	}
	cards := store.Filter(opts.Subject)
	if len(cards) == 0 {
		fmt.Fprintln(f.IOStreams.Out, "No flashcards to review. Add some with `lark-cli tutor flashcard add`.")
		return nil
	}

	seed := opts.Seed
	if seed == 0 {
		seed = time.Now().UnixNano()
	}
	r := rand.New(rand.NewSource(seed))
	r.Shuffle(len(cards), func(i, j int) { cards[i], cards[j] = cards[j], cards[i] })

	limit := opts.Limit
	if limit <= 0 || limit > len(cards) {
		limit = len(cards)
	}
	cards = cards[:limit]

	out := f.IOStreams.Out
	in := f.IOStreams.In
	if in == nil {
		return fmt.Errorf("review requires an input stream (stdin)")
	}
	scanner := bufio.NewScanner(in)

	correct := 0
	answered := 0
	for i, c := range cards {
		fmt.Fprintf(out, "\n[%d/%d] %s\n", i+1, len(cards), prettySubject(c.Subject))
		fmt.Fprintf(out, "Q: %s\n", c.Question)
		fmt.Fprint(out, "Press Enter to show answer (or type 'q' to quit): ")
		if !scanner.Scan() {
			break
		}
		if strings.TrimSpace(strings.ToLower(scanner.Text())) == "q" {
			break
		}
		fmt.Fprintf(out, "A: %s\n", c.Answer)
		fmt.Fprint(out, "Got it right? [y/N/q]: ")
		if !scanner.Scan() {
			break
		}
		resp := strings.TrimSpace(strings.ToLower(scanner.Text()))
		if resp == "q" {
			break
		}
		answered++
		got := resp == "y" || resp == "yes"
		if got {
			correct++
		}
		if real := store.Find(c.ID); real != nil {
			real.ReviewCount++
			if got {
				real.Correct++
			}
			now := time.Now().UTC()
			real.ReviewedAt = &now
		}
	}

	if err := store.Save(); err != nil {
		return err
	}

	writeReviewSummary(out, answered, correct, len(cards))
	return nil
}

func writeReviewSummary(w io.Writer, answered, correct, total int) {
	fmt.Fprintln(w)
	fmt.Fprintln(w, "── review summary ──")
	fmt.Fprintf(w, "answered: %d / %d\n", answered, total)
	if answered > 0 {
		pct := float64(correct) / float64(answered) * 100
		fmt.Fprintf(w, "correct:  %d / %d (%.0f%%)\n", correct, answered, pct)
	}
}

func prettySubject(s string) string {
	if s == "" {
		return "(no subject)"
	}
	return "subject: " + s
}
