package profanity

import "testing"

func TestProfanityFilter_IsClean(t *testing.T) {
	filter := NewFilter()

	cleanInputs := []string{
		"Halo Dunia",
		"Belajar matematika seru!",
		"EduPlay 123",
		"Santai dulu di pantai",
		"Beli asuransi dulu ya",
		"masukan kamu berguna",
	}
	for _, input := range cleanInputs {
		if !filter.IsClean(input) {
			t.Errorf("expected clean input '%s' to be clean", input)
		}
	}

	dirtyInputs := []string{
		"dasar anjing kamu",
		"BOdoH sekali",
		"Goblok",
	}
	for _, input := range dirtyInputs {
		if filter.IsClean(input) {
			t.Errorf("expected dirty input '%s' to be flagged", input)
		}
	}
}

func TestProfanityFilter_Sanitize(t *testing.T) {
	filter := NewFilter()

	input := "kamu anjing dan bodoh"
	sanitized := filter.Sanitize(input)
	if filter.IsClean(input) {
		t.Errorf("expected dirty input to not be clean")
	}
	if !filter.IsClean(sanitized) {
		t.Errorf("expected sanitized string '%s' to be clean", sanitized)
	}
}

func TestProfanityFilter_Sanitize_MixedCase(t *testing.T) {
	filter := NewFilter()

	// A case pattern that isn't exactly lower/upper/Title must still be
	// redacted, since IsClean would flag it as dirty either way.
	input := "aNjInG banget"
	sanitized := filter.Sanitize(input)
	if !filter.IsClean(sanitized) {
		t.Errorf("expected sanitized string '%s' to be clean", sanitized)
	}
}
