package db

import (
	"context"
	"bytes"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var database *mongo.Database

func DB() *mongo.Database {
	return database
}

func Connect() error {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = os.Getenv("MONGO_URI")
	}
	if uri == "" {
		uri = "mongodb://mongo:27017"
	}
	dbName := os.Getenv("MONGODB_DB")
	if dbName == "" {
		dbName = os.Getenv("MONGO_DB")
	}
	if dbName == "" {
		dbName = "webapp"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return fmt.Errorf("mongo connect: %w", err)
	}
	if err := c.Ping(ctx, nil); err != nil {
		return fmt.Errorf("mongo ping: %w", err)
	}
	client = c
	database = c.Database(dbName)
	return nil
}

func Disconnect() {
	if client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}
}

func col(name string) *mongo.Collection {
	return database.Collection(name)
}

// ── Models ───────────────────────────────────────────────────────────────────

type SocialMedia struct {
	Instagram string `bson:"instagram" json:"instagram"`
	Twitter   string `bson:"twitter"   json:"twitter"`
	Facebook  string `bson:"facebook"  json:"facebook"`
	YouTube   string `bson:"youtube"   json:"youtube"`
	TikTok    string `bson:"tiktok"    json:"tiktok"`
	LinkedIn  string `bson:"linkedin"  json:"linkedin"`
	Email     string `bson:"email"     json:"email"`
}

type GlobalSetting struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgName         string             `bson:"org_name"            json:"org_name"`
	LogoURL         string             `bson:"logo_url"            json:"logo_url"`
	LogoUniversityURL string             `bson:"logo_university_url" json:"logo_university_url"`
	LogoYayasanURL  string             `bson:"logo_yayasan_url"     json:"logo_yayasan_url"`
	AboutHTML       string             `bson:"about_html"          json:"about_html"`
	HeaderTitle     string             `bson:"header_title"        json:"header_title"`
	HeaderSubtitle  string             `bson:"header_subtitle"     json:"header_subtitle"`
	HeroBadgeText   string             `bson:"hero_badge_text"     json:"hero_badge_text"`
	HeroTitleMain   string             `bson:"hero_title_main"     json:"hero_title_main"`
	HeroTitleAccent string             `bson:"hero_title_accent"   json:"hero_title_accent"`
	FooterTitle     string             `bson:"footer_title"        json:"footer_title"`
	FooterText      string             `bson:"footer_text"         json:"footer_text"`
	FooterCopyText  string             `bson:"footer_copy_text"    json:"footer_copy_text"`
	SocialMedia     SocialMedia        `bson:"social_media"        json:"social_media"`
	ScoreAspects    []RaporScoreItem   `bson:"score_aspects,omitempty" json:"score_aspects,omitempty"`
	EksploraZcyURL  string             `bson:"eksplorazcy_url"     json:"eksplorazcy_url"`
	UpdatedAt       time.Time          `bson:"updated_at"          json:"updated_at"`
}

type User struct {
	ID             string    `bson:"_id,omitempty"   json:"id"`
	Username       string    `bson:"username"        json:"username"`
	PasswordHash   string    `bson:"password_hash"   json:"-"`
	Role           string    `bson:"role"            json:"role"`
	AssignedPeriod string    `bson:"assigned_period" json:"assigned_period"`
	CreatedAt      time.Time `bson:"created_at"      json:"created_at"`
}


func SearchMembersByName(query string) ([]Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"full_name": bson.M{"$regex": query, "$options": "i"}}
	opts := options.Find().SetLimit(10).SetSort(bson.D{{Key: "full_name", Value: 1}})
	cur, err := col("members").Find(ctx, filter, opts)
	if err != nil { return nil, err }
	var res []Member
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

type Period struct {
	ID                primitive.ObjectID  `bson:"_id,omitempty"       json:"id"`
	Label             string              `bson:"label"               json:"label"`
	DisplayName       string              `bson:"display_name"        json:"display_name"`
	IsActive          bool                `bson:"is_active"           json:"is_active"`
	HierarchyImageURL string              `bson:"hierarchy_image_url" json:"hierarchy_image_url"`
	CreatedAt         time.Time           `bson:"created_at"          json:"created_at"`
	SubPeriods        []string            `bson:"sub_periods"         json:"sub_periods"`
	SubPeriodDates    map[string]string   `bson:"sub_period_dates,omitempty" json:"sub_period_dates,omitempty"`
	HeroImageURL      string              `bson:"hero_image_url"      json:"hero_image_url"`
}

func normalizePeriodSubPeriods(p *Period) {
	if p == nil {
		return
	}
	if len(p.SubPeriods) == 0 {
		p.SubPeriods = []string{"Gelombang 1"}
	}
}

type PeriodAbout struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel        string             `bson:"period_label"  json:"period_label"`
	Sejarah            string             `bson:"sejarah"       json:"sejarah"`
	TaglineTitle       string             `bson:"tagline_title" json:"tagline_title"`
	TaglineSubtitle    string             `bson:"tagline_subtitle" json:"tagline_subtitle"`
	TaglineDescription string             `bson:"tagline_description" json:"tagline_description"`
	Visi               string             `bson:"visi"          json:"visi"`
	Misi               string             `bson:"misi"          json:"misi"`
	LogoKabinetURL     string             `bson:"logo_kabinet_url" json:"logo_kabinet_url"`
	HierarchyImageURL  string             `bson:"hierarchy_image_url" json:"hierarchy_image_url"`
	CoverImageURL      string             `bson:"cover_image_url" json:"cover_image_url"`
	Gallery            []GalleryItem      `bson:"gallery" json:"gallery,omitempty"`
	UpdatedAt          time.Time          `bson:"updated_at"    json:"updated_at"`
}

type GalleryItem struct {
	Title    string `bson:"title" json:"title"`
	ImageURL string `bson:"image_url" json:"image_url"`
	Caption  string `bson:"caption" json:"caption"`
	Order    int    `bson:"order" json:"order"`
}

type Department struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	PeriodLabel string              `bson:"period_label"  json:"period_label"`
	Name        string              `bson:"name"          json:"name"`
	Description string              `bson:"description"   json:"description"`
	IconURL     string              `bson:"icon_url"      json:"icon_url"`
	SortOrder   int                 `bson:"sort_order"    json:"sort_order"`
	ParentID    *primitive.ObjectID `bson:"parent_id,omitempty" json:"parent_id,omitempty"`
}

type Member struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel     string             `bson:"period_label"  json:"period_label"`
	SubPeriod       string             `bson:"sub_period"    json:"sub_period"`
	FullName        string             `bson:"full_name"     json:"full_name"`
	Nickname        string             `bson:"nickname"      json:"nickname"`
	ProgramStudi    string             `bson:"program_studi" json:"program_studi"`
	Fakultas        string             `bson:"fakultas"      json:"fakultas"`
	Angkatan        string             `bson:"angkatan"      json:"angkatan"`
	ActivePeriods   map[string]string  `bson:"active_periods,omitempty" json:"active_periods,omitempty"`
	ActivePositions map[string]string  `bson:"active_positions,omitempty" json:"active_positions,omitempty"`
	PhotoURL        string             `bson:"photo_url"     json:"photo_url"`
	CoverURL        string             `bson:"cover_url"     json:"cover_url"`
	Department      string             `bson:"department"    json:"department"`
	Position        string             `bson:"position"      json:"position"`
	Phone           string             `bson:"phone"         json:"phone"`
	NIM             string             `bson:"nim"          json:"nim"`
	CreatedAt       time.Time          `bson:"created_at"    json:"created_at,omitempty"`
	SortOrder       int                `bson:"sort_order"    json:"sort_order"`
}

type Announcement struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel string             `bson:"period_label"  json:"period_label"`
	Title       string             `bson:"title"         json:"title"`
	Content     string             `bson:"content"       json:"content"`
	ImageURL    string             `bson:"image_url"     json:"image_url"`
	Published   bool               `bson:"published"     json:"published"`
	CreatedAt   time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"    json:"updated_at"`
}

type Article struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel string             `bson:"period_label"  json:"period_label"`
	Title       string             `bson:"title"         json:"title"`
	Slug        string             `bson:"slug"          json:"slug"`
	Excerpt     string             `bson:"excerpt"       json:"excerpt"`
	Content     string             `bson:"content"       json:"content"`
	CoverURL    string             `bson:"cover_url"     json:"cover_url"`
	Published   bool               `bson:"published"     json:"published"`
	CreatedAt   time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"    json:"updated_at"`
}

// ── GlobalSetting ────────────────────────────────────────────────────────────

func GetGlobalSetting() (*GlobalSetting, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var g GlobalSetting
	err := col("global_setting").FindOne(ctx, bson.M{}).Decode(&g)
	if err == mongo.ErrNoDocuments {
		return &GlobalSetting{
			OrgName:         "PKSE UGM",
			HeaderTitle:     "PKSE UGM",
			HeaderSubtitle:  "Organisasi Beasiswa",
			HeroBadgeText:   "Kepengurusan",
			HeroTitleMain:   "Mengabdi Bersama,",
			HeroTitleAccent: "Berkarya Nyata.",
			FooterTitle:     "PKSE UGM",
			FooterText:      "Paguyuban Karya Salemba Empat UGM",
			FooterCopyText:  "PKSE UGM",
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func UpsertGlobalSetting(g GlobalSetting) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	g.UpdatedAt = time.Now()
	opts := options.Update().SetUpsert(true)
	_, err := col("global_setting").UpdateOne(ctx, bson.M{}, bson.M{"$set": g}, opts)
	return err
}

// ── Users ────────────────────────────────────────────────────────────────────

func GetUsers() ([]User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cur, err := col("users").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	var users []User
	defer cur.Close(ctx)
	return users, cur.All(ctx, &users)
}

func GetUserByUsername(username string) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var u User
	err := col("users").FindOne(ctx, bson.M{"username": username}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(u User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("users").InsertOne(ctx, u)
	return err
}

func UpdateUser(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("users").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": fields})
	return err
}

func DeleteUser(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("users").DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func CountUsers() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return col("users").CountDocuments(ctx, bson.M{})
}

// ── Periods ──────────────────────────────────────────────────────────────────

func GetPeriods() ([]Period, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cur, err := col("periods").Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	var periods []Period
	defer cur.Close(ctx)
	if err := cur.All(ctx, &periods); err != nil {
		return nil, err
	}
	for i := range periods {
		normalizePeriodSubPeriods(&periods[i])
	}
	return periods, nil
}

func GetPeriodByLabel(label string) (*Period, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var p Period
	err := col("periods").FindOne(ctx, bson.M{"label": label}).Decode(&p)
	if err != nil {
		return nil, err
	}
	normalizePeriodSubPeriods(&p)
	return &p, nil
}

func GetActivePeriod() (*Period, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var p Period
	err := col("periods").FindOne(ctx, bson.M{"is_active": true}).Decode(&p)
	if err != nil {
		return nil, err
	}
	normalizePeriodSubPeriods(&p)
	return &p, nil
}

func CreatePeriod(p Period) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	p.CreatedAt = time.Now()
	_, err := col("periods").InsertOne(ctx, p)
	return err
}

func UpdatePeriod(label string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("periods").UpdateOne(ctx, bson.M{"label": label}, bson.M{"$set": fields})
	return err
}

func SetActivePeriod(label string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("periods").UpdateMany(ctx, bson.M{}, bson.M{"$set": bson.M{"is_active": false}})
	if err != nil {
		return err
	}
	_, err = col("periods").UpdateOne(ctx, bson.M{"label": label}, bson.M{"$set": bson.M{"is_active": true}})
	return err
}

func CountPeriods() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return col("periods").CountDocuments(ctx, bson.M{})
}

func DeletePeriod(label string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("periods").DeleteOne(ctx, bson.M{"label": label})
	return err
}

// PeriodHasData checks if any collection has data referencing this period
func PeriodHasData(label string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collections := []string{"announcements", "articles", "departments", "programs", "stats"}
	for _, c := range collections {
		count, err := database.Collection(c).CountDocuments(ctx, bson.M{"period_label": label})
		if err != nil {
			return false, err
		}
		if count > 0 {
			return true, nil
		}
	}
	memberCount, err := database.Collection("members").CountDocuments(ctx, bson.M{"active_periods." + label: bson.M{"$exists": true}})
	if err != nil {
		return false, err
	}
	return memberCount > 0, nil
}

// ── PeriodAbout ──────────────────────────────────────────────────────────────

func GetPeriodAbout(periodLabel string) (*PeriodAbout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var pa PeriodAbout
	err := col("period_abouts").FindOne(ctx, bson.M{"period_label": periodLabel}).Decode(&pa)
	if err == mongo.ErrNoDocuments {
		return &PeriodAbout{PeriodLabel: periodLabel}, nil
	}
	if err != nil {
		return nil, err
	}
	return &pa, nil
}

func UpsertPeriodAbout(pa PeriodAbout) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pa.UpdatedAt = time.Now()
	opts := options.Update().SetUpsert(true)
	_, err := col("period_abouts").UpdateOne(ctx, bson.M{"period_label": pa.PeriodLabel}, bson.M{"$set": pa}, opts)
	return err
}

// ── Departments ──────────────────────────────────────────────────────────────

func GetDepartments(periodLabel string) ([]Department, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}})
	cur, err := col("departments").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var depts []Department
	defer cur.Close(ctx)
	return depts, cur.All(ctx, &depts)
}

func CreateDepartment(d Department) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("departments").InsertOne(ctx, d)
	return err
}

func UpdateDepartment(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("departments").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteDepartment(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("departments").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Members ──────────────────────────────────────────────────────────────────

func GetMembers(periodLabel string) ([]Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter = bson.M{"$or": []bson.M{
			{"period_label": periodLabel},
			{"$expr": bson.M{"$ne": bson.A{
				bson.M{"$ifNull": bson.A{
					bson.M{"$getField": bson.M{"field": periodLabel, "input": "$active_periods"}},
					"",
				}},
				"",
			}}},
		}}
	}
	opts := options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}, {Key: "full_name", Value: 1}})
	cur, err := col("members").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var members []Member
	defer cur.Close(ctx)
	return members, cur.All(ctx, &members)
}

func FindMemberByName(fullName, periodLabel string) (*Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"full_name": fullName}
	if periodLabel != "" {
		filter["period_label"] = periodLabel
	}
	var m Member
	err := col("members").FindOne(ctx, filter).Decode(&m)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func GetMemberByID(id string) (*Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var m Member
	if err := col("members").FindOne(ctx, bson.M{"_id": oid}).Decode(&m); err != nil {
		return nil, err
	}
	return &m, nil
}

func CreateMember(m Member) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if m.FullName != "" {
		filter := bson.M{"full_name": m.FullName}
		if m.PeriodLabel != "" {
			filter["period_label"] = m.PeriodLabel
		}
		count, _ := col("members").CountDocuments(ctx, filter)
		if count > 0 {
			return fmt.Errorf("anggota '%s' sudah ada di periode ini", m.FullName)
		}
	}
	_, err := col("members").InsertOne(ctx, m)
	return err
}

func UpdateMember(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("members").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteMember(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("members").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Announcements ────────────────────────────────────────────────────────────

func GetAnnouncements(limit int, publishedOnly bool, periodLabel string) ([]Announcement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if publishedOnly {
		filter["published"] = true
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cur, err := col("announcements").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var items []Announcement
	defer cur.Close(ctx)
	return items, cur.All(ctx, &items)
}

func GetAnnouncementByID(id string) (*Announcement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var a Announcement
	err = col("announcements").FindOne(ctx, bson.M{"_id": oid}).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func CreateAnnouncement(a Announcement) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	_, err := col("announcements").InsertOne(ctx, a)
	return err
}

func UpdateAnnouncement(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields["updated_at"] = time.Now()
	_, err = col("announcements").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteAnnouncement(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("announcements").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Articles ─────────────────────────────────────────────────────────────────

func GetArticles(publishedOnly bool, periodLabel string) ([]Article, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if publishedOnly {
		filter["published"] = true
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cur, err := col("articles").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var articles []Article
	defer cur.Close(ctx)
	return articles, cur.All(ctx, &articles)
}

func GetArticleBySlug(slug string) (*Article, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a Article
	err := col("articles").FindOne(ctx, bson.M{"slug": slug, "published": true}).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func GetArticleByID(id string) (*Article, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var a Article
	err = col("articles").FindOne(ctx, bson.M{"_id": oid}).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func CreateArticle(a Article) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a.CreatedAt = time.Now()
	a.UpdatedAt = time.Now()
	_, err := col("articles").InsertOne(ctx, a)
	return err
}

func UpdateArticle(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields["updated_at"] = time.Now()
	_, err = col("articles").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteArticle(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("articles").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

type Program struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel string             `bson:"period_label"  json:"period_label"`
	Department  string             `bson:"department"    json:"department"`
	Title       string             `bson:"title"         json:"title"`
	Description string             `bson:"description"   json:"description"`
	ImageURL    string             `bson:"image_url"     json:"image_url"`
	Order       int                `bson:"order"         json:"order"`
}

type FAQ struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel string             `bson:"period_label"  json:"period_label"`
	Question    string             `bson:"question"      json:"question"`
	Answer      string             `bson:"answer"        json:"answer"`
	Order       int                `bson:"order"         json:"order"`
}

type ShortLink struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Code      string             `bson:"code"          json:"code"`
	TargetURL string             `bson:"target_url"    json:"target_url"`
	Label     string             `bson:"label"         json:"label"`
	CreatedBy string             `bson:"created_by"    json:"created_by"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}


type Activity struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty"  json:"id"`
	PeriodLabel string               `bson:"period_label"   json:"period_label"`
	Category    string               `bson:"category"       json:"category"`
	Name        string               `bson:"name"           json:"name"`
	Date        time.Time            `bson:"date"           json:"date"`
	AttendeeIDs []primitive.ObjectID `bson:"attendee_ids"   json:"attendee_ids"`
	Attendance   map[string]int     `bson:"attendance,omitempty" json:"attendance,omitempty"`
	CreatedAt   time.Time            `bson:"created_at"     json:"created_at"`
}

type RaporInstance struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"   json:"id"`
	PeriodLabel       string             `bson:"period_label"    json:"period_label"`
	Title             string             `bson:"title"           json:"title"`
	ActivityStart     time.Time          `bson:"activity_start"  json:"activity_start"`
	ActivityEnd       time.Time          `bson:"activity_end"    json:"activity_end"`
	Published         bool               `bson:"published"       json:"published"`
	ScoreAspects      []RaporScoreItem  `bson:"score_aspects,omitempty" json:"score_aspects,omitempty"`
	AttendanceWeights map[string]float64 `bson:"attendance_weights,omitempty" json:"attendance_weights,omitempty"`
	CreatedAt         time.Time          `bson:"created_at"      json:"created_at"`
}

type RaporScoreItem struct {
	Aspect string `bson:"aspect" json:"aspect"`
	Desc   string `bson:"desc"   json:"desc"`
	Score  int    `bson:"score"  json:"score"`
	Kind   string `bson:"kind"   json:"kind"`
	Min    int    `bson:"min"    json:"min"`
	Max    int    `bson:"max"    json:"max"`
}

type RaporEntry struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"   json:"id"`
	InstanceID  primitive.ObjectID `bson:"instance_id"     json:"instance_id"`
	MemberID    primitive.ObjectID `bson:"member_id"       json:"member_id"`
	PeriodLabel string             `bson:"period_label"    json:"period_label"`
	Scores      []interface{}              `bson:"scores"          json:"scores"`
	Feedback    string             `bson:"feedback"        json:"feedback"`
	Token       string             `bson:"token"           json:"token"`
	Published   bool               `bson:"published"       json:"published"`
	CreatedAt   time.Time          `bson:"created_at"      json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"      json:"updated_at"`
}
type StatData struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodLabel string             `bson:"period_label"  json:"period_label"`
	TemplateID  string             `bson:"template_id,omitempty" json:"template_id,omitempty"`
	Label       string             `bson:"label"         json:"label"`
	Value       string             `bson:"value"         json:"value"`
	Desc        string             `bson:"desc"          json:"desc"`
	ChartType   string             `bson:"chart_type"    json:"chart_type"`
	Fillable    bool               `bson:"fillable"      json:"fillable"`
	Visible     bool               `bson:"visible"       json:"visible"`
	Order       int                `bson:"order"         json:"order"`
}

// --- DB FUNCS FOR PROGRAMS ---
func GetPrograms(periodLabel string) ([]Program, error) {
	col := database.Collection("programs")
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}})
	cur, err := col.Find(context.Background(), filter, opts)
	if err != nil {
		return nil, err
	}
	var res []Program
	err = cur.All(context.Background(), &res)
	if res == nil {
		res = []Program{}
	}
	return res, err
}
func InsertProgram(p *Program) error {
	col := database.Collection("programs")
	res, err := col.InsertOne(context.Background(), p)
	if err == nil {
		p.ID = res.InsertedID.(primitive.ObjectID)
	}
	return err
}
func UpdateProgram(id string, p *Program) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("programs")
	update := bson.M{"$set": bson.M{
		"period_label": p.PeriodLabel,
		"department":   p.Department,
		"title":        p.Title,
		"description":  p.Description,
		"image_url":    p.ImageURL,
		"order":        p.Order,
	}}
	_, err = col.UpdateByID(context.Background(), oid, update)
	return err
}
func DeleteProgram(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("programs")
	_, err = col.DeleteOne(context.Background(), bson.M{"_id": oid})
	return err
}

// --- DB FUNCS FOR FAQS ---
func GetFAQs(periodLabel string) ([]FAQ, error) {
	col := database.Collection("faqs")
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		if periodLabel == "GLOBAL" {
			filter["period_label"] = "GLOBAL"
		} else {
			filter["period_label"] = periodLabel
		}
	}
	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}})
	cur, err := col.Find(context.Background(), filter, opts)
	if err != nil {
		return nil, err
	}
	var res []FAQ
	err = cur.All(context.Background(), &res)
	if res == nil {
		res = []FAQ{}
	}
	return res, err
}
func InsertFAQ(f *FAQ) error {
	col := database.Collection("faqs")
	res, err := col.InsertOne(context.Background(), f)
	if err == nil {
		f.ID = res.InsertedID.(primitive.ObjectID)
	}
	return err
}
func UpdateFAQ(id string, f *FAQ) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("faqs")
	update := bson.M{"$set": bson.M{
		"period_label": f.PeriodLabel,
		"question":     f.Question,
		"answer":       f.Answer,
		"order":        f.Order,
	}}
	_, err = col.UpdateByID(context.Background(), oid, update)
	return err
}
func DeleteFAQ(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("faqs")
	_, err = col.DeleteOne(context.Background(), bson.M{"_id": oid})
	return err
}

// --- DB FUNCS FOR STATS ---
func GetStats(periodLabel string) ([]StatData, error) {
	col := database.Collection("stats")
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}})
	cur, err := col.Find(context.Background(), filter, opts)
	if err != nil {
		return nil, err
	}
	var res []StatData
	err = cur.All(context.Background(), &res)
	if res == nil {
		res = []StatData{}
	}
	return res, err
}
func InsertStat(s *StatData) error {
	col := database.Collection("stats")
	res, err := col.InsertOne(context.Background(), s)
	if err == nil {
		s.ID = res.InsertedID.(primitive.ObjectID)
	}
	return err
}
func UpdateStat(id string, s *StatData) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("stats")
	update := bson.M{"$set": bson.M{
		"period_label": s.PeriodLabel,
		"template_id":  s.TemplateID,
		"label":        s.Label,
		"value":        s.Value,
		"desc":         s.Desc,
		"chart_type":   s.ChartType,
		"fillable":     s.Fillable,
		"visible":      s.Visible,
		"order":        s.Order,
	}}
	_, err = col.UpdateByID(context.Background(), oid, update)
	return err
}

func UpsertPeriodStatValue(periodLabel, templateID, value string) error {
	if periodLabel == "" || templateID == "" {
		return fmt.Errorf("period_label and template_id are required")
	}
	statsCol := database.Collection("stats")
	filter := bson.M{"period_label": periodLabel, "template_id": templateID}
	update := bson.M{"$set": bson.M{"value": value}}
	opts := options.Update().SetUpsert(true)
	_, err := statsCol.UpdateOne(context.Background(), filter, update, opts)
	return err
}

func CountMembersActiveFromSubPeriod(periodLabel, subPeriod string) (int64, error) {
	if periodLabel == "" || subPeriod == "" {
		return 0, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{
		"$expr": bson.M{"$eq": bson.A{
			bson.M{"$getField": bson.M{"field": periodLabel, "input": "$active_periods"}},
			subPeriod,
		}},
	}
	return col("members").CountDocuments(ctx, filter)
}
func DeleteStat(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	col := database.Collection("stats")
	_, err = col.DeleteOne(context.Background(), bson.M{"_id": oid})
	return err
}

// --- DB FUNCS FOR SHORTLINKS ---
func GetShortLinks() ([]ShortLink, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cur, err := col("shortlinks").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var res []ShortLink
	err = cur.All(ctx, &res)
	if res == nil {
		res = []ShortLink{}
	}
	return res, err
}

func GetShortLinkByCode(code string) (*ShortLink, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var out ShortLink
	err := col("shortlinks").FindOne(ctx, bson.M{"code": code}).Decode(&out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func ShortLinkCodeExists(code string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	n, err := col("shortlinks").CountDocuments(ctx, bson.M{"code": code})
	return n > 0, err
}

func InsertShortLink(s *ShortLink) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	_, err := col("shortlinks").InsertOne(ctx, s)
	return err
}

func DeleteShortLink(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("shortlinks").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func DeleteAllShortLinks() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("shortlinks").DeleteMany(ctx, bson.M{})
	return err
}

func ResetCollections(names ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	for _, name := range names {
		if name == "" {
			continue
		}
		if _, err := col(name).DeleteMany(ctx, bson.M{}); err != nil {
			return fmt.Errorf("reset collection %s: %w", name, err)
		}
	}
	return nil
}

// ── Broadcast ──────────────────────────────────────────────────────────────────

type BroadcastContact struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string             `bson:"name"          json:"name"`
	Phone      string             `bson:"phone"         json:"phone"`
	Period     string             `bson:"period"        json:"period"`
	CreatedAt  time.Time          `bson:"created_at"    json:"created_at"`
}

type BroadcastLog struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Message        string             `bson:"message"         json:"message"`
	Status          string             `bson:"status"          json:"status"`
	TotalReceivers  int                `bson:"total_receivers" json:"total_receivers"`
	SentCount       int                `bson:"sent_count"      json:"sent_count"`
	FailedCount     int                `bson:"failed_count"    json:"failed_count"`
	SentBy          string             `bson:"sent_by"         json:"sent_by"`
	StartedAt       time.Time          `bson:"started_at"      json:"started_at"`
	CompletedAt     *time.Time         `bson:"completed_at"    json:"completed_at,omitempty"`
}

type BroadcastRecipientLog struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LogID     primitive.ObjectID `bson:"log_id"  json:"log_id"`
	ContactID primitive.ObjectID `bson:"contact_id" json:"contact_id"`
	Phone     string             `bson:"phone"   json:"phone"`
	Name      string             `bson:"name"    json:"name"`
	Status    string             `bson:"status"  json:"status"`
	Error     string             `bson:"error"   json:"error"`
	SentAt    *time.Time         `bson:"sent_at" json:"sent_at,omitempty"`
}

func GetBroadcastContacts(period string) ([]BroadcastContact, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if period != "" && period != "ALL" {
		filter["period"] = period
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cur, err := col("broadcast_contacts").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var res []BroadcastContact
	if err := cur.All(ctx, &res); err != nil {
		return nil, err
	}
	if res == nil {
		res = []BroadcastContact{}
	}
	return res, nil
}

func CreateBroadcastContact(c BroadcastContact) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c.CreatedAt = time.Now()
	_, err := col("broadcast_contacts").InsertOne(ctx, c)
	return err
}

func BulkCreateBroadcastContacts(contacts []BroadcastContact) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	now := time.Now()
	docs := make([]any, len(contacts))
	for i, c := range contacts {
		c.CreatedAt = now
		docs[i] = c
	}
	_, err := col("broadcast_contacts").InsertMany(ctx, docs)
	return err
}

func DeleteBroadcastContact(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("broadcast_contacts").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func CreateBroadcastLog(blog BroadcastLog) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	blog.StartedAt = time.Now()
	blog.Status = "sending"
	res, err := col("broadcast_logs").InsertOne(ctx, blog)
	if err != nil {
		return primitive.NilObjectID, err
	}
	return res.InsertedID.(primitive.ObjectID), nil
}

func UpdateBroadcastLog(id primitive.ObjectID, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("broadcast_logs").UpdateByID(ctx, id, bson.M{"$set": fields})
	return err
}

func GetBroadcastLogs(limit int) ([]BroadcastLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cur, err := col("broadcast_logs").Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	var res []BroadcastLog
	if err := cur.All(ctx, &res); err != nil {
		return nil, err
	}
	if res == nil {
		res = []BroadcastLog{}
	}
	return res, nil
}

func GetBroadcastLog(id string) (*BroadcastLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var blog BroadcastLog
	if err := col("broadcast_logs").FindOne(ctx, bson.M{"_id": oid}).Decode(&blog); err != nil {
		return nil, err
	}
	return &blog, nil
}

func CreateRecipientLogs(logs []BroadcastRecipientLog) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	docs := make([]any, len(logs))
	for i, l := range logs {
		docs[i] = l
	}
	_, err := col("broadcast_recipient_logs").InsertMany(ctx, docs)
	return err
}

func GetRecipientLogs(logID string) ([]BroadcastRecipientLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(logID)
	if err != nil {
		return nil, err
	}
	cur, err := col("broadcast_recipient_logs").Find(ctx, bson.M{"log_id": oid})
	if err != nil {
		return nil, err
	}
	var res []BroadcastRecipientLog
	if err := cur.All(ctx, &res); err != nil {
		return nil, err
	}
	if res == nil {
		res = []BroadcastRecipientLog{}
	}
	return res, nil
}


func GetTopMembers(periodLabel string, limit int) ([]Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter = bson.M{"": []bson.M{
			{"period_label": periodLabel},
			{"": bson.M{"": bson.A{
				bson.M{"": bson.A{
					bson.M{"": bson.M{"field": periodLabel, "input": ""}},
					"",
				}},
				"",
			}}},
		}}
	}
	opts := options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}, {Key: "full_name", Value: 1}})
	if limit > 0 { opts = opts.SetLimit(int64(limit)) }
	cur, err := col("members").Find(ctx, filter, opts)
	if err != nil { return nil, err }
	var res []Member
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetMembersFiltered(filter bson.M) ([]Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "full_name", Value: 1}})
	cur, err := col("members").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var res []Member
	if err := cur.All(ctx, &res); err != nil {
		return nil, err
	}
	if res == nil {
		res = []Member{}
	}
	return res, nil
}

// ── Broadcast Session ──────────────────────────────────────────────────────

type BroadcastSession struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	UserID    string               `bson:"user_id"    json:"user_id"`
	Username  string               `bson:"username"   json:"username"`
	Period    string               `bson:"period"     json:"period"`
	Status    string               `bson:"status"     json:"status"`
	Columns   []string             `bson:"columns"    json:"columns"`
	Labels    []string             `bson:"labels"     json:"labels"`
	Rows      []map[string]string  `bson:"rows"       json:"rows"`
	Template  string               `bson:"template"   json:"template"`
	DelayMs   int                  `bson:"delay_ms"   json:"delay_ms"`
	CreatedAt time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time            `bson:"updated_at" json:"updated_at"`
}

func CreateBroadcastSession(s BroadcastSession) (primitive.ObjectID, error) {
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := col("broadcast_sessions").InsertOne(ctx, s)
	if err != nil {
		return primitive.NilObjectID, err
	}
	return res.InsertedID.(primitive.ObjectID), nil
}

func GetBroadcastSession(id string) (*BroadcastSession, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var s BroadcastSession
	err = col("broadcast_sessions").FindOne(ctx, bson.M{"_id": oid}).Decode(&s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetLatestDraftSession(userID string) (*BroadcastSession, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	var s BroadcastSession
	err := col("broadcast_sessions").FindOne(ctx, bson.M{"user_id": userID, "status": "draft"}, opts).Decode(&s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func UpdateBroadcastSession(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	fields["updated_at"] = time.Now()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("broadcast_sessions").UpdateByID(ctx, oid, bson.M{"$set": fields})
	return err
}

func DeleteBroadcastSession(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("broadcast_sessions").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}



// GridFS

func SaveFileToGridFS(filename string, data []byte, contentType string) (primitive.ObjectID, error) {
	bucket, err := gridfs.NewBucket(database, options.GridFSBucket().SetName("uploads"))
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("gridfs bucket: %w", err)
	}
	uploadOpts := options.GridFSUpload().SetMetadata(bson.M{
		"content_type": contentType,
		"uploaded_at":  time.Now(),
	})
	id, err := bucket.UploadFromStream(filename, bytes.NewReader(data), uploadOpts)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("gridfs upload: %w", err)
	}
	return id, nil
}

func GetFileFromGridFS(filename string) ([]byte, string, error) {
	bucket, err := gridfs.NewBucket(database, options.GridFSBucket().SetName("uploads"))
	if err != nil {
		return nil, "", fmt.Errorf("gridfs bucket: %w", err)
	}
	var buf bytes.Buffer
	_, err = bucket.DownloadToStreamByName(filename, &buf)
	if err != nil {
		return nil, "", err
	}
	var fileDoc bson.M
	_ = bucket.GetFilesCollection().FindOne(nil, bson.M{"filename": filename}).Decode(&fileDoc)
	ct := ""
	if meta, ok := fileDoc["metadata"].(bson.M); ok {
		ct, _ = meta["content_type"].(string)
	}
	return buf.Bytes(), ct, nil
}

func FindMemberByNIM(nim, fullName string) (*Member, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"nim": nim, "full_name": fullName}
	var m Member
	err := col("members").FindOne(ctx, filter).Decode(&m)
	if err != nil {
		return nil, err
	}
	return &m, nil
}
