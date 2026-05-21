package service

import (
	"regexp"
	"strings"
	"time"

	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/internal/repository"
)

type BlogService struct {
	repo *repository.BlogRepository
}

func NewBlogService(repo *repository.BlogRepository) *BlogService {
	return &BlogService{repo: repo}
}

type BlogListResponse struct {
	Posts      []model.BlogPost `json:"posts"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	Categories []string         `json:"categories"`
}

func (s *BlogService) List(page, limit int) (*BlogListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	posts, total, err := s.repo.List(page, limit)
	if err != nil {
		return nil, err
	}
	categories, _ := s.repo.ListCategories()
	if posts == nil {
		posts = []model.BlogPost{}
	}
	return &BlogListResponse{Posts: posts, Total: total, Page: page, Limit: limit, Categories: categories}, nil
}

func (s *BlogService) ListByCategory(category string, page, limit int) (*BlogListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	posts, total, err := s.repo.ListByCategory(category, page, limit)
	if err != nil {
		return nil, err
	}
	categories, _ := s.repo.ListCategories()
	if posts == nil {
		posts = []model.BlogPost{}
	}
	return &BlogListResponse{Posts: posts, Total: total, Page: page, Limit: limit, Categories: categories}, nil
}

func (s *BlogService) GetBySlug(slug string) (*model.BlogPost, error) {
	return s.repo.FindBySlug(slug)
}

func (s *BlogService) AdminList(page, limit int) ([]model.BlogPost, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	return s.repo.AdminList(page, limit)
}

func (s *BlogService) Create(title, content, excerpt, category, tags, imageURL string, publish bool) (*model.BlogPost, error) {
	slug := slugify(title)
	p := &model.BlogPost{
		Slug:        slug,
		Title:       title,
		Content:     content,
		Excerpt:     excerpt,
		Category:    category,
		Tags:        tags,
		ImageURL:    imageURL,
		IsPublished: publish,
	}
	if publish {
		now := time.Now()
		p.PublishedAt = &now
	}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *BlogService) Update(id, title, content, excerpt, category, tags, imageURL string, publish bool) (*model.BlogPost, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	p.Title = title
	p.Content = content
	p.Excerpt = excerpt
	p.Category = category
	p.Tags = tags
	p.ImageURL = imageURL
	p.IsPublished = publish
	if publish && p.PublishedAt == nil {
		now := time.Now()
		p.PublishedAt = &now
	}
	if err := s.repo.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *BlogService) Delete(id string) error {
	return s.repo.Delete(id)
}

func slugify(title string) string {
	s := strings.ToLower(title)
	re := regexp.MustCompile(`[^a-z0-9\s-]`)
	s = re.ReplaceAllString(s, "")
	re = regexp.MustCompile(`[\s-]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 180 {
		s = s[:180]
	}
	s = strings.TrimRight(s, "-")
	return s + "-" + time.Now().Format("150405")
}
