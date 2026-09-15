package service

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/agambondan/eduplay/services/api/config"
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
	"github.com/agambondan/eduplay/services/api/pkg/cache"
	"github.com/agambondan/eduplay/services/api/pkg/profanity"
)

// allowedAvatarTypes maps sniffed content types to a fixed, safe extension.
// The client-supplied filename/extension is never trusted for anything —
// using it verbatim would let a script-bearing file (e.g. .svg or .html
// renamed to look like an image) get served back from the API's own origin.
var allowedAvatarTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

var ErrInvalidAvatarType = errors.New("File harus berupa gambar (jpg, png, gif, atau webp)")

type UserService interface {
	GetProfile(id string) (*model.User, error)
	UpdateProfile(id string, username string) (*model.User, error)
	GetStats(id string) (*repository.Stats, error)
	UpdateStreak(id string) error
	UploadAvatar(userID string, file multipart.File, header *multipart.FileHeader) (string, error)
}

type userService struct {
	repo repository.UserRepository
	cfg  *config.Config
}

func NewUserService(repo repository.UserRepository, cfg *config.Config) UserService {
	return &userService{repo: repo, cfg: cfg}
}

func (s *userService) GetProfile(id string) (*model.User, error) {
	ctx := context.Background()
	return cache.GetOrSet(ctx, "user_profile", id, 30*time.Second, func() (*model.User, error) {
		return s.repo.FindByID(id)
	})
}

func (s *userService) UpdateProfile(id string, username string) (*model.User, error) {
	filter := profanity.NewFilter()
	if !filter.IsClean(username) {
		return nil, errors.New("Username mengandung kata yang tidak pantas")
	}

	u, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	u.Username = username
	if err := s.repo.Update(u); err != nil {
		return nil, err
	}
	ctx := context.Background()
	cache.Del(ctx, "user_profile", id)
	return u, nil
}

func (s *userService) GetStats(id string) (*repository.Stats, error) {
	ctx := context.Background()
	return cache.GetOrSet(ctx, "user_stats", id, 30*time.Second, func() (*repository.Stats, error) {
		return s.repo.GetStats(id)
	})
}

func (s *userService) UpdateStreak(id string) error {
	return s.repo.UpdateStreak(id)
}

func (s *userService) UploadAvatar(userID string, file multipart.File, header *multipart.FileHeader) (string, error) {
	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return "", err
	}
	head = head[:n]

	contentType := http.DetectContentType(head)
	ext, ok := allowedAvatarTypes[contentType]
	if !ok {
		return "", ErrInvalidAvatarType
	}

	filename := userID + ext
	savePath := filepath.Join(s.cfg.AvatarUploadPath, filename)

	if err := os.MkdirAll(s.cfg.AvatarUploadPath, 0o755); err != nil {
		return "", err
	}

	dst, err := os.Create(savePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := dst.Write(head); err != nil {
		return "", err
	}
	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	url := "/uploads/avatars/" + filename

	u, err := s.repo.FindByID(userID)
	if err != nil {
		return "", err
	}
	u.AvatarURL = url
	if err := s.repo.Update(u); err != nil {
		return "", err
	}

	ctx := context.Background()
	cache.Del(ctx, "user_profile", userID)

	return url, nil
}
