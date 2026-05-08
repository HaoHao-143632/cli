// Copyright (c) 2026 Lark Technologies Pte. Ltd.
// SPDX-License-Identifier: MIT

// Package tutor implements the `lark-cli tutor` command — a local,
// offline learning helper. It manages a JSON-backed flashcard deck
// (add/list/delete/review) and a simple study (pomodoro) timer.
//
// All data lives in a single file under the standard config dir
// (see core.GetConfigDir), so it works offline and does not require
// Lark authentication.
package tutor

import (
	"github.com/spf13/cobra"

	"github.com/larksuite/cli/internal/cmdutil"
)

// NewCmdTutor returns the root `tutor` command with all subcommands attached.
func NewCmdTutor(f *cmdutil.Factory) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tutor",
		Short: "Local learning helper: flashcards and study timer",
		Long: `Local, offline learning helper.

The tutor command stores flashcards (Q&A pairs) in a JSON file under the
config directory, and provides a small set of study tools that do not
require Lark authentication or network access.

EXAMPLES:
    # add a flashcard
    lark-cli tutor flashcard add --question "What is 2+2?" --answer "4" --subject math

    # list all flashcards (or filter by subject)
    lark-cli tutor flashcard list
    lark-cli tutor flashcard list --subject math

    # interactive review (random order)
    lark-cli tutor flashcard review --subject math --limit 10

    # delete a card
    lark-cli tutor flashcard delete 3

    # 25-minute study (pomodoro) timer
    lark-cli tutor study --minutes 25`,
	}
	cmdutil.DisableAuthCheck(cmd)

	cmd.AddCommand(newCmdFlashcard(f))
	cmd.AddCommand(newCmdStudy(f))
	cmd.AddCommand(newCmdStats(f))

	return cmd
}
