extends Area3D
class_name Interactable

signal interacted

## Display name shown in prompts
@export var display_name: String = "Object"
## Dialog lines to show when interacted
@export var dialog_lines: Array[String] = []
## Speaker name for dialog
@export var speaker_name: String = ""

var _player_ref: Player = null


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)


func interact() -> void:
	interacted.emit()
	
	# Tell camera to focus on this NPC during dialog
	var camera_pivot = get_tree().get_first_node_in_group("camera_pivot")
	if camera_pivot and camera_pivot.has_method("set_dialog_target"):
		camera_pivot.set_dialog_target(get_parent())
	
	# Make player face the NPC
	if _player_ref:
		var dir_to_npc: Vector3 = get_parent().global_position - _player_ref.global_position
		dir_to_npc.y = 0
		if dir_to_npc.length() > 0.1:
			_player_ref.rotation.y = atan2(dir_to_npc.x, dir_to_npc.z)
	
	if dialog_lines.size() > 0:
		DialogManager.start_dialog(speaker_name, dialog_lines)


func _on_body_entered(body: Node3D) -> void:
	if body is Player:
		_player_ref = body
		body.set_nearby_interactable(self)


func _on_body_exited(body: Node3D) -> void:
	if body is Player:
		body.clear_nearby_interactable(self)
		_player_ref = null
