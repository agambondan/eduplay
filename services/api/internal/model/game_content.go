package model

type Country struct {
	ID        uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string `gorm:"not null" json:"name"`
	Capital   string `gorm:"not null" json:"capital"`
	FlagEmoji string `gorm:"not null" json:"flag_emoji"`
	FlagCode  string `gorm:"not null;size:2" json:"flag_code"`
	Region    string `json:"region"`
}

type ChemicalElement struct {
	ID     uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Symbol string `gorm:"not null;uniqueIndex;size:3" json:"symbol"`
	Name   string `gorm:"not null" json:"name"`
	Number int    `gorm:"not null" json:"number"`
}

type HistoryEvent struct {
	ID          uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Description string `gorm:"not null" json:"description"`
	Year        int    `gorm:"not null" json:"year"`
	Region      string `gorm:"not null;default:'world'" json:"region"`
}

type WordleWord struct {
	ID       uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Word     string `gorm:"not null;uniqueIndex;size:5" json:"word"`
	Language string `gorm:"not null;default:'id'" json:"language"`
}
