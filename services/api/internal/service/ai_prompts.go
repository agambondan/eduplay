package service

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
	case "flag-quiz":
		return fmt.Sprintf(`Generate %d flag quiz questions in JSON array format. Difficulty: %s.
Each has: question (country name or "Bendera negara X"), options (4 country names), answer (correct country name matching the flag).
Include diverse countries from all continents, not just well-known ones.
Return ONLY valid JSON array.`, count, difficulty)
	case "element-quiz":
		return fmt.Sprintf(`Generate %d chemistry element questions in JSON array format. Difficulty: %s.
Each has: question (element symbol or description like "simbol Au"), options (4 element names), answer (correct element name).
Include elements from the periodic table with their Indonesian names.
Return ONLY valid JSON array.`, count, difficulty)
	case "timeline-history":
		return fmt.Sprintf(`Generate %d world history timeline questions in JSON array format. Difficulty: %s.
Each has: question (historical event description), options (4 different years as numbers), answer (correct year as string).
Cover diverse world history events from different centuries and continents.
Return ONLY valid JSON array.`, count, difficulty)
	default:
		return fmt.Sprintf(`Generate %d educational quiz questions in JSON array format. Difficulty: %s.
Each has: question, options (4 choices), answer.
Return ONLY valid JSON array.`, count, difficulty)
	}
}
