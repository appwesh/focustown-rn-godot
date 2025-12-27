extends Camera3D
class_name CameraFollow

## Path to the target to follow (usually the player)
@export_node_path("Node3D") var target_path: NodePath
## How smoothly the camera follows
@export var follow_speed: float = 5.0
## Camera offset from target
@export var normal_offset: Vector3 = Vector3(0, 14, 8)

var target: Node3D
var _focus_position: Vector3


func _ready() -> void:
	# Get target from path
	if target_path:
		target = get_node(target_path)
	
	if target:
		_focus_position = target.global_position
		global_position = _focus_position + normal_offset
		look_at(_focus_position + Vector3(0, 1, 0))


func _physics_process(delta: float) -> void:
	if not target:
		return
	
	# Smoothly follow the target
	_focus_position = _focus_position.lerp(target.global_position, follow_speed * delta)
	
	# Position camera and look at target
	global_position = _focus_position + normal_offset
	look_at(_focus_position + Vector3(0, 1, 0))
