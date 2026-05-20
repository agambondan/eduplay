package profanity

import "strings"

type Filter struct {
	badWords []string
}

func NewFilter() *Filter {
	return &Filter{
		badWords: []string{
			"anjing", "babi", "bangsat", "kampret", "setan",
			"tolol", "bodoh", "goblok", "sial", "brengsek",
			"tai", "kontol", "memek", "ngentot", "bajingan",
			"keparat", "asu", "jancuk", "perek", "peler",
		},
	}
}

func (f *Filter) IsClean(s string) bool {
	lower := strings.ToLower(s)
	for _, word := range f.badWords {
		if strings.Contains(lower, word) {
			return false
		}
	}
	return true
}

func (f *Filter) Sanitize(s string) string {
	lower := strings.ToLower(s)
	result := s
	for _, word := range f.badWords {
		if strings.Contains(lower, word) {
			result = strings.ReplaceAll(result, word, "***")
			result = strings.ReplaceAll(result, strings.ToUpper(word), "***")
			result = strings.ReplaceAll(result, strings.Title(word), "***")
			lower = strings.ToLower(result)
		}
	}
	return result
}
