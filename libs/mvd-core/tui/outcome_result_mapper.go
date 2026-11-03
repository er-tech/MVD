package tui

// movingResult is what to tell the person about the move of the app.
func movingResult(outcome MoveOutcome, err error) (string, error) {
	switch {
	case err != nil:
		return "", err
	case outcome == MoveStarted:
		return "MVD was moved to its own folder. This window will close and the new copy will open.", nil
	case outcome == MoveAlreadyThere:
		return "MVD already lives in its own folder.", nil
	case outcome == MoveUnavailable:
		return "This machine has no place to move MVD to, or no way to ask. Start MVD with -move from a terminal.", nil
	}
	return "MVD was not moved.", nil
}

// removalResult is what to tell the person about the removal of the app.
func removalResult(outcome RemovalOutcome, err error) (string, error) {
	switch {
	case err != nil:
		return "", err
	case outcome == RemovalStarted:
		return "Removing MVD. This window will close.", nil
	case outcome == RemovalDeclined:
		return "Nothing was removed.", nil
	}
	return "This machine cannot ask for confirmation, so nothing was removed. Start MVD with -uninstall from a terminal.", nil
}
