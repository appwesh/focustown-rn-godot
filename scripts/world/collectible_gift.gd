extends Node3D
class_name CollectibleGift

@export var target_position: Vector3 = Vector3(-6, 0, -2)  # Near player's house
@export var float_height: float = 0.3
@export var float_speed: float = 2.0
@export var rotation_speed: float = 1.5
@export var move_duration: float = 2.0

var _base_y: float
var _time: float = 0.0
var _is_collected: bool = false
var _is_moving: bool = false


func _ready() -> void:
	_base_y = position.y
	InventoryManager.item_added.connect(_on_item_added)


func _process(delta: float) -> void:
	_time += delta
	
	if _is_moving:
		return
	
	# Floating animation
	position.y = _base_y + sin(_time * float_speed) * float_height
	
	# Rotation
	rotate_y(delta * rotation_speed)


func _on_item_added(item_id: String) -> void:
	if item_id == "holiday_gift" and not _is_collected:
		_is_collected = true
		_move_to_house()


func _move_to_house() -> void:
	_is_moving = true
	
	# Tell camera to follow the gift
	var camera := get_viewport().get_camera_3d()
	if camera and camera.has_method("track_object"):
		camera.track_object(self)
	
	var start_pos := global_position
	var end_pos := target_position
	var arc_height := 4.0
	
	var tween := create_tween()
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.set_trans(Tween.TRANS_SINE)
	
	# Animate position with arc
	tween.tween_method(
		func(t: float):
			var pos := start_pos.lerp(end_pos, t)
			# Add arc
			pos.y += sin(t * PI) * arc_height
			global_position = pos
			# Keep rotating during movement
			rotate_y(get_process_delta_time() * rotation_speed * 3),
		0.0,
		1.0,
		move_duration
	)
	
	tween.tween_callback(_on_move_complete)


func _on_move_complete() -> void:
	_is_moving = false
	_base_y = position.y
	
	# Stop camera tracking
	var camera := get_viewport().get_camera_3d()
	if camera and camera.has_method("stop_tracking"):
		camera.stop_tracking()

