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
	FIRST_PERSON,
	SETUP,  # Front-facing view for session setup (shows player face)
	SEATED  # Zoomed-in top view for active focus sessions
}

@export_group("Cameras")
## The overview/cinematic camera (static or animated)
@export var overview_camera: Camera3D
## Auto-create cameras if not assigned
@export var auto_create_cameras: bool = true
## Layers to hide from overview camera (e.g., walls that block the view)
## Objects on layer 2 will be hidden from overview camera
@export_flags_3d_render var overview_hidden_layers: int = 2

@export_group("Third Person Settings")
## Distance behind the target
@export var third_person_distance: float = 2.0
## Height above the target (pivot height)
@export var third_person_height: float = 2.2
## Vertical angle (looking down at character)
@export var third_person_pitch: float = -35.0
## Horizontal offset (0 = centered, positive = right)
@export var third_person_offset: float = 0.0
## How smoothly the camera follows
@export var follow_smoothing: float = 10.0
## FOV for third person
@export var third_person_fov: float = 70.0

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

@export_group("Setup Camera Settings")
## Distance in front of the target for setup view (faces the player)
@export var setup_distance: float = 2.5
## Height for setup view (roughly eye level)
@export var setup_height: float = 1.8
## Vertical angle (slight look down at character)
@export var setup_pitch: float = -35.0
## FOV for setup view
@export var setup_fov: float = 50.0

@export_group("Seated Camera Settings")
## Height above the target for seated view (zoomed top view)
@export var seated_height: float = 5.0
## Distance behind the target
@export var seated_distance: float = 2.0
## Vertical angle (looking down at character)
@export var seated_pitch: float = -50.0
## FOV for seated view (narrower = more zoomed)
@export var seated_fov: float = 40.0

@export_group("Transitions")
## Duration of camera transitions
@export var transition_duration: float = 1.0
## Easing type for transitions
@export var transition_ease: Tween.EaseType = Tween.EASE_IN_OUT
@export var transition_trans: Tween.TransitionType = Tween.TRANS_CUBIC

@export_group("Fade Transition")
## Enable fade to black during transitions
@export var use_fade_transition: bool = true
## Skip fade for third person <-> overview (use smooth interpolation instead)
@export var skip_fade_for_gameplay_toggle: bool = false
## Duration of fade out (to black)
@export var fade_out_duration: float = 0.25
## Duration of fade in (from black)
@export var fade_in_duration: float = 0.35
## Color to fade to
@export var fade_color: Color = Color.BLACK

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
## Setup camera instance (front-facing for session setup)
var _setup_camera: Camera3D
## Setup camera pivot (in front of player)
var _setup_pivot: Node3D
## Seated camera instance (zoomed top view)
var _seated_camera: Camera3D
## Seated camera pivot (follows player from above)
var _seated_pivot: Node3D
## Is currently transitioning
var _is_transitioning: bool = false
## Interpolation camera for smooth transitions
var _interp_camera: Camera3D
## Transition progress (0 to 1)
var _transition_progress: float = 0.0
## Target mode during transition
var _transition_target_mode: CameraMode
## Starting transform for transition
var _transition_start_transform: Transform3D
## Starting FOV for transition
var _transition_start_fov: float
## Fade overlay canvas layer
var _fade_canvas: CanvasLayer
## Fade overlay color rect
var _fade_rect: ColorRect
## Current fade state
enum FadeState { NONE, FADING_OUT, HOLDING, FADING_IN }
var _fade_state: FadeState = FadeState.NONE
## Fade progress (0 to 1)
var _fade_progress: float = 0.0
## Pending camera transition (waiting for fade out)
var _pending_transition_to_name: String = ""
## Whether the current transition uses fade
var _current_transition_uses_fade: bool = false


func _ready() -> void:
	if auto_create_cameras:
		_setup_cameras()


func _physics_process(delta: float) -> void:
	if not _target:
		return
	
	# Only update the active camera (and target during transitions) - not all 4 every frame
	if _is_transitioning:
		# During transition, update both current mode camera and use interp
		_update_camera_for_mode(_transition_target_mode, delta)
	else:
		# Only update the active camera
		_update_camera_for_mode(_current_mode, delta)
	
	# Update fade transition
	if _fade_state != FadeState.NONE:
		_update_fade(delta)
	
	# Update camera interpolation:
	# - If this transition doesn't use fade: always interpolate
	# - If this transition uses fade: only interpolate during HOLDING phase (black screen)
	if _is_transitioning and (not _current_transition_uses_fade or _fade_state == FadeState.HOLDING):
		_update_transition(delta)


func _update_camera_for_mode(mode: CameraMode, delta: float) -> void:
	## Update only the specified camera mode
	match mode:
		CameraMode.THIRD_PERSON:
			_update_third_person_camera(delta)
		CameraMode.FIRST_PERSON:
			_update_first_person_camera()
		CameraMode.SETUP:
			_update_setup_camera(delta)
		CameraMode.SEATED:
			_update_seated_camera(delta)
		# OVERVIEW doesn't need updates (static camera)


func _setup_cameras() -> void:
	## Create the camera instances using SpringArm3D for collision
	
	# Use existing overview camera or find one
	if not overview_camera:
		overview_camera = get_viewport().get_camera_3d()
	
	# Configure overview camera to hide specified layers (e.g., walls blocking the view)
	if overview_camera and overview_hidden_layers > 0:
		# Remove hidden layers from cull mask (default is all layers = 0xFFFFF)
		overview_camera.cull_mask = overview_camera.cull_mask & ~overview_hidden_layers
		print("[CameraRig] Overview camera hiding layers: %d (cull_mask: %d)" % [overview_hidden_layers, overview_camera.cull_mask])
	
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
	_third_person_camera.fov = third_person_fov
	_third_person_camera.current = false
	_spring_arm.add_child(_third_person_camera)
	
	# Create first person camera
	_first_person_camera = Camera3D.new()
	_first_person_camera.name = "FirstPersonCamera"
	_first_person_camera.fov = first_person_fov
	_first_person_camera.current = false
	add_child(_first_person_camera)
	
	# Create setup camera pivot (front-facing for session setup)
	_setup_pivot = Node3D.new()
	_setup_pivot.name = "SetupPivot"
	add_child(_setup_pivot)
	
	# Create setup camera (faces the player)
	_setup_camera = Camera3D.new()
	_setup_camera.name = "SetupCamera"
	_setup_camera.fov = setup_fov
	_setup_camera.current = false
	_setup_pivot.add_child(_setup_camera)
	
	# Create seated camera pivot (zoomed top view for focus sessions)
	_seated_pivot = Node3D.new()
	_seated_pivot.name = "SeatedPivot"
	add_child(_seated_pivot)
	
	# Create seated camera (zoomed overhead view)
	_seated_camera = Camera3D.new()
	_seated_camera.name = "SeatedCamera"
	_seated_camera.fov = seated_fov
	_seated_camera.current = false
	_seated_pivot.add_child(_seated_camera)
	
	# Create interpolation camera for smooth transitions
	_interp_camera = Camera3D.new()
	_interp_camera.name = "InterpCamera"
	_interp_camera.current = false
	add_child(_interp_camera)
	
	# Create fade overlay for transitions
	_setup_fade_overlay()
	
	print("[CameraRig] Cameras initialized with SpringArm3D")


func _setup_fade_overlay() -> void:
	## Create a CanvasLayer with ColorRect for fade transitions
	_fade_canvas = CanvasLayer.new()
	_fade_canvas.name = "FadeCanvas"
	_fade_canvas.layer = 100  # High layer to be on top of everything
	add_child(_fade_canvas)
	
	_fade_rect = ColorRect.new()
	_fade_rect.name = "FadeRect"
	_fade_rect.color = Color(fade_color.r, fade_color.g, fade_color.b, 0.0)  # Start transparent
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE  # Don't block input
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)  # Cover entire screen
	_fade_canvas.add_child(_fade_rect)
	
	print("[CameraRig] Fade overlay initialized")


## Set the target node for the cameras to follow
func set_target(target: Node3D) -> void:
	_target = target
	print("[CameraRig] Target set to: %s" % target.name if target else "null")
	
	# Initialize ALL camera positions immediately (delta=0 means instant snap)
	if _target:
		_update_third_person_camera(0)
		_update_first_person_camera()
		_update_setup_camera(0)
		_update_seated_camera(0)


## Get current camera mode
func get_current_mode() -> CameraMode:
	return _current_mode


## Get current mode as string
func get_current_mode_name() -> String:
	match _current_mode:
		CameraMode.OVERVIEW: return "overview"
		CameraMode.THIRD_PERSON: return "third_person"
		CameraMode.FIRST_PERSON: return "first_person"
		CameraMode.SETUP: return "setup"
		CameraMode.SEATED: return "seated"
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


## Switch to setup camera (front-facing for session setup)
func switch_to_setup(instant: bool = false) -> void:
	_switch_to_mode(CameraMode.SETUP, instant)


## Switch to seated camera (zoomed top view for focus sessions)
func switch_to_seated(instant: bool = false) -> void:
	_switch_to_mode(CameraMode.SEATED, instant)


## Cycle through camera modes (excludes SEATED - that's only for focus sessions)
func cycle_camera() -> void:
	var next_mode: CameraMode
	match _current_mode:
		CameraMode.OVERVIEW:
			next_mode = CameraMode.THIRD_PERSON
		CameraMode.THIRD_PERSON:
			next_mode = CameraMode.FIRST_PERSON
		CameraMode.FIRST_PERSON:
			next_mode = CameraMode.SETUP
		CameraMode.SETUP:
			next_mode = CameraMode.OVERVIEW
		CameraMode.SEATED:
			next_mode = CameraMode.OVERVIEW  # Exit seated goes to overview
	_switch_to_mode(next_mode)


## Cycle between overview, third person, and setup during focus session
func toggle_session_camera() -> void:
	var next_mode: CameraMode
	match _current_mode:
		CameraMode.OVERVIEW:
			next_mode = CameraMode.THIRD_PERSON
		CameraMode.THIRD_PERSON:
			next_mode = CameraMode.SETUP
		CameraMode.SETUP:
			next_mode = CameraMode.OVERVIEW
		_:
			next_mode = CameraMode.OVERVIEW
	_switch_to_mode(next_mode)


func _switch_to_mode(new_mode: CameraMode, instant: bool = false) -> void:
	if new_mode == _current_mode and not instant and not _is_transitioning:
		return
	
	var old_mode := _current_mode
	_current_mode = new_mode
	
	var to_camera := _get_camera_for_mode(new_mode)
	
	if not to_camera:
		push_warning("[CameraRig] Missing camera for transition")
		return
	
	# Determine the "from" camera - if transitioning, use interp camera's current position
	var from_camera: Camera3D
	var effective_old_mode := old_mode
	if _is_transitioning and _interp_camera:
		from_camera = _interp_camera
	else:
		from_camera = _get_camera_for_mode(old_mode)
	
	if not from_camera:
		from_camera = to_camera  # Fallback
	
	var from_name := _mode_to_string(old_mode) if not _is_transitioning else "transition"
	var to_name := _mode_to_string(new_mode)
	
	print("[CameraRig] Switching from %s to %s" % [from_name, to_name])
	transition_started.emit(from_name, to_name)
	
	if instant:
		_is_transitioning = false
		to_camera.current = true
		camera_changed.emit(to_name)
		transition_finished.emit(to_name)
	else:
		_animate_transition(from_camera, to_camera, to_name, effective_old_mode)


func _animate_transition(from_camera: Camera3D, _to_camera: Camera3D, to_name: String, from_mode: CameraMode) -> void:
	## Animate smooth transition between cameras using dynamic interpolation
	## This follows the target camera in real-time instead of tweening to a static position
	
	# Force update target camera position before transition starts
	# This ensures we're transitioning to the correct position
	_force_update_camera_for_mode(_current_mode)
	
	_is_transitioning = true
	_transition_progress = 0.0
	_transition_target_mode = _current_mode
	_pending_transition_to_name = to_name
	
	# Store starting position
	_transition_start_transform = from_camera.global_transform
	_transition_start_fov = from_camera.fov
	
	# Use interpolation camera for smooth transition
	_interp_camera.global_transform = _transition_start_transform
	_interp_camera.fov = _transition_start_fov
	_interp_camera.current = true
	
	# Check if this specific transition should use fade
	_current_transition_uses_fade = use_fade_transition and _should_use_fade(from_mode, _current_mode)
	
	if _current_transition_uses_fade:
		_start_fade_out()
		print("[CameraRig] Starting fade transition to %s" % to_name)
	else:
		print("[CameraRig] Starting smooth transition to %s" % to_name)


func _should_use_fade(from_mode: CameraMode, to_mode: CameraMode) -> bool:
	## Determine if fade should be used for this specific transition
	## Returns false for smooth transitions (no fade needed)
	
	# Optionally skip fade for third person <-> overview (gameplay camera toggle)
	if skip_fade_for_gameplay_toggle:
		if from_mode == CameraMode.THIRD_PERSON and to_mode == CameraMode.OVERVIEW:
			return false
		if from_mode == CameraMode.OVERVIEW and to_mode == CameraMode.THIRD_PERSON:
			return false
	
	# All other transitions use fade
	return true


func _force_update_camera_for_mode(mode: CameraMode) -> void:
	## Force update a specific camera to its correct position (instant, no smoothing)
	match mode:
		CameraMode.THIRD_PERSON:
			_update_third_person_camera(0)
		CameraMode.FIRST_PERSON:
			_update_first_person_camera()
		CameraMode.SETUP:
			_update_setup_camera(0)
		CameraMode.SEATED:
			_update_seated_camera(0)


func _update_transition(delta: float) -> void:
	## Update the transition interpolation every frame
	## This allows smooth following of moving target cameras
	
	if not _is_transitioning:
		return
	
	# Advance progress
	_transition_progress += delta / transition_duration
	
	# Apply easing
	var eased_progress := _ease_in_out_cubic(_transition_progress)
	
	# Get current target camera position (may have moved since transition started)
	var target_camera := _get_camera_for_mode(_transition_target_mode)
	if not target_camera:
		_finish_transition()
		return
	
	# Interpolate position using slerp for rotation (smoother) and lerp for position
	var start_pos := _transition_start_transform.origin
	var target_pos := target_camera.global_transform.origin
	var interp_pos := start_pos.lerp(target_pos, eased_progress)
	
	# Slerp for rotation (handles orientation much better)
	var start_basis := _transition_start_transform.basis.get_rotation_quaternion()
	var target_basis := target_camera.global_transform.basis.get_rotation_quaternion()
	var interp_rotation := start_basis.slerp(target_basis, eased_progress)
	
	_interp_camera.global_transform = Transform3D(Basis(interp_rotation), interp_pos)
	
	# Lerp FOV
	_interp_camera.fov = lerpf(_transition_start_fov, target_camera.fov, eased_progress)
	
	# Check if transition complete
	if _transition_progress >= 1.0:
		_finish_transition()


func _finish_transition() -> void:
	## Complete the transition and switch to the actual target camera
	var target_camera := _get_camera_for_mode(_transition_target_mode)
	if target_camera:
		# Snap to final position to avoid any micro-jumps
		_interp_camera.global_transform = target_camera.global_transform
		_interp_camera.fov = target_camera.fov
		target_camera.current = true
	
	_is_transitioning = false
	_transition_progress = 0.0
	_current_transition_uses_fade = false
	
	var mode_name := _mode_to_string(_transition_target_mode)
	camera_changed.emit(mode_name)
	transition_finished.emit(mode_name)
	print("[CameraRig] Transition complete to %s" % mode_name)


func _ease_in_out_cubic(t: float) -> float:
	## Cubic ease-in-out function for smooth transitions
	t = clampf(t, 0.0, 1.0)
	if t < 0.5:
		return 4.0 * t * t * t
	else:
		return 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0


# =============================================================================
# Fade Transition Functions
# =============================================================================

func _start_fade_out() -> void:
	## Start fading the screen to black
	_fade_state = FadeState.FADING_OUT
	_fade_progress = 0.0
	print("[CameraRig] Fade out started")


func _update_fade(delta: float) -> void:
	## Update the fade overlay based on current state
	if not _fade_rect:
		return
	
	match _fade_state:
		FadeState.FADING_OUT:
			_fade_progress += delta / fade_out_duration
			var alpha := _ease_in_out_cubic(_fade_progress)
			_fade_rect.color.a = alpha
			
			if _fade_progress >= 1.0:
				_fade_rect.color.a = 1.0
				_on_fade_out_complete()
		
		FadeState.HOLDING:
			# Camera transition happens during this phase
			# Wait for camera transition to complete before fading in
			if not _is_transitioning:
				_start_fade_in()
		
		FadeState.FADING_IN:
			_fade_progress += delta / fade_in_duration
			var alpha := 1.0 - _ease_in_out_cubic(_fade_progress)
			_fade_rect.color.a = alpha
			
			if _fade_progress >= 1.0:
				_fade_rect.color.a = 0.0
				_on_fade_in_complete()


func _on_fade_out_complete() -> void:
	## Called when screen is fully black - do the camera switch
	print("[CameraRig] Fade out complete, switching camera")
	_fade_state = FadeState.HOLDING
	
	# Snap the camera to target immediately (no smooth interpolation needed when black)
	var target_camera := _get_camera_for_mode(_transition_target_mode)
	if target_camera:
		_interp_camera.global_transform = target_camera.global_transform
		_interp_camera.fov = target_camera.fov
	
	# Complete the camera transition
	_finish_transition()


func _start_fade_in() -> void:
	## Start fading back from black
	_fade_state = FadeState.FADING_IN
	_fade_progress = 0.0
	print("[CameraRig] Fade in started")


func _on_fade_in_complete() -> void:
	## Called when fade is complete
	_fade_state = FadeState.NONE
	_fade_progress = 0.0
	_pending_transition_to_name = ""
	print("[CameraRig] Fade transition complete")


func _get_camera_for_mode(mode: CameraMode) -> Camera3D:
	match mode:
		CameraMode.OVERVIEW:
			return overview_camera
		CameraMode.THIRD_PERSON:
			return _third_person_camera
		CameraMode.FIRST_PERSON:
			return _first_person_camera
		CameraMode.SETUP:
			return _setup_camera
		CameraMode.SEATED:
			return _seated_camera
	return null


func _mode_to_string(mode: CameraMode) -> String:
	match mode:
		CameraMode.OVERVIEW: return "overview"
		CameraMode.THIRD_PERSON: return "third_person"
		CameraMode.FIRST_PERSON: return "first_person"
		CameraMode.SETUP: return "setup"
		CameraMode.SEATED: return "seated"
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


func _update_setup_camera(delta: float) -> void:
	## Update setup camera (front-facing) to look at target's face
	if not _setup_pivot or not _setup_camera or not _target:
		return
	
	var target_pos := _target.global_position
	var target_rotation := _target.global_rotation.y
	
	# Get the direction the character is facing
	var forward_dir := Vector3(sin(target_rotation), 0, cos(target_rotation))
	
	# Position camera in front of the character
	var desired_pivot_pos := target_pos + forward_dir * setup_distance + Vector3.UP * setup_height
	
	# Smooth follow for the pivot
	if delta > 0:
		_setup_pivot.global_position = _setup_pivot.global_position.lerp(
			desired_pivot_pos,
			follow_smoothing * delta
		)
	else:
		_setup_pivot.global_position = desired_pivot_pos
	
	# Camera looks at the character's face
	_setup_camera.global_position = _setup_pivot.global_position
	_setup_camera.look_at(target_pos + Vector3.UP * 1.2)  # Look at roughly face height


func _update_seated_camera(delta: float) -> void:
	## Update seated camera (zoomed top view) to look down at target
	if not _seated_pivot or not _seated_camera or not _target:
		return
	
	var target_pos := _target.global_position
	
	# Position pivot above and behind the target
	var desired_pivot_pos := target_pos + Vector3.UP * seated_height + Vector3.BACK * seated_distance
	
	# Smooth follow for the pivot
	if delta > 0:
		_seated_pivot.global_position = _seated_pivot.global_position.lerp(
			desired_pivot_pos,
			follow_smoothing * delta
		)
	else:
		_seated_pivot.global_position = desired_pivot_pos
	
	# Camera looks down at the target
	_seated_camera.global_position = _seated_pivot.global_position
	_seated_camera.look_at(target_pos + Vector3.UP * 0.5)  # Look at roughly chest height


## Get the currently active camera
func get_active_camera() -> Camera3D:
	if _is_transitioning:
		return _interp_camera
	return _get_camera_for_mode(_current_mode)
