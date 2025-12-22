extends Control
class_name InteractionPrompt

@onready var label: Label = $Label
@onready var animation_player: AnimationPlayer = $AnimationPlayer

var _target: Node3D = null
var _camera: Camera3D = null


func _ready() -> void:
	visible = false
	_camera = get_viewport().get_camera_3d()


func _process(_delta: float) -> void:
	if _target and _camera and visible:
		# Position prompt above the target in screen space
		var world_pos: Vector3 = _target.global_position + Vector3(0, 2.5, 0)
		var screen_pos: Vector2 = _camera.unproject_position(world_pos)
		
		# Check if in front of camera
		var cam_forward: Vector3 = -_camera.global_transform.basis.z
		var to_target: Vector3 = (world_pos - _camera.global_position).normalized()
		
		if cam_forward.dot(to_target) > 0:
			position = screen_pos - size / 2
			visible = true
		else:
			visible = false


func show_prompt(target: Node3D, text: String = "Press E") -> void:
	_target = target
	label.text = text
	visible = true
	if animation_player:
		animation_player.play("bounce")


func hide_prompt() -> void:
	_target = null
	visible = false

