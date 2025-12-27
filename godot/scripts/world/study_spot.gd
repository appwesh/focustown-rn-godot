extends Area3D
class_name StudySpot
## A spot where the player can sit and start a focus session

## Position offset for the player when sitting
@export var sit_offset := Vector3(0, 0.3, 0)
## Rotation for the player when sitting (Y axis, degrees)
@export var sit_rotation := 0.0

var _player_in_range: Player = null


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	
	# Make sure collision is set up
	monitoring = true
	monitorable = false


func _on_body_entered(body: Node3D) -> void:
	print("[StudySpot] Body entered: ", body.name, " is Player: ", body is Player)
	if body is Player:
		_player_in_range = body
		body.set_nearby_study_spot(self)
		print("[StudySpot] Player in range!")


func _on_body_exited(body: Node3D) -> void:
	print("[StudySpot] Body exited: ", body.name)
	if body is Player and _player_in_range == body:
		_player_in_range = null
		body.clear_nearby_study_spot(self)
		print("[StudySpot] Player left range")


func get_sit_position() -> Vector3:
	return global_position + sit_offset


func get_sit_rotation() -> float:
	return deg_to_rad(sit_rotation) + rotation.y


func interact() -> void:
	if _player_in_range and not FocusSessionManager.is_focusing():
		_player_in_range.sit_at_spot(self)
		FocusSessionManager.start_session(self)

