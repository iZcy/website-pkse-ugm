package cms

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"webapp/internal/db"
)

func Activities(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/activities")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		if idSegment != "" {
			a, err := db.GetActivityByID(idSegment)
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, a)
			return
		}
		period := r.URL.Query().Get("period")
		category := r.URL.Query().Get("category")
		activities, err := db.GetActivities(period, category)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, activities)

	case http.MethodPost:
		var a db.Activity
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		a.CreatedAt = time.Now()
		if a.AttendeeIDs == nil {
			a.AttendeeIDs = []primitive.ObjectID{}
		}
		if err := db.CreateActivity(a); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, a)

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "missing id"})
			return
		}
		if strings.HasSuffix(idSegment, "/attendance") {
			activityID := strings.TrimSuffix(idSegment, "/attendance")
			var body struct {
				AttendeeIDs []string       `json:"attendee_ids"`
				Attendance  map[string]int `json:"attendance"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			oids := make([]primitive.ObjectID, 0, len(body.AttendeeIDs))
			for _, s := range body.AttendeeIDs {
				oid, err := primitive.ObjectIDFromHex(s)
				if err != nil {
					writeJSON(w, 400, map[string]string{"error": "invalid attendee id: " + s})
					return
				}
				oids = append(oids, oid)
			}
			if err := db.SetActivityAttendance(activityID, oids, body.Attendance); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]string{"ok": "true"})
			return
		}
		if strings.HasSuffix(idSegment, "/unpublish") {
			instanceID := strings.TrimSuffix(idSegment, "/unpublish")
			if err := db.UnpublishRaporInstance(instanceID); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]string{"ok": "true"})
			return
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if dateStr, ok := body["date"].(string); ok {
			if t, err := time.Parse(time.RFC3339, dateStr); err == nil {
				body["date"] = t
			}
		}
		if err := db.UpdateActivity(idSegment, body); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"ok": "true"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "missing id"})
			return
		}
		if err := db.DeleteActivity(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"ok": "true"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func RaporInstances(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/rapor-instances")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		if idSegment != "" {
			inst, err := db.GetRaporInstanceByID(idSegment)
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, inst)
			return
		}
		period := r.URL.Query().Get("period")
		instances, err := db.GetRaporInstances(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, instances)

	case http.MethodPost:
		var inst db.RaporInstance
		if err := json.NewDecoder(r.Body).Decode(&inst); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		inst.CreatedAt = time.Now()
		inst.Published = false
		if err := db.CreateRaporInstance(inst); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, inst)

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "missing id"})
			return
		}
		if strings.HasSuffix(idSegment, "/publish") {
			instanceID := strings.TrimSuffix(idSegment, "/publish")
			if err := db.PublishRaporInstance(instanceID); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]string{"ok": "true"})
			return
		}
		if strings.HasSuffix(idSegment, "/unpublish") {
			instanceID := strings.TrimSuffix(idSegment, "/unpublish")
			if err := db.UnpublishRaporInstance(instanceID); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]string{"ok": "true"})
			return
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateRaporInstance(idSegment, body); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"ok": "true"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "missing id"})
			return
		}
		if err := db.DeleteRaporInstance(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"ok": "true"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func RaporEntries(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/rapor-entries")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		instanceID := r.URL.Query().Get("instance_id")
		memberID := r.URL.Query().Get("member_id")
		periodLabel := r.URL.Query().Get("period")
		if memberID != "" && periodLabel != "" {
			entries, err := db.GetRaporEntriesForMember(memberID, periodLabel)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, entries)
			return
		}
		if instanceID != "" {
			entries, err := db.GetRaporEntriesByInstance(instanceID)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, entries)
			return
		}
		writeJSON(w, 400, map[string]string{"error": "instance_id or member_id+period required"})

	case http.MethodPost:
		var body struct {
			InstanceID  string `json:"instance_id"`
			MemberID    string `json:"member_id"`
			PeriodLabel string `json:"period_label"`
			Scores      []interface{}  `json:"scores"`
			Feedback    string `json:"feedback"`
			Published   bool   `json:"published"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		instOID, err := primitive.ObjectIDFromHex(body.InstanceID)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid instance_id"})
			return
		}
		memOID, err := primitive.ObjectIDFromHex(body.MemberID)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid member_id"})
			return
		}
		entry := db.RaporEntry{
			InstanceID:  instOID,
			MemberID:    memOID,
			PeriodLabel: body.PeriodLabel,
			Scores:      body.Scores,
			Feedback:    body.Feedback,
			Published:   body.Published,
			UpdatedAt:   time.Now(),
			CreatedAt:   time.Now(),
		}
		if err := db.UpsertRaporEntry(entry); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		savedEntry, err := db.GetRaporEntry(entry.InstanceID, entry.MemberID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, savedEntry)

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "missing id"})
			return
		}
		if err := db.DeleteRaporEntry(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"ok": "true"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
