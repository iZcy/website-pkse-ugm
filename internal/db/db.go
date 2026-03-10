package db

import (
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var database *mongo.Database

// ── Connect / Disconnect ──────────────────────────────────────────────────────

func Connect() error {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = "pkse"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
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

// ── Models ────────────────────────────────────────────────────────────────────

type User struct {
	ID           string    `bson:"_id,omitempty" json:"id"`
	Username     string    `bson:"username"      json:"username"`
	PasswordHash string    `bson:"password_hash" json:"-"`
	Role         string    `bson:"role"          json:"role"` // superadmin | admin
	CreatedAt    time.Time `bson:"created_at"    json:"created_at"`
}

type Period struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Label       string             `bson:"label"        json:"label"`        // "25.26"
	DisplayName string             `bson:"display_name" json:"display_name"` // "2025/2026"
	IsActive    bool               `bson:"is_active"    json:"is_active"`
	CreatedAt   time.Time          `bson:"created_at"   json:"created_at"`
}

type Announcement struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodID  string             `bson:"period_id"     json:"period_id"`
	Title     string             `bson:"title"         json:"title"`
	Content   string             `bson:"content"       json:"content"`
	Published bool               `bson:"published"     json:"published"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

type Department struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodID    string             `bson:"period_id"     json:"period_id"`
	Name        string             `bson:"name"          json:"name"`
	Description string             `bson:"description"   json:"description"`
	IconClass   string             `bson:"icon_class"    json:"icon_class"`
	SortOrder   int                `bson:"sort_order"    json:"sort_order"`
}

type Officer struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodID   string             `bson:"period_id"     json:"period_id"`
	Name       string             `bson:"name"          json:"name"`
	Role       string             `bson:"role"          json:"role"`
	Department string             `bson:"department"    json:"department"`
	PhotoURL   string             `bson:"photo_url"     json:"photo_url"`
	Tier       string             `bson:"tier"          json:"tier"` // inti | departemen
	SortOrder  int                `bson:"sort_order"    json:"sort_order"`
}

type SiteSetting struct {
	ID          primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	PeriodID    string                 `bson:"period_id"     json:"period_id"`
	Sejarah     string                 `bson:"sejarah"       json:"sejarah"`
	Visi        string                 `bson:"visi"          json:"visi"`
	Misi        string                 `bson:"misi"          json:"misi"`
	Extra       map[string]interface{} `bson:"extra,omitempty" json:"extra,omitempty"`
}

type Article struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeriodID  string             `bson:"period_id"     json:"period_id"`
	Title     string             `bson:"title"         json:"title"`
	Slug      string             `bson:"slug"          json:"slug"`
	Excerpt   string             `bson:"excerpt"       json:"excerpt"`
	Content   string             `bson:"content"       json:"content"`
	CoverURL  string             `bson:"cover_url"     json:"cover_url"`
	Published bool               `bson:"published"     json:"published"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

// ── Users ─────────────────────────────────────────────────────────────────────

func GetUsers() ([]User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cur, err := col("users").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var users []User
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
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("users").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteUser(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("users").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func CountUsers() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return col("users").CountDocuments(ctx, bson.M{})
}

// ── Periods ───────────────────────────────────────────────────────────────────

func GetPeriods() ([]Period, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	opts := options.Find().SetSort(bson.M{"created_at": 1})
	cur, err := col("periods").Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var periods []Period
	return periods, cur.All(ctx, &periods)
}

func GetActivePeriod() (*Period, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var p Period
	err := col("periods").FindOne(ctx, bson.M{"is_active": true}).Decode(&p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func CreatePeriod(p Period) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("periods").InsertOne(ctx, p)
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

// ── Announcements ─────────────────────────────────────────────────────────────

func GetAnnouncements(limit int, publishedOnly bool, periodID string) ([]Announcement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if publishedOnly {
		filter["published"] = true
	}
	if periodID != "" {
		filter["period_id"] = periodID
	}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cur, err := col("announcements").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var items []Announcement
	return items, cur.All(ctx, &items)
}

func CreateAnnouncement(a Announcement) error {
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now()
	}
	a.UpdatedAt = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("announcements").InsertOne(ctx, a)
	return err
}

func UpdateAnnouncement(id string, fields map[string]any) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields["updated_at"] = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("announcements").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteAnnouncement(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("announcements").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Departments ───────────────────────────────────────────────────────────────

func GetDepartments(periodID string) ([]Department, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodID != "" {
		filter["period_id"] = periodID
	}
	opts := options.Find().SetSort(bson.M{"sort_order": 1})
	cur, err := col("departments").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var items []Department
	return items, cur.All(ctx, &items)
}

func CreateDepartment(d Department) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("departments").InsertOne(ctx, d)
	return err
}

func UpdateDepartment(id string, fields map[string]any) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("departments").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteDepartment(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("departments").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Officers ──────────────────────────────────────────────────────────────────

func GetOfficers(periodID string) ([]Officer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodID != "" {
		filter["period_id"] = periodID
	}
	opts := options.Find().SetSort(bson.M{"sort_order": 1})
	cur, err := col("officers").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var items []Officer
	return items, cur.All(ctx, &items)
}

func CreateOfficer(o Officer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("officers").InsertOne(ctx, o)
	return err
}

func UpdateOfficer(id string, fields map[string]any) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("officers").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteOfficer(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("officers").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── SiteSetting ───────────────────────────────────────────────────────────────

func GetSiteSetting(periodID string) (*SiteSetting, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodID != "" {
		filter["period_id"] = periodID
	}
	var s SiteSetting
	err := col("site_settings").FindOne(ctx, filter).Decode(&s)
	if err != nil {
		return &SiteSetting{}, nil
	}
	return &s, nil
}

func UpsertSiteSetting(periodID string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"period_id": periodID}
	update := bson.M{"$set": fields}
	opts := options.Update().SetUpsert(true)
	_, err := col("site_settings").UpdateOne(ctx, filter, update, opts)
	return err
}

// ── Articles ──────────────────────────────────────────────────────────────────

func GetArticles(publishedOnly bool, periodID string) ([]Article, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if publishedOnly {
		filter["published"] = true
	}
	if periodID != "" {
		filter["period_id"] = periodID
	}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cur, err := col("articles").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var items []Article
	return items, cur.All(ctx, &items)
}

func GetArticleBySlug(slug string) (*Article, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a Article
	err := col("articles").FindOne(ctx, bson.M{"slug": slug}).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func GetArticleByID(id string) (*Article, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a Article
	err = col("articles").FindOne(ctx, bson.M{"_id": oid}).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func CreateArticle(a Article) error {
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now()
	}
	a.UpdatedAt = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := col("articles").InsertOne(ctx, a)
	return err
}

func UpdateArticle(id string, fields map[string]any) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields["updated_at"] = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("articles").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteArticle(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = col("articles").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
