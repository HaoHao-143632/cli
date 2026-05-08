// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package tutor

import (
	"bufio"
	"fmt"
	"io"
	"math/rand/v2"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/output"
)

// listFormats are the accepted values for `flashcard list --format`.
var listFormats = map[string]bool{"json": true, "table": true}

func newCmdFlashcard(f *cmdutil.Factory) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "flashcard",
		Aliases: []string{"card", "fc"},
		Short:   "Manage flashcards (add, list, delete, review)",
	}
	cmd.AddCommand(
		newCmdFlashcardAdd(f),
		newCmdFlashcardList(f),
		newCmdFlashcardDelete(f),
		newCmdFlashcardReview(f),
	)
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
	cmd.Flags().StringVarP(&opts.Subject, "subject", "s", "", "filter by subject (case-insensitive)")
	cmd.Flags().StringVar(&opts.Format, "format", "json", "output format: json | table")
	return cmd
}

func runFlashcardList(f *cmdutil.Factory, opts *listOptions) error {
	if !listFormats[opts.Format] {
		return fmt.Errorf("invalid --format %q: expected one of json, table", opts.Format)
	}
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
	Seed    uint64 // 0 = non-deterministic; non-zero = deterministic shuffle (tests)
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
	cmd.Flags().StringVarP(&opts.Subject, "subject", "s", "", "filter by subject")
	cmd.Flags().IntVarP(&opts.Limit, "limit", "n", 0, "max cards to review (0 = all)")
	cmd.Flags().Uint64Var(&opts.Seed, "seed", 0, "random seed (0 = non-deterministic)")
	_ = cmd.Flags().MarkHidden("seed")
	return cmd
}

func runFlashcardReview(f *cmdutil.Factory, opts *reviewOptions) error {
	if f.IOStreams.In == nil {
		return fmt.Errorf("review requires an input stream (stdin)")
	}
	store, err := LoadStore()
	if err != nil {
		return err
	}
	cards := store.Filter(opts.Subject)
	if len(cards) == 0 {
		fmt.Fprintln(f.IOStreams.Out, "No flashcards to review. Add some with `lark-cli tutor flashcard add`.")
		return nil
	}

	shuffleCards(cards, opts.Seed)
	if opts.Limit > 0 && opts.Limit < len(cards) {
		cards = cards[:opts.Limit]
	}

	out := f.IOStreams.Out
	scanner := bufio.NewScanner(f.IOStreams.In)

	correct, answered := 0, 0
	for i, c := range cards {
		got, ok := promptCard(out, scanner, i+1, len(cards), c)
		if !ok {
			break
		}
		answered++
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

// shuffleCards shuffles cards in place. seed=0 uses the package's
// non-deterministic global source; non-zero seeds yield a deterministic order.
func shuffleCards(cards []Flashcard, seed uint64) {
	swap := func(i, j int) { cards[i], cards[j] = cards[j], cards[i] }
	if seed == 0 {
		rand.Shuffle(len(cards), swap)
		return
	}
	rng := rand.New(rand.NewPCG(seed, 0x9E3779B97F4A7C15))
	rng.Shuffle(len(cards), swap)
}

// promptCard runs one Q&A interaction. Returns (correct, continue) — when
// continue is false the caller stops the review (EOF or 'q').
func promptCard(out io.Writer, scanner *bufio.Scanner, n, total int, c Flashcard) (correct, cont bool) {
	subj := "(no subject)"
	if c.Subject != "" {
		subj = "subject: " + c.Subject
	}
	fmt.Fprintf(out, "\n[%d/%d] %s\n", n, total, subj)
	fmt.Fprintf(out, "Q: %s\n", c.Question)
	fmt.Fprint(out, "Press Enter to show answer (or type 'q' to quit): ")
	if !scanner.Scan() || normalize(scanner.Text()) == "q" {
		return false, false
	}
	fmt.Fprintf(out, "A: %s\n", c.Answer)
	fmt.Fprint(out, "Got it right? [y/N/q]: ")
	if !scanner.Scan() {
		return false, false
	}
	resp := normalize(scanner.Text())
	if resp == "q" {
		return false, false
	}
	return resp == "y" || resp == "yes", true
}

func normalize(s string) string { return strings.TrimSpace(strings.ToLower(s)) }

func writeReviewSummary(w io.Writer, answered, correct, total int) {
	fmt.Fprintln(w)
	fmt.Fprintln(w, "── review summary ──")
	fmt.Fprintf(w, "answered: %d / %d\n", answered, total)
	if answered > 0 {
		pct := float64(correct) / float64(answered) * 100
		fmt.Fprintf(w, "correct:  %d / %d (%.0f%%)\n", correct, answered, pct)
	}
}
