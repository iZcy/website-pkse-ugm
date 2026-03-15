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
SubPeriods        []string           `bson:"sub_periods"         json:"sub_periods"`
	HeroImageURL      string             `bson:"hero_image_url"      json:"hero_image_url"`
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
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
Sejarah     string             `bson:"sejarah"       json:"sejarah"`
Visi        string             `bson:"visi"          json:"visi"`
Misi        string             `bson:"misi"          json:"misi"`
HierarchyImageURL string       `bson:"hierarchy_image_url" json:"hierarchy_image_url"`
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
ScholarID   primitive.ObjectID `bson:"scholar_id,omitempty" json:"scholar_id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
SubPeriod   string             `bson:"sub_period"    json:"sub_period"`
FullName    string             `bson:"full_name"     json:"full_name"`
Nickname    string             `bson:"nickname"      json:"nickname"`
ProgramStudi string            `bson:"program_studi" json:"program_studi"`
Fakultas    string             `bson:"fakultas"      json:"fakultas"`
Angkatan    string             `bson:"angkatan"      json:"angkatan"`
ActivePeriods map[string]string `bson:"active_periods,omitempty" json:"active_periods,omitempty"`
PhotoURL    string             `bson:"photo_url"     json:"photo_url"`
Department  string             `bson:"department"    json:"department"`
Position    string             `bson:"position"      json:"position"`
SortOrder   int                `bson:"sort_order"    json:"sort_order"`
}

type Scholar struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
FullName    string             `bson:"full_name"     json:"full_name"`
Nickname    string             `bson:"nickname"      json:"nickname"`
Gender      string             `bson:"gender"        json:"gender"`
Major       string             `bson:"major"         json:"major"`
Faculty     string             `bson:"faculty"       json:"faculty"`
PhotoURL    string             `bson:"photo_url"     json:"photo_url"`
IsActive    bool               `bson:"is_active"     json:"is_active"`
CreatedAt   time.Time          `bson:"created_at"    json:"created_at"`
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


type Program struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
PeriodLabel string             `bson:"period_label"  json:"period_label"`
Title       string             `bson:"title"         json:"title"`
Description string             `bson:"description"   json:"description"`
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
if periodLabel != "" {
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
"title":        p.Title,
"description":  p.Description,
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
if periodLabel != "" {
if periodLabel == "GLOBAL" {
filter["$or"] = []bson.M{
{"period_label": "GLOBAL"},
{"period_label": ""},
{"period_label": bson.M{"$exists": false}},
{"period_label": nil},
}
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
if periodLabel != "" {
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


// --- DB FUNCS FOR SCHOLARS ---
func GetScholars() ([]Scholar, error) {
	col := database.Collection("scholars")
	cur, err := col.Find(context.Background(), bson.M{})
	if err != nil { return nil, err }
	var res []Scholar
	err = cur.All(context.Background(), &res)
	if res == nil { res = []Scholar{} }
	return res, err
}

func InsertScholar(s *Scholar) error {
	col := database.Collection("scholars")
	s.CreatedAt = time.Now()
	res, err := col.InsertOne(context.Background(), s)
	if err == nil {
		s.ID = res.InsertedID.(primitive.ObjectID)
	}
	return err
}

func UpdateScholar(id string, s *Scholar) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil { return err }
	col := database.Collection("scholars")
	_, err = col.UpdateOne(context.Background(), bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"full_name": s.FullName,
		"nickname": s.Nickname,
		"gender": s.Gender,
		"major": s.Major,
		"faculty": s.Faculty,
		"photo_url": s.PhotoURL,
		"is_active": s.IsActive,
	}})
	return err
}

func DeleteScholar(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil { return err }
	col := database.Collection("scholars")
	_, err = col.DeleteOne(context.Background(), bson.M{"_id": oid})
	// Also un-assign from periods? Or leave Member docs intact to display name from Member struct?
	// We leave Member docs intact.
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
