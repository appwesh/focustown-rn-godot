extends Control
## Timer UI that floats above the player during focus sessions
## Note: Camera toggle and end session confirmation are handled by React Native

@onready var timer_label: Label = $Panel/TimerLabel
@onready var panel: Panel = $Panel

var _target: Node3D = null
var _camera: Camera3D = null


func _ready() -> void:
	visible = false
	
	FocusSessionManager.session_started.connect(_on_session_started)
	FocusSessionManager.session_ended.connect(_on_session_ended)
	FocusSessionManager.session_tick.connect(_on_session_tick)
	
	# Find camera
	await get_tree().process_frame
	_camera = get_viewport().get_camera_3d()


func _process(_delta: float) -> void:
	if not visible or not _target or not _camera:
		return
	
	# Position above target's head
	var world_pos := _target.global_position + Vector3(0, 2.5, 0)
	var screen_pos := _camera.unproject_position(world_pos)
	
	# Center the panel on the position
	panel.position = screen_pos - panel.size / 2


func _on_session_started(spot: Node3D) -> void:
	# Find the player to follow
	_target = get_tree().get_first_node_in_group("player")
	if not _target:
		_target = spot
	
	timer_label.text = "00:00"
	visible = true


func _on_session_ended(_duration: int, _coins: int) -> void:
	visible = false
	_target = null


func _on_session_tick(elapsed: int) -> void:
	var mins := elapsed / 60
	var secs := elapsed % 60
	timer_label.text = "%02d:%02d" % [mins, secs]

