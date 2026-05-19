package user

import (
	"github.com/agambondan/eduplay/backend/pkg/database"
)

type Repository interface {
	Create(user *User) error
	FindByEmail(email string) (*User, error)
	FindByID(id string) (*User, error)
	Update(user *User) error
}

type repository struct{}

func NewRepository() Repository {
	return &repository{}
}

func (r *repository) Create(user *User) error {
	return database.DB.Create(user).Error
}

func (r *repository) FindByEmail(email string) (*User, error) {
	var user User
	err := database.DB.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *repository) FindByID(id string) (*User, error) {
	var user User
	err := database.DB.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *repository) Update(user *User) error {
	return database.DB.Save(user).Error
}
