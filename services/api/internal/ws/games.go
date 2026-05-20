package ws

import (
	"math/rand"
	"strings"

	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type WordleDuelGame struct {
	TargetWord  string
	Guesses     map[string][]WordleGuess
	PlayerWords map[string]string
}

type WordleGuess struct {
	Word   string `json:"word"`
	Result string `json:"result"`
}

var wordleWords []string

func initWordleWords() {
	if len(wordleWords) > 0 {
		return
	}
	type row struct{ Word string }
	var rows []row
	database.DB.Raw("SELECT word FROM wordle_words WHERE LENGTH(word) = 5 AND language = 'id'").Scan(&rows)
	for _, r := range rows {
		wordleWords = append(wordleWords, strings.ToLower(r.Word))
	}
	if len(wordleWords) == 0 {
		wordleWords = []string{"rumah", "makan", "minum", "buku", "meja", "kursi", "pintu", "lampu", "kertas", "sepatu"}
	}
}

func pickWordleWord() string {
	initWordleWords()
	return wordleWords[rand.Intn(len(wordleWords))]
}

func evaluateWordleGuess(guess, target string) string {
	guess = strings.ToLower(guess)
	target = strings.ToLower(target)

	result := make([]byte, 5)
	targetChars := []byte(target)
	used := make([]bool, 5)

	for i := 0; i < 5; i++ {
		if guess[i] == target[i] {
			result[i] = 'G'
			used[i] = true
		} else {
			result[i] = 'B'
		}
	}

	for i := 0; i < 5; i++ {
		if result[i] == 'G' {
			continue
		}
		for j := 0; j < 5; j++ {
			if !used[j] && guess[i] == targetChars[j] {
				result[i] = 'Y'
				used[j] = true
				break
			}
		}
	}

	return string(result)
}

type SudokuRaceGame struct {
	Puzzle   [9][9]int
	Solution [9][9]int
	Progress map[string]int
}

func generateSudokuPuzzle(difficulty string) [9][9]int {
	board := [9][9]int{}
	solveSudoku(&board)
	clues := 36
	switch difficulty {
	case "easy":
		clues = 38
	case "medium":
		clues = 30
	case "hard":
		clues = 24
	}

	cells := make([]int, 81)
	for i := range cells {
		cells[i] = i
	}
	rand.Shuffle(len(cells), func(i, j int) { cells[i], cells[j] = cells[j], cells[i] })

	toRemove := 81 - clues
	for i := 0; i < toRemove && i < len(cells); i++ {
		r, c := cells[i]/9, cells[i]%9
		board[r][c] = 0
	}

	return board
}

func solveSudoku(board *[9][9]int) bool {
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			if board[r][c] == 0 {
				nums := rand.Perm(9)
				for _, n := range nums {
					num := n + 1
					if isValidSudokuMove(board, r, c, num) {
						board[r][c] = num
						if solveSudoku(board) {
							return true
						}
						board[r][c] = 0
					}
				}
				return false
			}
		}
	}
	return true
}

func isValidSudokuMove(board *[9][9]int, row, col, num int) bool {
	for i := 0; i < 9; i++ {
		if board[row][i] == num || board[i][col] == num {
			return false
		}
	}
	br, bc := (row/3)*3, (col/3)*3
	for i := br; i < br+3; i++ {
		for j := bc; j < bc+3; j++ {
			if board[i][j] == num {
				return false
			}
		}
	}
	return true
}

func isSudokuComplete(board *[9][9]int, solution *[9][9]int) bool {
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			if board[r][c] != solution[r][c] {
				return false
			}
		}
	}
	return true
}

func countSudokuFilled(board *[9][9]int) int {
	count := 0
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			if board[r][c] > 0 {
				count++
			}
		}
	}
	return count
}

func sudokuProgress(board *[9][9]int) int {
	total := 81
	filled := countSudokuFilled(board)
	return filled * 100 / total
}


