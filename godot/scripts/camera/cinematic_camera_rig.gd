extends Node3D
class_name CinematicCameraRig

## Multi-camera rig with smooth transitions between views
## Uses SpringArm3D for proper camera collision (industry standard)

signal camera_changed(camera_name: String)
signal transition_started(from: String, to: String)
signal transition_finished(camera_name: String)

enum CameraMode {
	OVERVIEW,
	THIRD_PERSON,
	FIRST_PERSON
}

@export_group("Cameras")
## The overview/cinematic camera (static or animated)
@export var overview_camera: Camera3D
## Auto-create cameras if not assigned
@export var auto_create_cameras: bool = true

@export_group("Third Person Settings")
## Distance behind the target
@export var third_person_distance: float = 2.0
## Height above the target (pivot height)
@export var third_person_height: float = 1.5
## Vertical angle (looking down at character)
@export var third_person_pitch: float = -20.0
## Horizontal offset (0 = centered, positive = right)
@export var third_person_offset: float = 0.5
## How smoothly the camera follows
@export var follow_smoothing: float = 10.0

@export_group("Camera Collision")
## Collision margin for SpringArm
@export var collision_margin: float = 0.2
## Collision mask for walls/obstacles
@export_flags_3d_physics var collision_mask: int = 1

@export_group("First Person Settings")
## Height for first person view
@export var first_person_height: float = 1.6
## Forward offset from character center
@export var first_person_forward: float = 0.1
## FOV for first person
@export var first_person_fov: float = 70.0

@export_group("Transitions")
## Duration of camera transitions
@export var transition_duration: float = 1.0
## Easing type for transitions
@export var transition_ease: Tween.EaseType = Tween.EASE_IN_OUT
@export var transition_trans: Tween.TransitionType = Tween.TRANS_CUBIC

## The target node to follow (usually the player character)
var _target: Node3D
## Current camera mode
var _current_mode: CameraMode = CameraMode.OVERVIEW
## Third person pivot (follows player, holds spring arm)
var _third_person_pivot: Node3D
## Spring arm for camera collision
var _spring_arm: SpringArm3D
## Third person camera instance
var _third_person_camera: Camera3D
## First person camera instance
var _first_person_camera: Camera3D
## Active transition tween
var _transition_tween: Tween
## Is currently transitioning
var _is_transitioning: bool = false
## Interpolation camera for smooth transitions
var _interp_camera: Camera3D


func _ready() -> void:
	if auto_create_cameras:
		_setup_cameras()


func _physics_process(delta: float) -> void:
	if not _target:
		return
	
	# Update camera positions based on target
	_update_third_person_camera(delta)
	_update_first_person_camera()


func _setup_cameras() -> void:
	## Create the camera instances using SpringArm3D for collision
	
	# Use existing overview camera or find one
	if not overview_camera:
		overview_camera = get_viewport().get_camera_3d()
	
	# Create third person pivot (this follows the player)
	_third_person_pivot = Node3D.new()
	_third_person_pivot.name = "ThirdPersonPivot"
	add_child(_third_person_pivot)
	
	# Create SpringArm3D for camera collision
	_spring_arm = SpringArm3D.new()
	_spring_arm.name = "SpringArm"
	_spring_arm.spring_length = third_person_distance
	_spring_arm.collision_mask = collision_mask
	_spring_arm.margin = collision_margin
	_spring_arm.rotation_degrees.x = third_person_pitch
	_spring_arm.position.x = third_person_offset
	_third_person_pivot.add_child(_spring_arm)
	
	# Create third person camera at end of spring arm
	_third_person_camera = Camera3D.new()
	_third_person_camera.name = "ThirdPersonCamera"
	_third_person_camera.current = false
	_spring_arm.add_child(_third_person_camera)
	
	# Create first person camera
	_first_person_camera = Camera3D.new()
	_first_person_camera.name = "FirstPersonCamera"
	_first_person_camera.fov = first_person_fov
	_first_person_camera.current = false
	add_child(_first_person_camera)
	
	# Create interpolation camera for smooth transitions
	_interp_camera = Camera3D.new()
	_interp_camera.name = "InterpCamera"
	_interp_camera.current = false
	add_child(_interp_camera)
	
	print("[CameraRig] Cameras initialized with SpringArm3D")


## Set the target node for the cameras to follow
func set_target(target: Node3D) -> void:
	_target = target
	print("[CameraRig] Target set to: %s" % target.name if target else "null")
	
	# Initialize camera positions immediately
	if _target:
		_update_third_person_camera(0)
		_update_first_person_camera()


## Get current camera mode
func get_current_mode() -> CameraMode:
	return _current_mode


## Get current mode as string
func get_current_mode_name() -> String:
	match _current_mode:
		CameraMode.OVERVIEW: return "overview"
		CameraMode.THIRD_PERSON: return "third_person"
		CameraMode.FIRST_PERSON: return "first_person"
	return "unknown"


## Check if currently transitioning
func is_transitioning() -> bool:
	return _is_transitioning


## Switch to overview camera
func switch_to_overview(instant: bool = false) -> void:
	_switch_to_mode(CameraMode.OVERVIEW, instant)


## Switch to third person camera
func switch_to_third_person(instant: bool = false) -> void:
	_switch_to_mode(CameraMode.THIRD_PERSON, instant)


## Switch to first person camera
func switch_to_first_person(instant: bool = false) -> void:
	_switch_to_mode(CameraMode.FIRST_PERSON, instant)


## Cycle through camera modes
func cycle_camera() -> void:
	var next_mode: CameraMode
	match _current_mode:
		CameraMode.OVERVIEW:
			next_mode = CameraMode.THIRD_PERSON
		CameraMode.THIRD_PERSON:
			next_mode = CameraMode.FIRST_PERSON
		CameraMode.FIRST_PERSON:
			next_mode = CameraMode.OVERVIEW
	_switch_to_mode(next_mode)


func _switch_to_mode(new_mode: CameraMode, instant: bool = false) -> void:
	if new_mode == _current_mode and not instant:
		return
	
	var old_mode := _current_mode
	_current_mode = new_mode
	
	var from_camera := _get_camera_for_mode(old_mode)
	var to_camera := _get_camera_for_mode(new_mode)
	
	if not from_camera or not to_camera:
		push_warning("[CameraRig] Missing camera for transition")
		return
	
	var from_name := _mode_to_string(old_mode)
	var to_name := _mode_to_string(new_mode)
	
	print("[CameraRig] Switching from %s to %s" % [from_name, to_name])
	transition_started.emit(from_name, to_name)
	
	if instant:
		to_camera.current = true
		camera_changed.emit(to_name)
		transition_finished.emit(to_name)
	else:
		_animate_transition(from_camera, to_camera, to_name)


func _animate_transition(from_camera: Camera3D, to_camera: Camera3D, to_name: String) -> void:
	## Animate smooth transition between cameras
	
	# Kill existing transition
	if _transition_tween and _transition_tween.is_valid():
		_transition_tween.kill()
	
	_is_transitioning = true
	
	# Use interpolation camera for smooth transition
	_interp_camera.global_transform = from_camera.global_transform
	_interp_camera.fov = from_camera.fov
	_interp_camera.current = true
	
	# Create transition tween
	_transition_tween = create_tween()
	_transition_tween.set_ease(transition_ease)
	_transition_tween.set_trans(transition_trans)
	_transition_tween.set_parallel(true)
	
	# Tween transform and FOV
	_transition_tween.tween_property(_interp_camera, "global_transform", to_camera.global_transform, transition_duration)
	_transition_tween.tween_property(_interp_camera, "fov", to_camera.fov, transition_duration)
	
	# On complete, switch to actual target camera
	_transition_tween.chain().tween_callback(func():
		to_camera.current = true
		_is_transitioning = false
		camera_changed.emit(to_name)
		transition_finished.emit(to_name)
	)


func _get_camera_for_mode(mode: CameraMode) -> Camera3D:
	match mode:
		CameraMode.OVERVIEW:
			return overview_camera
		CameraMode.THIRD_PERSON:
			return _third_person_camera
		CameraMode.FIRST_PERSON:
			return _first_person_camera
	return null


func _mode_to_string(mode: CameraMode) -> String:
	match mode:
		CameraMode.OVERVIEW: return "overview"
		CameraMode.THIRD_PERSON: return "third_person"
		CameraMode.FIRST_PERSON: return "first_person"
	return "unknown"


func _update_third_person_camera(delta: float) -> void:
	## Update third person camera pivot to follow target
	## SpringArm3D handles collision automatically
	if not _third_person_pivot or not _spring_arm or not _target:
		return
	
	var target_pos := _target.global_position
	var target_rotation := _target.global_rotation.y
	
	# Desired pivot position (at character's shoulder height)
	var desired_pivot_pos := target_pos + Vector3.UP * third_person_height
	
	# Smooth follow for the pivot
	if delta > 0:
		_third_person_pivot.global_position = _third_person_pivot.global_position.lerp(
			desired_pivot_pos, 
			follow_smoothing * delta
		)
		# Smoothly rotate to face same direction as character (camera behind)
		var current_y := _third_person_pivot.rotation.y
		var target_y := target_rotation + PI  # Camera looks at character's back
		_third_person_pivot.rotation.y = lerp_angle(current_y, target_y, follow_smoothing * delta)
	else:
		_third_person_pivot.global_position = desired_pivot_pos
		_third_person_pivot.rotation.y = target_rotation + PI


func _update_first_person_camera() -> void:
	## Update first person camera to match target's head position
	if not _first_person_camera or not _target:
		return
	
	var target_pos := _target.global_position
	var target_rotation := _target.global_rotation.y
	
	# Position at head height
	var head_pos := target_pos + Vector3.UP * first_person_height
	
	# Slight forward offset (character's forward direction)
	var forward_dir := Vector3(sin(target_rotation), 0, cos(target_rotation))
	head_pos += forward_dir * first_person_forward
	
	_first_person_camera.global_position = head_pos
	# Camera looks down -Z, so add PI to face the same direction as character
	_first_person_camera.global_rotation.y = target_rotation + PI


## Get the currently active camera
func get_active_camera() -> Camera3D:
	if _is_transitioning:
		return _interp_camera
	return _get_camera_for_mode(_current_mode)
