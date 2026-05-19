package user

type Service interface {
	GetProfile(id string) (*User, error)
	UpdateProfile(id string, username string) (*User, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetProfile(id string) (*User, error) {
	return s.repo.FindByID(id)
}

func (s *service) UpdateProfile(id string, username string) (*User, error) {
	u, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	u.Username = username
	if err := s.repo.Update(u); err != nil {
		return nil, err
	}
	return u, nil
}
