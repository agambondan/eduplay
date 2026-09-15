package service

import (
	"fmt"
	"html"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
	"github.com/agambondan/eduplay/services/api/pkg/email"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type SupportService interface {
	CreateTicket(userID string, name, emailAddr, category, message string) (*model.SupportTicket, error)
}

type supportService struct {
	emailCl  *email.ResendClient
	notifyTo string
	log      *zap.Logger
}

// NewSupportService always notifies the fixed internal support inbox
// (notifyTo), never the submitter-supplied email address — otherwise this
// unauthenticated endpoint becomes an open relay that can send arbitrary
// HTML to any address the caller chooses.
func NewSupportService(emailCl *email.ResendClient, notifyTo string) SupportService {
	return &supportService{emailCl: emailCl, notifyTo: notifyTo, log: zap.L()}
}

func (s *supportService) CreateTicket(userID string, name, emailAddr, category, message string) (*model.SupportTicket, error) {
	ticket := &model.SupportTicket{
		Name:     name,
		Email:    emailAddr,
		Category: category,
		Message:  message,
		Status:   "open",
	}

	if userID != "" {
		uid, err := uuid.Parse(userID)
		if err == nil {
			ticket.UserID = &uid
		}
	}

	if err := database.DB.Create(ticket).Error; err != nil {
		return nil, fmt.Errorf("failed to save support ticket: %w", err)
	}

	if s.emailCl != nil && s.notifyTo != "" {
		subject := fmt.Sprintf("[EduPlay Support] %s - %s", category, name)
		body := fmt.Sprintf(
			"<h2>Support Ticket #%s</h2><p><strong>Name:</strong> %s</p><p><strong>Email:</strong> %s</p><p><strong>Category:</strong> %s</p><p><strong>Message:</strong></p><p>%s</p>",
			ticket.ID.String(), html.EscapeString(name), html.EscapeString(emailAddr),
			html.EscapeString(category), html.EscapeString(message),
		)
		go func() {
			if err := s.emailCl.Send(s.notifyTo, subject, body); err != nil {
				s.log.Warn("failed to send support notification email", zap.Error(err))
			}
		}()
	}

	return ticket, nil
}
