package workspace

import (
	"testing"
)

func TestAConfirmationTakesAwayACaution(t *testing.T) {
	m := listOf("https://a").Caution("Not kept").Confirm("Saved")
	if m.caution != "" || m.done != "Saved" {
		t.Errorf("caution %q, done %q", m.caution, m.done)
	}
}
