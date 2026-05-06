package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetActivities(periodLabel, category string) ([]Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cur, err := col("activities").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var res []Activity
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetActivitiesByDateRange(periodLabel, category string, start, end time.Time) ([]Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{
		"date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: 1}})
	cur, err := col("activities").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var res []Activity
	defer cur.Close(ctx)
	return res, cur.All(ctx, &res)
}

func GetActivityByID(id string) (*Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var a Activity
	if err := col("activities").FindOne(ctx, bson.M{"_id": oid}).Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func CreateActivity(a Activity) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if a.AttendeeIDs == nil {
		a.AttendeeIDs = []primitive.ObjectID{}
	}
	a.CreatedAt = time.Now()
	res, err := col("activities").InsertOne(ctx, a)
	if err != nil {
		return err
	}
	a.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func UpdateActivity(id string, fields map[string]any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("activities").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func DeleteActivity(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = col("activities").DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func SetActivityAttendance(id string, attendeeIDs []primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	if attendeeIDs == nil {
		attendeeIDs = []primitive.ObjectID{}
	}
	_, err = col("activities").UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"attendee_ids": attendeeIDs}})
	return err
}

func CountMemberAttendance(memberID primitive.ObjectID, periodLabel, category string, start, end time.Time) (map[string]int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{
		"date": bson.M{
			"$gte": start,
			"$lte": end,
		},
		"attendee_ids": memberID,
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":   "$category",
			"count": bson.M{"$sum": 1},
		}},
	}
	cur, err := col("activities").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	result := map[string]int{}
	var docs []struct {
		ID    string `bson:"_id"`
		Count int    `bson:"count"`
	}
	if err := cur.All(ctx, &docs); err != nil {
		return nil, err
	}
	for _, d := range docs {
		result[d.ID] = d.Count
	}
	return result, nil
}

func CountTotalActivitiesByCategory(periodLabel, category string, start, end time.Time) (map[string]int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{
		"date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	if periodLabel != "" && periodLabel != "ALL" {
		filter["period_label"] = periodLabel
	}
	if category != "" {
		filter["category"] = category
	}
	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":   "$category",
			"count": bson.M{"$sum": 1},
		}},
	}
	cur, err := col("activities").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	result := map[string]int{}
	var docs []struct {
		ID    string `bson:"_id"`
		Count int    `bson:"count"`
	}
	if err := cur.All(ctx, &docs); err != nil {
		return nil, err
	}
	for _, d := range docs {
		result[d.ID] = d.Count
	}
	return result, nil
}
