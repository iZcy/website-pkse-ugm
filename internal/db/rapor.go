package db

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GenerateToken() string {
	b := make([]byte, 24)
	rand.Read(b)
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b)
}

// ── Rapor Instances ─────────────────────────────────────────────────────────

func GetRaporInstances(periodLabel string) ([]RaporInstance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cur, err := col("rapor_instances").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var res []RaporInstance
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetRaporInstanceByID(id string) (*RaporInstance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var ri RaporInstance
	if err := col("rapor_instances").FindOne(ctx, bson.M{"_id": oid}).Decode(&ri); err != nil {
		return nil, err
	}
	return &ri, nil
}

func CreateRaporInstance(ri RaporInstance) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ri.CreatedAt = time.Now()
	res, err := col("rapor_instances").InsertOne(ctx, ri)
	if err != nil {
		return err
	}
	ri.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func UpdateRaporInstance(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("rapor_instances").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteRaporInstance(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("rapor_instances").DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return err
	}
	_, err = col("rapor_entries").DeleteMany(ctx, bson.M{"instance_id": oid})
	return err
}

// ── Rapor Entries ───────────────────────────────────────────────────────────


func PublishRaporInstance(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("rapor_instances").UpdateByID(ctx, oid, bson.M{"$set": bson.M{"published": true}})
	if err != nil {
		return err
	}
	_, err = col("rapor_entries").UpdateMany(ctx, bson.M{"instance_id": oid}, bson.M{"$set": bson.M{"published": true}})
	return err
}

func GetRaporEntries(instanceID string) ([]RaporEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if instanceID != "" {
		oid, err := primitive.ObjectIDFromHex(instanceID)
		if err != nil {
			return nil, err
		}
		filter["instance_id"] = oid
	}
	cur, err := col("rapor_entries").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var res []RaporEntry
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetRaporEntryByToken(token string) (*RaporEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var e RaporEntry
	if err := col("rapor_entries").FindOne(ctx, bson.M{"token": token}).Decode(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

func GetRaporEntriesForMember(memberID, periodLabel string) ([]RaporEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(memberID)
	if err != nil {
		return nil, err
	}
	filter := bson.M{"member_id": oid}
	if periodLabel != "" {
		filter["period_label"] = periodLabel
	}
	cur, err := col("rapor_entries").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var res []RaporEntry
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetRaporEntriesByInstance(instanceID string) ([]RaporEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(instanceID)
	if err != nil {
		return nil, err
	}
	cur, err := col("rapor_entries").Find(ctx, bson.M{"instance_id": oid})
	if err != nil {
		return nil, err
	}
	var res []RaporEntry
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetMemberAttendanceCount(memberID, periodLabel, category string, start, end time.Time) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(memberID)
	if err != nil {
		return 0, err
	}
	filter := bson.M{
		"date":         bson.M{"$gte": start, "$lte": end},
		"attendee_ids": oid,
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	count, err := col("activities").CountDocuments(ctx, filter)
	return int(count), err
}

func GetActivityCount(periodLabel, category string, start, end time.Time) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{
		"date": bson.M{"$gte": start, "$lte": end},
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	count, err := col("activities").CountDocuments(ctx, filter)
	return int(count), err
}

func UpsertRaporEntry(e RaporEntry) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	now := time.Now()
	e.UpdatedAt = now
	filter := bson.M{"instance_id": e.InstanceID, "member_id": e.MemberID}
	var existing RaporEntry
	err := col("rapor_entries").FindOne(ctx, filter).Decode(&existing)
	if err != nil {
		e.CreatedAt = now
		if e.Token == "" {
			e.Token = GenerateToken()
		}
		_, err := col("rapor_entries").InsertOne(ctx, e)
		return err
	}
	update := bson.M{"$set": bson.M{
		"scores":    e.Scores,
		"feedback":  e.Feedback,
		"published": e.Published,
		"updated_at": now,
	}}
	_, err = col("rapor_entries").UpdateOne(ctx, filter, update)
	return err
}

func DeleteRaporEntry(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("rapor_entries").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// ── Attendance Stats ────────────────────────────────────────────────────────

type AttendanceCategory struct {
	Category string
	Total    int
	Attended int
}

func GetAttendanceStats(memberID primitive.ObjectID, start, end time.Time, periodLabel string) ([]AttendanceCategory, map[string][]string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"date": bson.M{"$gte": start, "$lte": end},
	}
	if periodLabel != "" {
		filter["period_label"] = periodLabel
	}

	cur, err := col("activities").Find(ctx, filter)
	if err != nil {
		return nil, nil
	}
	var activities []Activity
	defer cur.Close(ctx)
	if err := cur.All(ctx, &activities); err != nil {
		return nil, nil
	}

	catMap := map[string]*AttendanceCategory{}
	detailMap := map[string][]string{}

	for _, a := range activities {
		cat := a.Category
		if cat == "" {
			cat = "lainnya"
		}
		ac, ok := catMap[cat]
		if !ok {
			ac = &AttendanceCategory{Category: cat}
			catMap[cat] = ac
		}
		ac.Total++
		attended := false
		for _, aid := range a.AttendeeIDs {
			if aid == memberID {
				attended = true
				break
			}
		}
		if attended {
			ac.Attended++
			detailMap[cat] = append(detailMap[cat], a.Name)
		}
	}

	var result []AttendanceCategory
	for _, ac := range catMap {
		result = append(result, *ac)
	}
	return result, detailMap
}

func GetRaporEntry(instanceID, memberID primitive.ObjectID) (*RaporEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var e RaporEntry
	err := col("rapor_entries").FindOne(ctx, bson.M{"instance_id": instanceID, "member_id": memberID}).Decode(&e)
	if err != nil {
		return nil, err
	}
	return &e, nil
}
