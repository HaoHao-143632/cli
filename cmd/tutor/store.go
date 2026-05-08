// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

package tutor

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/larksuite/cli/internal/core"
)

// Flashcard is one Q&A pair saved by the user.
type Flashcard struct {
	ID          int        `json:"id"`
	Subject     string     `json:"subject,omitempty"`
	Question    string     `json:"question"`
	Answer      string     `json:"answer"`
	Tags        []string   `json:"tags,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
	ReviewCount int        `json:"review_count"`
	Correct     int        `json:"correct"`
}

// Store is the on-disk container for flashcards.
type Store struct {
	NextID int         `json:"next_id"`
	Cards  []Flashcard `json:"cards"`
}

// StorePath returns the path to the tutor JSON file.
// It honors LARKSUITE_CLI_CONFIG_DIR via core.GetConfigDir.
func StorePath() string {
	return filepath.Join(core.GetConfigDir(), "tutor.json")
}

// LoadStore reads the store from disk. Missing file yields an empty store.
func LoadStore() (*Store, error) {
	path := StorePath()
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Store{}, nil
		}
		return nil, err
	}
	s := &Store{}
	if err := json.Unmarshal(data, s); err != nil {
		return nil, fmt.Errorf("invalid tutor store: %w", err)
	}
	return s, nil
}

// Save writes the store atomically (write+rename) with 0600 permissions.
func (s *Store) Save() error {
	dir := core.GetConfigDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	path := StorePath()
	tmp, err := os.CreateTemp(dir, "tutor-*.json")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	enc := json.NewEncoder(tmp)
	enc.SetIndent("", "  ")
	if err := enc.Encode(s); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tmpName, 0600); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

// Add appends a new card and returns the assigned ID.
func (s *Store) Add(c Flashcard) Flashcard {
	if s.NextID == 0 {
		s.NextID = 1
	}
	c.ID = s.NextID
	s.NextID++
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	s.Cards = append(s.Cards, c)
	return c
}

// Delete removes the card with the given ID. Returns false if not found.
func (s *Store) Delete(id int) bool {
	for i, c := range s.Cards {
		if c.ID == id {
			s.Cards = append(s.Cards[:i], s.Cards[i+1:]...)
			return true
		}
	}
	return false
}

// Find returns a pointer into s.Cards for the given ID, or nil.
func (s *Store) Find(id int) *Flashcard {
	for i := range s.Cards {
		if s.Cards[i].ID == id {
			return &s.Cards[i]
		}
	}
	return nil
}

// Filter returns cards matching the given subject (case-insensitive).
// An empty subject matches all cards.
func (s *Store) Filter(subject string) []Flashcard {
	if subject == "" {
		out := make([]Flashcard, len(s.Cards))
		copy(out, s.Cards)
		return out
	}
	want := strings.ToLower(subject)
	var out []Flashcard
	for _, c := range s.Cards {
		if strings.ToLower(c.Subject) == want {
			out = append(out, c)
		}
	}
	return out
}

// Subjects returns the sorted, distinct subjects present in the store.
func (s *Store) Subjects() []string {
	seen := make(map[string]struct{})
	for _, c := range s.Cards {
		if c.Subject != "" {
			seen[c.Subject] = struct{}{}
		}
	}
	out := make([]string, 0, len(seen))
	for k := range seen {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
