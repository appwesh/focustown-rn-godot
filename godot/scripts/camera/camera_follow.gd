extends Camera3D
class_name CameraFollow

## Path to the target to follow (usually the player)
@export_node_path("Node3D") var target_path: NodePath
## How smoothly the camera follows
@export var follow_speed: float = 5.0
## How smoothly the camera zooms between states
@export var zoom_speed: float = 3.0
## Camera offset when seated (zoomed in, closer to player)
@export var seated_offset: Vector3 = Vector3(0, 14, 8)
## Camera offset when walking/idle (zoomed out to see full environment) - DEFAULT
@export var normal_offset: Vector3 = Vector3(0, 35, 22)

var target: Node3D
var _focus_position: Vector3
var _current_offset: Vector3


func _ready() -> void:
	# Get target from path
	if target_path:
		target = get_node(target_path)
	
	_current_offset = normal_offset
	
	if target:
		_focus_position = target.global_position
		global_position = _focus_position + _current_offset
		look_at(_focus_position + Vector3(0, 1, 0))


func _physics_process(delta: float) -> void:
	if not target:
		return
	
	# Determine target offset based on player state
	var target_offset := normal_offset
	if target is Player and target._state == Player.State.SITTING:
		target_offset = seated_offset
	
	# Smoothly lerp to target offset
	_current_offset = _current_offset.lerp(target_offset, zoom_speed * delta)
	
	# Smoothly follow the target
	_focus_position = _focus_position.lerp(target.global_position, follow_speed * delta)
	
	# Position camera and look at target
	global_position = _focus_position + _current_offset
	look_at(_focus_position + Vector3(0, 1, 0))
