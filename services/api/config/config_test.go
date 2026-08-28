package config

import (
	"reflect"
	"testing"
)

func TestParseAllowedOrigins(t *testing.T) {
	tests := []struct {
		name        string
		raw         string
		frontendURL string
		env         string
		want        []string
	}{
		{
			name: "empty in production yields no origins, never a wildcard",
			env:  "production",
			want: []string{},
		},
		{
			name: "empty outside production falls back to local dev",
			env:  "development",
			want: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		},
		{
			name: "comma separated list is split and trimmed",
			raw:  " https://eduplay.id , https://www.eduplay.id ",
			env:  "production",
			want: []string{"https://eduplay.id", "https://www.eduplay.id"},
		},
		{
			name: "trailing slashes are normalised away",
			raw:  "https://eduplay.id/",
			env:  "production",
			want: []string{"https://eduplay.id"},
		},
		{
			name:        "frontend url is included",
			raw:         "https://eduplay.id",
			frontendURL: "https://games.jangkauin.site",
			env:         "production",
			want:        []string{"https://eduplay.id", "https://games.jangkauin.site"},
		},
		{
			name:        "duplicates collapse",
			raw:         "https://eduplay.id,https://eduplay.id/",
			frontendURL: "https://eduplay.id",
			env:         "production",
			want:        []string{"https://eduplay.id"},
		},
		{
			name: "explicit config wins over dev fallback",
			raw:  "https://staging.eduplay.id",
			env:  "development",
			want: []string{"https://staging.eduplay.id"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseAllowedOrigins(tt.raw, tt.frontendURL, tt.env)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseAllowedOrigins(%q, %q, %q) = %#v, want %#v",
					tt.raw, tt.frontendURL, tt.env, got, tt.want)
			}
		})
	}
}

func TestParseAllowedOriginsNeverAllowsWildcard(t *testing.T) {
	for _, raw := range []string{"*", " * ", "https://eduplay.id,*"} {
		for _, origin := range parseAllowedOrigins(raw, "", "production") {
			if origin == "*" {
				t.Errorf("parseAllowedOrigins(%q) returned a wildcard origin", raw)
			}
		}
	}
}
