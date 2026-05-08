// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package tutor

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/larksuite/cli/internal/cmdutil"
	"github.com/larksuite/cli/internal/core"
)

// withTempStore points the tutor store at a fresh temp dir for the duration of t.
func withTempStore(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("LARKSUITE_CLI_CONFIG_DIR", dir)
	if got := core.GetConfigDir(); got != dir {
		t.Fatalf("config dir not redirected: got %q want %q", got, dir)
	}
}

func TestStore_AddSaveLoad(t *testing.T) {
	withTempStore(t)

	s, err := LoadStore()
	if err != nil {
		t.Fatalf("LoadStore: %v", err)
	}
	if len(s.Cards) != 0 {
		t.Fatalf("expected empty store, got %d cards", len(s.Cards))
	}

	c := s.Add(Flashcard{Question: "2+2?", Answer: "4", Subject: "math"})
	if c.ID != 1 {
		t.Errorf("first ID = %d, want 1", c.ID)
	}
	c2 := s.Add(Flashcard{Question: "capital of France?", Answer: "Paris"})
	if c2.ID != 2 {
		t.Errorf("second ID = %d, want 2", c2.ID)
	}
	if err := s.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	s2, err := LoadStore()
	if err != nil {
		t.Fatalf("LoadStore round-trip: %v", err)
	}
	if len(s2.Cards) != 2 {
		t.Fatalf("after round-trip got %d cards, want 2", len(s2.Cards))
	}
	if s2.NextID != 3 {
		t.Errorf("NextID = %d, want 3", s2.NextID)
	}
}

func TestStore_Filter(t *testing.T) {
	s := &Store{}
	s.Add(Flashcard{Question: "q1", Answer: "a1", Subject: "Math"})
	s.Add(Flashcard{Question: "q2", Answer: "a2", Subject: "english"})
	s.Add(Flashcard{Question: "q3", Answer: "a3", Subject: "math"})

	got := s.Filter("math")
	if len(got) != 2 {
		t.Errorf("Filter(math) returned %d, want 2 (case-insensitive)", len(got))
	}
	got = s.Filter("")
	if len(got) != 3 {
		t.Errorf("Filter(\"\") returned %d, want 3", len(got))
	}
	got = s.Filter("history")
	if len(got) != 0 {
		t.Errorf("Filter(history) returned %d, want 0", len(got))
	}
}

func TestStore_Delete(t *testing.T) {
	s := &Store{}
	s.Add(Flashcard{Question: "q1", Answer: "a1"})
	c2 := s.Add(Flashcard{Question: "q2", Answer: "a2"})
	s.Add(Flashcard{Question: "q3", Answer: "a3"})

	if !s.Delete(c2.ID) {
		t.Fatalf("Delete returned false for existing id %d", c2.ID)
	}
	if len(s.Cards) != 2 {
		t.Errorf("after delete, got %d cards, want 2", len(s.Cards))
	}
	if s.Find(c2.ID) != nil {
		t.Errorf("Find returned non-nil for deleted id")
	}
	if s.Delete(9999) {
		t.Errorf("Delete returned true for missing id")
	}
}

func TestFlashcardAdd_RunE(t *testing.T) {
	withTempStore(t)
	f, stdout, _, _ := cmdutil.TestFactory(t, nil)

	err := runFlashcardAdd(f, &addOptions{
		Question: "What is photosynthesis?",
		Answer:   "How plants make food from light.",
		Subject:  "biology",
		Tags:     []string{"plants", "biology"},
	})
	if err != nil {
		t.Fatalf("runFlashcardAdd: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &got); err != nil {
		t.Fatalf("invalid JSON output: %v\n%s", err, stdout.String())
	}
	if got["ok"] != true {
		t.Errorf("ok = %v, want true", got["ok"])
	}

	s, _ := LoadStore()
	if len(s.Cards) != 1 {
		t.Fatalf("store has %d cards, want 1", len(s.Cards))
	}
	if s.Cards[0].Subject != "biology" {
		t.Errorf("subject = %q, want biology", s.Cards[0].Subject)
	}
}

func TestFlashcardAdd_RejectsEmpty(t *testing.T) {
	withTempStore(t)
	f, _, _, _ := cmdutil.TestFactory(t, nil)
	err := runFlashcardAdd(f, &addOptions{Question: "  ", Answer: "x"})
	if err == nil {
		t.Errorf("expected error for empty question, got nil")
	}
}

func TestFlashcardList_FilterAndJSON(t *testing.T) {
	withTempStore(t)

	s, _ := LoadStore()
	s.Add(Flashcard{Question: "q1", Answer: "a1", Subject: "math"})
	s.Add(Flashcard{Question: "q2", Answer: "a2", Subject: "english"})
	if err := s.Save(); err != nil {
		t.Fatal(err)
	}

	f, stdout, _, _ := cmdutil.TestFactory(t, nil)
	if err := runFlashcardList(f, &listOptions{Subject: "math", Format: "json"}); err != nil {
		t.Fatalf("runFlashcardList: %v", err)
	}

	var out struct {
		OK    bool        `json:"ok"`
		Count int         `json:"count"`
		Cards []Flashcard `json:"cards"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, stdout.String())
	}
	if out.Count != 1 || len(out.Cards) != 1 {
		t.Fatalf("count=%d cards=%d, want 1/1", out.Count, len(out.Cards))
	}
	if out.Cards[0].Subject != "math" {
		t.Errorf("subject = %q, want math", out.Cards[0].Subject)
	}
}

func TestFlashcardList_RejectsInvalidFormat(t *testing.T) {
	withTempStore(t)
	f, _, _, _ := cmdutil.TestFactory(t, nil)
	err := runFlashcardList(f, &listOptions{Format: "yaml"})
	if err == nil || !strings.Contains(err.Error(), "invalid --format") {
		t.Errorf("expected invalid --format error, got %v", err)
	}
}

func TestFlashcardDelete_NotFound(t *testing.T) {
	withTempStore(t)
	f, _, _, _ := cmdutil.TestFactory(t, nil)
	err := runFlashcardDelete(f, 42)
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Errorf("expected not-found error, got %v", err)
	}
}

func TestFlashcardReview_RecordsAnswers(t *testing.T) {
	withTempStore(t)

	s, _ := LoadStore()
	s.Add(Flashcard{Question: "q1", Answer: "a1"})
	s.Add(Flashcard{Question: "q2", Answer: "a2"})
	if err := s.Save(); err != nil {
		t.Fatal(err)
	}

	f, stdout, _, _ := cmdutil.TestFactory(t, nil)
	// Two cards: reveal+correct, reveal+wrong.
	f.IOStreams.In = strings.NewReader("\ny\n\nn\n")

	err := runFlashcardReview(f, &reviewOptions{Seed: 42})
	if err != nil {
		t.Fatalf("runFlashcardReview: %v", err)
	}

	if !strings.Contains(stdout.String(), "review summary") {
		t.Errorf("output missing summary:\n%s", stdout.String())
	}

	s2, _ := LoadStore()
	totalReviews := 0
	totalCorrect := 0
	for _, c := range s2.Cards {
		totalReviews += c.ReviewCount
		totalCorrect += c.Correct
	}
	if totalReviews != 2 {
		t.Errorf("totalReviews = %d, want 2", totalReviews)
	}
	if totalCorrect != 1 {
		t.Errorf("totalCorrect = %d, want 1", totalCorrect)
	}
}

func TestFlashcardReview_QuitEarly(t *testing.T) {
	withTempStore(t)
	s, _ := LoadStore()
	s.Add(Flashcard{Question: "q1", Answer: "a1"})
	s.Add(Flashcard{Question: "q2", Answer: "a2"})
	_ = s.Save()

	f, _, _, _ := cmdutil.TestFactory(t, nil)
	f.IOStreams.In = strings.NewReader("q\n")
	if err := runFlashcardReview(f, &reviewOptions{Seed: 1}); err != nil {
		t.Fatalf("runFlashcardReview: %v", err)
	}
	s2, _ := LoadStore()
	for _, c := range s2.Cards {
		if c.ReviewCount != 0 {
			t.Errorf("expected no reviews recorded after early quit, got %+v", c)
		}
	}
}

func TestRunStudy_RejectsNonPositive(t *testing.T) {
	if err := runStudy(context.Background(), &bytes.Buffer{}, &studyOptions{Minutes: 0}); err == nil {
		t.Error("expected error for minutes=0")
	}
}

func TestRunStudy_CancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // already done

	out := &bytes.Buffer{}
	start := time.Now()
	err := runStudy(ctx, out, &studyOptions{Minutes: 25, NoTick: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if time.Since(start) > 2*time.Second {
		t.Errorf("study did not return promptly on cancel")
	}
	if !strings.Contains(out.String(), "interrupted") {
		t.Errorf("expected 'interrupted' in output, got: %s", out.String())
	}
}

func TestStats(t *testing.T) {
	withTempStore(t)
	s, _ := LoadStore()
	s.Add(Flashcard{Question: "q1", Answer: "a1", Subject: "math", ReviewCount: 3, Correct: 2})
	s.Add(Flashcard{Question: "q2", Answer: "a2", Subject: "math", ReviewCount: 1, Correct: 1})
	s.Add(Flashcard{Question: "q3", Answer: "a3"})
	_ = s.Save()

	f, stdout, _, _ := cmdutil.TestFactory(t, nil)
	if err := runStats(f); err != nil {
		t.Fatalf("runStats: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &got); err != nil {
		t.Fatalf("invalid JSON: %v\n%s", err, stdout.String())
	}
	if got["total_cards"].(float64) != 3 {
		t.Errorf("total_cards = %v, want 3", got["total_cards"])
	}
	if got["total_reviews"].(float64) != 4 {
		t.Errorf("total_reviews = %v, want 4", got["total_reviews"])
	}
	if got["total_correct"].(float64) != 3 {
		t.Errorf("total_correct = %v, want 3", got["total_correct"])
	}
}
