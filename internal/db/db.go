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

type Announcement struct {
ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
Title     string             `bson:"title"         json:"title"`
Content   string             `bson:"content"       json:"content"`
Published bool               `bson:"published"     json:"published"`
CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

type Department struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
Name        string             `bson:"name"          json:"name"`
Description string             `bson:"description"   json:"description"`
IconClass   string             `bson:"icon_class"    json:"icon_class"`
SortOrder   int                `bson:"sort_order"    json:"sort_order"`
}

type Officer struct {
ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
Name       string             `bson:"name"          json:"name"`
Role       string             `bson:"role"          json:"role"`
Department string             `bson:"department"    json:"department"`
PhotoURL   string             `bson:"photo_url"     json:"photo_url"`
Tier       string             `bson:"tier"          json:"tier"`
SortOrder  int                `bson:"sort_order"    json:"sort_order"`
}

type SiteSetting struct {
ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
Sejarah     string             `bson:"sejarah"       json:"sejarah"`
Visi        string             `bson:"visi"          json:"visi"`
Misi        []string           `bson:"misi"          json:"misi"`
StatMembers string             `bson:"stat_members"  json:"stat_members"`
StatDept    string             `bson:"stat_dept"     json:"stat_dept"`
StatProker  string             `bson:"stat_proker"   json:"stat_proker"`
}

func Connect() error {
uri := os.Getenv("MONGO_URI")
if uri == "" {
uri = "mongodb://mongo:27017"
}
dbName := os.Getenv("MONGO_DB")
if dbName == "" {
dbName = "webapp"
}
ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
defer cancel()
c, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
if err != nil {
return err
}
if err := c.Ping(ctx, nil); err != nil {
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

func newCtx() (context.Context, context.CancelFunc) {
return context.WithTimeout(context.Background(), 10*time.Second)
}

func GetAnnouncements(limit int, publishedOnly bool) ([]Announcement, error) {
ctx, cancel := newCtx()
defer cancel()
filter := bson.M{}
if publishedOnly {
filter["published"] = true
}
opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
if limit > 0 {
opts.SetLimit(int64(limit))
}
cur, err := database.Collection("announcements").Find(ctx, filter, opts)
if err != nil {
return nil, err
}
var out []Announcement
if err := cur.All(ctx, &out); err != nil {
return nil, err
}
if out == nil {
out = []Announcement{}
}
return out, nil
}

func GetAnnouncementByID(id string) (*Announcement, error) {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return nil, err
}
var a Announcement
err = database.Collection("announcements").FindOne(ctx, bson.M{"_id": oid}).Decode(&a)
return &a, err
}

func CreateAnnouncement(a *Announcement) error {
ctx, cancel := newCtx()
defer cancel()
a.ID = primitive.NewObjectID()
a.CreatedAt = time.Now()
a.UpdatedAt = time.Now()
_, err := database.Collection("announcements").InsertOne(ctx, a)
return err
}

func UpdateAnnouncement(id string, fields bson.M) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
fields["updated_at"] = time.Now()
_, err = database.Collection("announcements").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
return err
}

func DeleteAnnouncement(id string) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
_, err = database.Collection("announcements").DeleteOne(ctx, bson.M{"_id": oid})
return err
}

func GetDepartments() ([]Department, error) {
ctx, cancel := newCtx()
defer cancel()
opts := options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}})
cur, err := database.Collection("departments").Find(ctx, bson.M{}, opts)
if err != nil {
return nil, err
}
var out []Department
cur.All(ctx, &out)
if out == nil {
out = []Department{}
}
return out, nil
}

func CreateDepartment(d *Department) error {
ctx, cancel := newCtx()
defer cancel()
d.ID = primitive.NewObjectID()
_, err := database.Collection("departments").InsertOne(ctx, d)
return err
}

func UpdateDepartment(id string, fields bson.M) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
_, err = database.Collection("departments").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
return err
}

func DeleteDepartment(id string) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
_, err = database.Collection("departments").DeleteOne(ctx, bson.M{"_id": oid})
return err
}

func GetOfficers() ([]Officer, error) {
ctx, cancel := newCtx()
defer cancel()
opts := options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}})
cur, err := database.Collection("officers").Find(ctx, bson.M{}, opts)
if err != nil {
return nil, err
}
var out []Officer
cur.All(ctx, &out)
if out == nil {
out = []Officer{}
}
return out, nil
}

func CreateOfficer(o *Officer) error {
ctx, cancel := newCtx()
defer cancel()
o.ID = primitive.NewObjectID()
_, err := database.Collection("officers").InsertOne(ctx, o)
return err
}

func UpdateOfficer(id string, fields bson.M) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
_, err = database.Collection("officers").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
return err
}

func DeleteOfficer(id string) error {
ctx, cancel := newCtx()
defer cancel()
oid, err := primitive.ObjectIDFromHex(id)
if err != nil {
return err
}
_, err = database.Collection("officers").DeleteOne(ctx, bson.M{"_id": oid})
return err
}

func GetSiteSetting() (*SiteSetting, error) {
ctx, cancel := newCtx()
defer cancel()
var ss SiteSetting
err := database.Collection("site_settings").FindOne(ctx, bson.M{}).Decode(&ss)
if err == mongo.ErrNoDocuments {
return &SiteSetting{Misi: []string{}}, nil
}
if ss.Misi == nil {
ss.Misi = []string{}
}
return &ss, err
}

func UpsertSiteSetting(fields bson.M) error {
ctx, cancel := newCtx()
defer cancel()
opts := options.Update().SetUpsert(true)
_, err := database.Collection("site_settings").UpdateOne(ctx, bson.M{}, bson.M{"$set": fields}, opts)
return err
}
