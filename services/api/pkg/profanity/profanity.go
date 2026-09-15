package profanity

import "regexp"

type Filter struct {
	patterns []*regexp.Regexp
}

func NewFilter() *Filter {
	words := []string{
		"anjing", "babi", "bangsat", "kampret", "setan",
		"tolol", "bodoh", "goblok", "sial", "brengsek",
		"tai", "kontol", "memek", "ngentot", "bajingan",
		"keparat", "asu", "jancuk", "perek", "peler",
	}
	patterns := make([]*regexp.Regexp, len(words))
	for i, w := range words {
		// \b word boundaries stop short fragments like "asu"/"tai" from
		// matching inside benign words such as "asuransi" or "santai", and
		// (?i) makes matching (and therefore Sanitize's redaction) work for
		// any case variant, not just lower/upper/Title — so IsClean and
		// Sanitize always agree on what's dirty.
		patterns[i] = regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(w) + `\b`)
	}
	return &Filter{patterns: patterns}
}

func (f *Filter) IsClean(s string) bool {
	for _, p := range f.patterns {
		if p.MatchString(s) {
			return false
		}
	}
	return true
}

func (f *Filter) Sanitize(s string) string {
	result := s
	for _, p := range f.patterns {
		result = p.ReplaceAllString(result, "***")
	}
	return result
}
