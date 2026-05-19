package ai

import "fmt"

func GetPrompt(gameType string, difficulty string, count int) string {
	switch gameType {
	case "math-quiz":
		return fmt.Sprintf(`Generate %d math quiz questions in JSON array format. Difficulty: %s.
Each question has: question (string), options (array of 4 strings), answer (string matching one option).
Easy: numbers 1-20, Medium: 1-100, Hard: 1-1000 mixed operations.
Return ONLY valid JSON array, no explanation.`, count, difficulty)
	case "spelling-bee":
		return fmt.Sprintf(`Generate %d Indonesian spelling questions in JSON array format. Difficulty: %s.
Each has: question (definition/clue), answer (the Indonesian word).
Return ONLY valid JSON array.`, count, difficulty)
	case "capital-quiz":
		return fmt.Sprintf(`Generate %d capital city quiz questions in JSON array format. Difficulty: %s.
Each has: question (country name), options (4 city names), answer (correct capital).
Return ONLY valid JSON array.`, count, difficulty)
	default:
		return fmt.Sprintf(`Generate %d educational quiz questions in JSON array format. Difficulty: %s.
Each has: question, options (4 choices), answer.
Return ONLY valid JSON array.`, count, difficulty)
	}
}
