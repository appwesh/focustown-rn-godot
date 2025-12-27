extends Node

signal quest_started(quest_id: String)
signal quest_completed(quest_id: String)
signal quest_updated(quest_id: String)

# Quest data structure
# {
#   "id": String,
#   "title": String,
#   "description": String,
#   "objectives": [{ "id": String, "text": String, "completed": bool }],
#   "completed": bool
# }

var _active_quests: Dictionary = {}  # quest_id -> quest_data
var _completed_quests: Array[String] = []


func start_quest(quest_id: String, title: String, description: String, objectives: Array) -> void:
	if _active_quests.has(quest_id) or quest_id in _completed_quests:
		return
	
	var quest_data := {
		"id": quest_id,
		"title": title,
		"description": description,
		"objectives": [],
		"completed": false
	}
	
	for obj in objectives:
		quest_data["objectives"].append({
			"id": obj["id"],
			"text": obj["text"],
			"completed": false
		})
	
	_active_quests[quest_id] = quest_data
	quest_started.emit(quest_id)


func complete_objective(quest_id: String, objective_id: String) -> void:
	if not _active_quests.has(quest_id):
		return
	
	var quest: Dictionary = _active_quests[quest_id]
	
	for obj in quest["objectives"]:
		if obj["id"] == objective_id:
			obj["completed"] = true
			break
	
	quest_updated.emit(quest_id)
	
	# Check if all objectives complete
	var all_complete := true
	for obj in quest["objectives"]:
		if not obj["completed"]:
			all_complete = false
			break
	
	if all_complete:
		complete_quest(quest_id)


func complete_quest(quest_id: String) -> void:
	if not _active_quests.has(quest_id):
		return
	
	var quest: Dictionary = _active_quests[quest_id]
	quest["completed"] = true
	
	_completed_quests.append(quest_id)
	_active_quests.erase(quest_id)
	
	quest_completed.emit(quest_id)


func get_active_quest() -> Dictionary:
	if _active_quests.is_empty():
		return {}
	return _active_quests.values()[0]


func get_quest(quest_id: String) -> Dictionary:
	return _active_quests.get(quest_id, {})


func is_quest_active(quest_id: String) -> bool:
	return _active_quests.has(quest_id)


func is_quest_completed(quest_id: String) -> bool:
	return quest_id in _completed_quests

