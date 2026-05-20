package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

type ResendClient struct {
	apiKey      string
	fromAddress string
	httpClient  *http.Client
	log         *zap.Logger
}

type sendEmailRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

func NewResendClient(apiKey, fromAddress string, log *zap.Logger) *ResendClient {
	return &ResendClient{
		apiKey:      apiKey,
		fromAddress: fromAddress,
		httpClient:  &http.Client{Timeout: 10 * time.Second},
		log:         log,
	}
}

func (c *ResendClient) Send(to, subject, htmlContent string) error {
	body := sendEmailRequest{
		From:    c.fromAddress,
		To:      to,
		Subject: subject,
		HTML:    htmlContent,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal email payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		c.log.Warn("resend API returned non-200", zap.Int("status", resp.StatusCode), zap.Any("response", errResp))
		return fmt.Errorf("resend API error: status %d", resp.StatusCode)
	}

	return nil
}
