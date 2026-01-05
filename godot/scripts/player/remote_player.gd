extends Node3D
class_name RemotePlayer
## A remote player representation for group study sessions
## Shows other users in the café with a floating name label

## Display name shown above the player
var display_name: String = "Friend":
	set(value):
		display_name = value
		_update_label()

## Target position for interpolation (default to player spawn area, not origin)
var target_position: Vector3 = Vector3(-6, 0.5, -2)
var has_target: bool = false

## Interpolation speed
const LERP_SPEED: float = 10.0

## Reference to the label node
@onready var name_label: Label3D = $NameLabel

## Reference to the mesh/model
@onready var mesh: MeshInstance3D = $Mesh


func _ready() -> void:
	_update_label()
	# Start invisible - play_enter() will be called after positioning
	scale = Vector3.ZERO
	# Don't set target_position here - let the teleport set it properly
	# has_target stays false until first set_target_position call


func _process(delta: float) -> void:
	# Smoothly interpolate to target position
	if has_target:
		global_position = global_position.lerp(target_position, LERP_SPEED * delta)
		
		# Face movement direction
		var direction := target_position - global_position
		if direction.length_squared() > 0.01:
			var look_target := global_position + Vector3(direction.x, 0, direction.z)
			if look_target.distance_to(global_position) > 0.1:
				look_at(look_target, Vector3.UP)


## Update the floating name label
func _update_label() -> void:
	if name_label:
		name_label.text = display_name


## Set the display name (called from MultiplayerManager)
func set_display_name(name: String) -> void:
	display_name = name


## Set target position for smooth interpolation
func set_target_position(pos: Vector3) -> void:
	target_position = pos
	has_target = true


## Play entrance animation
func play_enter() -> void:
	# Simple scale in animation
	scale = Vector3.ZERO
	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.tween_property(self, "scale", Vector3.ONE, 0.3)


## Play exit animation
func play_exit() -> void:
	# Simple scale out animation
	var tween := create_tween()
	tween.set_ease(Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_BACK)
	tween.tween_property(self, "scale", Vector3.ZERO, 0.2)


## Face a target position
func look_at_position(target: Vector3) -> void:
	# Only rotate on Y axis
	var look_target := Vector3(target.x, global_position.y, target.z)
	look_at(look_target, Vector3.UP)

