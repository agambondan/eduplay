package service

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The real shape of an https://oauth2.googleapis.com/tokeninfo 200 response:
// every value is a JSON string, booleans and timestamps included.
const realGoogleTokenInfo = `{
 "iss": "https://accounts.google.com",
 "azp": "645958080246-x.apps.googleusercontent.com",
 "aud": "645958080246-x.apps.googleusercontent.com",
 "sub": "112233445566778899000",
 "email": "firman@gmail.com",
 "email_verified": "true",
 "name": "Firman Agam",
 "iat": "1787926274",
 "exp": "1787929874",
 "alg": "RS256"
}`

func TestGoogleTokenInfoDecodesRealResponse(t *testing.T) {
	var info googleTokenInfo
	require.NoError(t, json.Unmarshal([]byte(realGoogleTokenInfo), &info),
		"the live tokeninfo payload must decode; a failure here rejects every Google login")

	assert.Equal(t, "112233445566778899000", info.Sub)
	assert.Equal(t, "firman@gmail.com", info.Email)
	assert.Equal(t, "Firman Agam", info.Name)
	assert.Equal(t, "https://accounts.google.com", info.Iss)
	assert.True(t, bool(info.EmailVerified), `"true" as a string must decode to true`)
}

func TestGoogleBoolAcceptsBothShapes(t *testing.T) {
	cases := []struct {
		raw  string
		want bool
	}{
		{`"true"`, true}, // what tokeninfo actually sends
		{`"false"`, false},
		{`true`, true}, // if Google ever switches to a real bool
		{`false`, false},
	}

	for _, tc := range cases {
		var b googleBool
		require.NoError(t, json.Unmarshal([]byte(tc.raw), &b), "raw=%s", tc.raw)
		assert.Equal(t, tc.want, bool(b), "raw=%s", tc.raw)
	}
}

func TestGoogleBoolRejectsGarbage(t *testing.T) {
	for _, raw := range []string{`"yes"`, `123`, `{}`, `[]`} {
		var b googleBool
		assert.Error(t, json.Unmarshal([]byte(raw), &b), "raw=%s should not decode", raw)
	}
}

// Go unmarshals JSON null into a bool as a documented no-op, so a null or
// missing email_verified stays false. That is the safe direction: the login is
// then rejected as unverified rather than waved through.
func TestGoogleBoolNullIsUnverified(t *testing.T) {
	b := googleBool(true)
	require.NoError(t, json.Unmarshal([]byte(`null`), &b))
	assert.False(t, bool(b), "null must not be treated as verified")

	var info googleTokenInfo
	require.NoError(t, json.Unmarshal([]byte(`{"sub":"1"}`), &info))
	assert.False(t, bool(info.EmailVerified), "a missing email_verified must not be treated as verified")
}

func TestUnverifiedEmailStillRejected(t *testing.T) {
	var info googleTokenInfo
	require.NoError(t, json.Unmarshal([]byte(`{"email_verified":"false"}`), &info))
	assert.False(t, bool(info.EmailVerified),
		"an unverified Google email must not be treated as verified")
}
