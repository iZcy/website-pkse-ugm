package db

import (
"context"
"fmt"
"os"
"time"

"go.mongodb.org/mongo-driver/bson"
"go.mongodb.org/mongo-driver/bson/primitive"
"go.mongodb.org/mongo-driver/mongo"
"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var database *mongo.Database

func Connect() error {
uri := os.Getenv("MONGODB_URI")
if uri == "" {
uri = "mongodb://mongo:27017"
}
dbName := os.Getenv("MONGODB_DB")
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
}

type GlobalSetting struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
OrgName     string             `bson:"org_name"      json:"org_name"`
LogoURL     string             `bson:"logo_url"      json:"logo_url"`
AboutHTML   string             `bson:"about_html"    json:"about_html"`
SocialMedia SocialMedia        `bson:"social_media"  json:"social_media"`
UpdatedAt   time.Time          `bson:"updated_at"    json:"updated_at"`
}

type User struct {
ID             string    `bson:"_id,omitempty"   json:"id"`
Username       string    `bson:"username"        json:"username"`
PasswordHash   string    `bson:"password_hash"   json:"-"`
Role           string    `bson:"role"            json:"role"`
AssignedPeriod string    `bson:"assigned_period" json:"assigned_period"`
CreatedAt      time.Time `bson:"created_at"      json:"created_at"`
}

type Period struct {
ID                primitive.ObjectID `bson:"_id,omitempty"       json:"id"`
Label             string             `bson:"label"               json:"label"`
DisplayName       string             `bson:"display_name"        json:"display_name"`
IsActive          bool               `bson:"is_active"           json:"is_active"`
HierarchyImageURL string             `bson:"hierarchy_image_url" json:"hierarchy_image_url"`
CreatedAt         time.Time          `bson:"created_at"          json:"created_at"`
}

type PeriodAbout struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
Sejarah     string             `bson:"sejarah"       json:"sejarah"`
Visi        string             `bson:"visi"          json:"visi"`
Misi        string             `bson:"misi"          json:"misi"`
UpdatedAt   time.Time          `bson:"updated_at"    json:"updated_at"`
}

type Department struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
Name        string             `bson:"name"          json:"name"`
Description string             `bson:"description"   json:"description"`
SortOrder   int                `bson:"sort_order"    json:"sort_order"`
}

type Member struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
FullName    string             `bson:"full_name"     json:"full_name"`
Nickname    string             `bson:"nickname"      json:"nickname"`
PhotoURL    string             `bson:"photo_url"     json:"photo_url"`
Department  string             `bson:"department"    json:"department"`
Position    string             `bson:"position"      json:"position"`
SortOrder   int                `bson:"sort_order"    json:"sort_order"`
}

type Announcement struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
Title       string             `bson:"title"         json:"title"`
Content     string             `bson:"content"       json:"content"`
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
return &GlobalSetting{OrgName: "PKSE UGM"}, nil
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
return periods, cur.All(ctx, &periods)
}

func GetPeriodByLabel(label string) (*Period, error) {
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
var p Period
err := col("periods").FindOne(ctx, bson.M{"label": label}).Decode(&p)
if err != nil {
return nil, err
}
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
if periodLabel != "" {
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
if periodLabel != "" {
filter["period_label"] = periodLabel
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

func CreateMember(m Member) error {
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
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
if periodLabel != "" {
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
if periodLabel != "" {
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
