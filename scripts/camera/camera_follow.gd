extends Camera3D
class_name CameraFollow

## Path to the target to follow (usually the player)
@export_node_path("Node3D") var target_path: NodePath
## How smoothly the camera follows
@export var follow_speed: float = 5.0

## Normal gameplay camera settings
@export_group("Normal Mode")
@export var normal_offset: Vector3 = Vector3(0, 14, 8)

## Dialog mode camera settings (AC style zoom)
@export_group("Dialog Mode")
@export var dialog_offset: Vector3 = Vector3(0, 2.5, 2)
@export var dialog_transition_speed: float = 3.0

var target: Node3D
var _dialog_target: Node3D = null
var _is_dialog_mode: bool = false
var _current_offset: Vector3
var _focus_position: Vector3


func _ready() -> void:
	_current_offset = normal_offset
	
	# Get target from path
	if target_path:
		target = get_node(target_path)
	
	if target:
		_focus_position = target.global_position
		global_position = _focus_position + _current_offset
		look_at(_focus_position + Vector3(0, 1, 0))
	
	DialogManager.dialog_started.connect(_on_dialog_started)
	DialogManager.dialog_ended.connect(_on_dialog_ended)


func _physics_process(delta: float) -> void:
	if not target:
		return
	
	# Determine focus point
	var target_focus: Vector3
	var look_height: float = 1.0
	
	if _is_dialog_mode and _dialog_target:
		# Focus between player and NPC, slightly closer to NPC
		var midpoint: Vector3 = (target.global_position + _dialog_target.global_position) / 2.0
		midpoint.y = target.global_position.y
		target_focus = midpoint
		look_height = 1.2  # Look slightly higher during dialog (face level)
		
		# Offset camera to the side for better framing
		var dir_to_npc: Vector3 = (_dialog_target.global_position - target.global_position).normalized()
		var side_offset: Vector3 = Vector3(dir_to_npc.z, 0, -dir_to_npc.x) * 0.5
		target_focus += side_offset
	else:
		target_focus = target.global_position
	
	# Smoothly interpolate offset for dialog transitions
	var target_offset: Vector3 = dialog_offset if _is_dialog_mode else normal_offset
	_current_offset = _current_offset.lerp(target_offset, dialog_transition_speed * delta)
	
	# Smoothly follow the focus point
	_focus_position = _focus_position.lerp(target_focus, follow_speed * delta)
	
	# Position camera and look at focus
	global_position = _focus_position + _current_offset
	look_at(_focus_position + Vector3(0, look_height, 0))


func set_dialog_target(npc: Node3D) -> void:
	_dialog_target = npc


func _on_dialog_started() -> void:
	_is_dialog_mode = true


func _on_dialog_ended() -> void:
	_is_dialog_mode = false
	_dialog_target = null
