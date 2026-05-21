package controller

import (
	"strconv"

	"github.com/agambondan/eduplay/services/api/internal/service"
	"github.com/agambondan/eduplay/services/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type BlogController struct {
	svc *service.BlogService
}

func NewBlogController(svc *service.BlogService) *BlogController {
	return &BlogController{svc: svc}
}

func (h *BlogController) ListPosts(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	category := c.Query("cat")

	var result *service.BlogListResponse
	var err error
	if category != "" {
		result, err = h.svc.ListByCategory(category, page, limit)
	} else {
		result, err = h.svc.List(page, limit)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch posts")
	}
	return response.Success(c, result)
}

func (h *BlogController) GetPost(c *fiber.Ctx) error {
	slug := c.Params("slug")
	post, err := h.svc.GetBySlug(slug)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Post not found")
	}
	return response.Success(c, post)
}

type blogCreateInput struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Excerpt string `json:"excerpt"`
	Tag     string `json:"tags"`
	Image   string `json:"image_url"`
	Publish bool   `json:"is_published"`
	Cat     string `json:"category"`
}

func (h *BlogController) AdminCreate(c *fiber.Ctx) error {
	var req blogCreateInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if req.Title == "" || req.Content == "" {
		return response.Error(c, fiber.StatusBadRequest, "Title and content required")
	}
	post, err := h.svc.Create(req.Title, req.Content, req.Excerpt, req.Cat, req.Tag, req.Image, req.Publish)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, post)
}

func (h *BlogController) AdminUpdate(c *fiber.Ctx) error {
	id := c.Params("id")
	var req blogCreateInput
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	post, err := h.svc.Update(id, req.Title, req.Content, req.Excerpt, req.Cat, req.Tag, req.Image, req.Publish)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Post not found")
	}
	return response.Success(c, post)
}

func (h *BlogController) AdminDelete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Delete(id); err != nil {
		return response.Error(c, fiber.StatusNotFound, "Post not found")
	}
	return response.Success(c, fiber.Map{"message": "Post deleted"})
}

func (h *BlogController) AdminList(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	posts, total, err := h.svc.AdminList(page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Failed to fetch posts")
	}
	return response.Success(c, fiber.Map{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
