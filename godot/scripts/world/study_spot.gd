extends Area3D
class_name StudySpot
## A spot where the player can sit and start a focus session
## Tappable - player auto-walks to it when tapped

## Position offset for the player when sitting
@export var sit_offset := Vector3(0, 0.3, 0)
## Rotation for the player when sitting (Y axis, degrees)
@export var sit_rotation := 0.0

var _player_in_range: Player = null


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	
	# Add to study_spots group for multiplayer manager
	add_to_group("study_spots")
	
	# Enable input events for tap detection
	# Must be on a collision layer for ray picking to work
	input_ray_pickable = true
	collision_layer = 2  # Layer 2 for interactables (layer 1 is player/world)
	
	# Make sure collision is set up
	monitoring = true
	monitorable = false


## Handle tap/click input on this study spot
func _input_event(_camera: Camera3D, event: InputEvent, _position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton or event is InputEventScreenTouch:
		if event.pressed:
			print("[StudySpot] Tapped!")
			_on_tapped()


func _on_tapped() -> void:
	if FocusSessionManager.is_focusing():
		print("[StudySpot] Already in a session, ignoring tap")
		return
	
	# Find the player and tell them to walk to this spot
	var player := _find_player()
	if player:
		print("[StudySpot] Telling player to walk here")
		player.walk_to_spot(self)


func _find_player() -> Player:
	# Try to find player in scene tree
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		return players[0] as Player
	
	# Fallback: search from root
	var root := get_tree().get_root()
	return root.find_child("Player", true, false) as Player


func _on_body_entered(body: Node3D) -> void:
	if body is Player:
		_player_in_range = body
		body.set_nearby_study_spot(self)
		print("[StudySpot] Player in range")


func _on_body_exited(body: Node3D) -> void:
	if body is Player and _player_in_range == body:
		_player_in_range = null
		body.clear_nearby_study_spot(self)
		print("[StudySpot] Player left range")


func get_sit_position() -> Vector3:
	return global_position + sit_offset


func get_sit_rotation() -> float:
	return deg_to_rad(sit_rotation) + rotation.y


## Called when player arrives at this spot (from auto-walk)
func on_player_arrived(player: Player) -> void:
	if not FocusSessionManager.is_focusing():
		player.sit_at_spot(self)
		# Notify RN that player is seated (RN will show session setup modal)
		RNBridge.on_player_seated_at_spot(self)


## Legacy interact for keyboard/button - now just triggers walk
func interact() -> void:
	if _player_in_range and not FocusSessionManager.is_focusing():
		_player_in_range.sit_at_spot(self)
		RNBridge.on_player_seated_at_spot(self)

