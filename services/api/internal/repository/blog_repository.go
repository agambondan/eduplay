package repository

import (
	"github.com/agambondan/eduplay/services/api/internal/model"
	"github.com/agambondan/eduplay/services/api/pkg/database"
)

type BlogRepository struct{}

func NewBlogRepository() *BlogRepository {
	return &BlogRepository{}
}

func (r *BlogRepository) List(page, limit int) ([]model.BlogPost, int64, error) {
	var posts []model.BlogPost
	var total int64
	database.DB.Model(&model.BlogPost{}).Where("is_published = ?", true).Count(&total)
	err := database.DB.Where("is_published = ?", true).
		Order("published_at desc").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&posts).Error
	return posts, total, err
}

func (r *BlogRepository) ListByCategory(category string, page, limit int) ([]model.BlogPost, int64, error) {
	var posts []model.BlogPost
	var total int64
	database.DB.Model(&model.BlogPost{}).Where("is_published = ? AND category = ?", true, category).Count(&total)
	err := database.DB.Where("is_published = ? AND category = ?", true, category).
		Order("published_at desc").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&posts).Error
	return posts, total, err
}

func (r *BlogRepository) FindBySlug(slug string) (*model.BlogPost, error) {
	var post model.BlogPost
	err := database.DB.Where("slug = ? AND is_published = ?", slug, true).First(&post).Error
	return &post, err
}

func (r *BlogRepository) FindByID(id string) (*model.BlogPost, error) {
	var post model.BlogPost
	err := database.DB.First(&post, "id = ?", id).Error
	return &post, err
}

func (r *BlogRepository) Create(post *model.BlogPost) error {
	return database.DB.Create(post).Error
}

func (r *BlogRepository) Update(post *model.BlogPost) error {
	return database.DB.Save(post).Error
}

func (r *BlogRepository) Delete(id string) error {
	return database.DB.Delete(&model.BlogPost{}, "id = ?", id).Error
}

func (r *BlogRepository) AdminList(page, limit int) ([]model.BlogPost, int64, error) {
	var posts []model.BlogPost
	var total int64
	database.DB.Model(&model.BlogPost{}).Count(&total)
	err := database.DB.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&posts).Error
	return posts, total, err
}

func (r *BlogRepository) ListCategories() ([]string, error) {
	var cats []string
	err := database.DB.Model(&model.BlogPost{}).
		Select("DISTINCT category").
		Where("is_published = ? AND category != ''", true).
		Order("category asc").
		Pluck("category", &cats).Error
	return cats, err
}
