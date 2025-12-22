extends Control
class_name QuestUI

@onready var quest_panel: PanelContainer = $QuestPanel
@onready var quest_title: Label = $QuestPanel/MarginContainer/VBoxContainer/QuestTitle
@onready var quest_objective: Label = $QuestPanel/MarginContainer/VBoxContainer/QuestObjective
@onready var animation_player: AnimationPlayer = $AnimationPlayer

var _showing_completion: bool = false


func _ready() -> void:
	quest_panel.visible = false
	
	QuestManager.quest_started.connect(_on_quest_started)
	QuestManager.quest_updated.connect(_on_quest_updated)
	QuestManager.quest_completed.connect(_on_quest_completed)


func _on_quest_started(quest_id: String) -> void:
	_update_display()
	quest_panel.visible = true
	if animation_player:
		animation_player.play("show")


func _on_quest_updated(quest_id: String) -> void:
	_update_display()


func _on_quest_completed(quest_id: String) -> void:
	_showing_completion = true
	quest_title.text = "✓ Quest Complete!"
	quest_objective.text = "Well done!"
	
	if animation_player:
		animation_player.play("complete")
	
	await get_tree().create_timer(3.0).timeout
	
	_showing_completion = false
	var active_quest := QuestManager.get_active_quest()
	if active_quest.is_empty():
		quest_panel.visible = false
	else:
		_update_display()


func _update_display() -> void:
	if _showing_completion:
		return
	
	var quest := QuestManager.get_active_quest()
	if quest.is_empty():
		quest_panel.visible = false
		return
	
	quest_title.text = quest["title"]
	
	# Find first incomplete objective
	for obj in quest["objectives"]:
		if not obj["completed"]:
			quest_objective.text = "• " + obj["text"]
			return
	
	quest_objective.text = "Complete!"

