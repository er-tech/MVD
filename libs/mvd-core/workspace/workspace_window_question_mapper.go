package workspace

import (
	"youtube-downloader/libs/mvd-core/program"

	"youtube-downloader/libs/mvd-core/workspace/closequestion"
	"youtube-downloader/libs/mvd-core/workspace/windowsnapshot"
)

// The ids of the buttons of the questions, as a themed window sends them back.
const (
	questionQuit   = "quit"
	questionKeep   = "keep"
	questionOK     = "ok"
	questionCancel = "cancel"
)

// windowQuestion is the question or note open over the window, for a theme to draw as its system's
// dialog, or nil when there is none.
func (m Model) windowQuestion() *windowsnapshot.Question {
	switch {
	case m.closing.On:
		what, ask := closequestion.Words(m.downloading())

		return &windowsnapshot.Question{
			ID: windowsnapshot.QuestionQuit, Title: "Quit MVD?", Tone: windowsnapshot.ToneCaution, Lines: []string{what, ask},
			Buttons: []windowsnapshot.Button{
				{ID: questionQuit, Label: closequestion.Answers[closequestion.AnswerQuit], Role: windowsnapshot.RoleOther, Enabled: true},
				// Keeping the downloads is the safe answer: Return and Esc both choose it.
				{ID: questionKeep, Label: closequestion.Answers[closequestion.AnswerKeep], Role: windowsnapshot.RoleDefault, Enabled: true},
			},
		}
	case m.inline.on:
		title := "Change the address"
		if m.inline.adding {
			title = "Add a source"
		}

		return &windowsnapshot.Question{
			ID: windowsnapshot.QuestionAsk, Title: title, Tone: windowsnapshot.ToneAsk,
			Field: &windowsnapshot.QuestionField{Label: "Address", Text: m.inline.text},
			Buttons: []windowsnapshot.Button{
				{ID: questionOK, Label: "OK", Role: windowsnapshot.RoleDefault, Enabled: true},
				{ID: questionCancel, Label: "Cancel", Role: windowsnapshot.RoleCancel, Enabled: true},
			},
		}
	case m.asking != askNone:
		prompt := m.askPrompt

		return &windowsnapshot.Question{
			ID: windowsnapshot.QuestionAsk, Title: prompt, Tone: windowsnapshot.ToneAsk,
			Field: &windowsnapshot.QuestionField{Label: prompt, Text: m.askText},
			Buttons: []windowsnapshot.Button{
				{ID: questionOK, Label: "OK", Role: windowsnapshot.RoleDefault, Enabled: true},
				{ID: questionCancel, Label: "Cancel", Role: windowsnapshot.RoleCancel, Enabled: true},
			},
		}
	case m.about:
		version := m.host.Version
		if version == "" {
			version = "dev"
		}
		head := []string{"MVD - Music Video Downloader", "Version " + version}
		if note := m.updateNote(); note != "" {
			head = append(head, note)
		}
		lines := append(head, aboutParagraphs...)

		return &windowsnapshot.Question{
			ID: windowsnapshot.QuestionAbout, Title: entryAbout, Tone: windowsnapshot.ToneNote,
			Lines:   append(lines, aboutFooter, projectURL),
			Buttons: []windowsnapshot.Button{{ID: questionOK, Label: "OK", Role: windowsnapshot.RoleDefault, Enabled: true}},
		}
	case m.shortcuts:
		var sections []windowsnapshot.QuestionSection
		for _, section := range shortcutSections() {
			out := windowsnapshot.QuestionSection{Heading: section.heading}
			for _, k := range section.keys {
				out.Rows = append(out.Rows, windowsnapshot.QuestionRow{Keys: k.keys, Does: k.does})
			}
			sections = append(sections, out)
		}

		return &windowsnapshot.Question{
			ID: windowsnapshot.QuestionShortcuts, Title: entryShortcuts, Tone: windowsnapshot.ToneNote, Sections: sections,
			Buttons: []windowsnapshot.Button{{ID: questionOK, Label: "OK", Role: windowsnapshot.RoleDefault, Enabled: true}},
		}
	}

	return nil
}

// questionIntent answers the question or note open over the window, as its keys would.
func (m Model) questionIntent(in windowsnapshot.Intent) (program.Model, program.Cmd) {
	switch {
	case m.closing.On && in.Kind == windowsnapshot.IntentQuestionButton:
		if in.ID == questionQuit {
			return m.quitNow()
		}
		m.closing = closequestion.State{}
	case m.inline.on && in.Kind == windowsnapshot.IntentQuestionText:
		m.inline.text = in.Text
	case m.inline.on && in.Kind == windowsnapshot.IntentQuestionButton:
		if in.ID == questionOK {
			return m.inlineEnter(), nil
		}

		return m.stopInline(false), nil
	case m.asking != askNone && in.Kind == windowsnapshot.IntentQuestionText:
		m.askText = in.Text
	case m.asking != askNone && in.Kind == windowsnapshot.IntentQuestionButton:
		if in.ID == questionOK {
			return m.answer()
		}
		m.asking = askNone
	case in.Kind == windowsnapshot.IntentQuestionButton:
		m.about, m.shortcuts = false, false
	}

	return m, nil
}
