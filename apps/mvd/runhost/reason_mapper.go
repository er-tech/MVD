package runhost

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	searchedReason = regexp.MustCompile(`^found by searching: (.*?) by "(.*)" \((.*)\)$`)
	scoreItem      = regexp.MustCompile(`^(title|artist|length) (-?\d+)%$`)
)

// stillNote is what the lookup adds to a video it found whose picture does not move.
const stillNote = " (but it does not move)"

// plainReason says why a version was chosen as short sentences, one for each step. The lookup words
// it for the log, with brackets inside brackets; the page shows the sentences as a list.
func plainReason(reason string) []string {
	if reason == "" {
		return nil
	}
	still := strings.HasSuffix(reason, stillNote)
	reason = strings.TrimSuffix(reason, stillNote)
	var lines []string
	if parts := searchedReason.FindStringSubmatch(reason); parts != nil {
		lines = append(lines, fmt.Sprintf("Found by searching YouTube: %s by %s.", article(parts[1]), parts[2]))
		why := parts[3]
		if inner, found := strings.CutPrefix(why, "remembered ("); found {
			lines = append(lines, "Remembered from an earlier search for this song, so it was not searched again.")
			why = strings.TrimSuffix(inner, ")")
		}
		if matches := matchSentence(why); matches != "" {
			lines = append(lines, matches)
		}
	} else {
		lines = append(lines, capital(reason)+".")
	}
	if still {
		lines = append(lines, "The picture does not move, so it is not taken as the official video.")
	}

	return lines
}

// article puts "a" or "an" before a kind of video.
func article(kind string) string {
	if kind != "" && strings.ContainsRune("aeiou", rune(kind[0])) {
		return "an " + kind
	}

	return "a " + kind
}

// capital makes the first letter a capital.
func capital(text string) string {
	if text == "" {
		return text
	}

	return strings.ToUpper(text[:1]) + text[1:]
}

// matchSentence turns the marks of a match ("title 100%, artist's channel, same length") into a sentence.
func matchSentence(why string) string {
	if why == "" {
		return ""
	}
	var clauses []string
	for _, item := range strings.Split(why, ", ") {
		item = strings.TrimSpace(item)
		switch {
		case scoreItem.MatchString(item):
			parts := scoreItem.FindStringSubmatch(item)
			if parts[1] == "length" {
				clauses = append(clauses, "its length is "+parts[2]+"% off")
			} else {
				clauses = append(clauses, "the "+parts[1]+" matches "+parts[2]+"%")
			}
		case item == "artist's channel":
			clauses = append(clauses, "it is on the artist's channel")
		case item == "same length":
			clauses = append(clauses, "it is as long as the song")
		case strings.HasPrefix(item, "YouTube Music: "):
			clauses = append(clauses, "YouTube Music calls it "+strings.TrimPrefix(item, "YouTube Music: "))
		default:
			clauses = append(clauses, item)
		}
	}

	return "Why it fits: " + strings.Join(clauses, "; ") + "."
}
