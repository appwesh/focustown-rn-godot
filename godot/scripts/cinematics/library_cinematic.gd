extends Node3D
class_name LibraryCinematic

## Library cinematic scene controller
## Manages character spawning, animation, and cinematic sequences
## Supports tap-to-move and focus session functionality

signal cinematic_started
signal cinematic_finished
signal character_spawned(character: CinematicCharacter)
signal tap_detected(world_position: Vector3)
signal session_triggered(spot_position: Vector3)
signal entrance_cinematic_started
signal entrance_cinematic_finished

## Character spawn configuration
@export_group("Character Setup")
@export var character_preset_name: String = "librarian"
@export var character_spawn_position: Vector3 = Vector3(0, 0, 11)
@export var character_spawn_rotation: float = 0.0  # Y rotation in degrees

@export_group("Entrance Cinematic")
## Enable the entrance cinematic when scene starts
@export var play_entrance_cinematic: bool = false
## Position where character enters (e.g., doorway)
@export var entrance_position: Vector3 = Vector3(0, 0, 14)
## Rotation when entering (facing into the cafe)
@export var entrance_rotation: float = 180.0
## Position to walk to after entering
@export var entrance_destination: Vector3 = Vector3(0, 0, 8)
## Delay before starting the walk (lets camera settle)
@export var entrance_start_delay: float = 0.5
## Delay after reaching destination before switching to overview
@export var entrance_end_delay: float = 0.8
## Walk speed during entrance (can be slower for cinematic effect)
@export var entrance_walk_speed: float = 1.8
## Fixed entrance camera position (on the left side, looking at player)
@export var entrance_camera_position: Vector3 = Vector3(-3, 1.5, 9)
## Animation to play after arriving (before overview)
@export var entrance_arrival_animation: String = "BoredIdle_01"
## Duration to show the arrival animation before transitioning to overview
@export var entrance_animation_duration: float = 1.5

@export_group("Animation")
@export var idle_animation: String = "Idle_F"
@export var sit_down_animation: String = "SITTING_ON_CHAIR_02"  # Transition from walking to sitting
@export var sitting_animation: String = "Idle_Sitting_01"  # Animation when seated (looping)
@export var studying_animation: String = "SITTING_USING_LAPTOP_02"  # Animation during focus session (looping)
@export var celebration_animation: String = "SITTING_FIST_PUMP_03"  # Animation on session success
@export var auto_start: bool = true

@export_group("Additional Characters")
## Spawn additional NPC characters on start
@export var spawn_npcs: bool = true
## NPC character configurations: [preset_name, position, rotation]
@export var npc_configs: Array[Dictionary] = []

@export_group("Study Spots")
## Enable study spot interaction (tap chair to start session)
@export var study_spots_enabled: bool = true
## Distance threshold to consider "arrived" at a study spot
@export var study_spot_arrival_distance: float = 0.5

@export_group("Click to Move")
## Enable tap/click to move functionality
@export var click_to_move_enabled: bool = true

## The camera to use for raycasting (auto-detected if not set)
@export var raycast_camera: Camera3D

## Maximum raycast distance
@export var raycast_distance: float = 100.0

## Ground collision layer (bit mask) - set to the layer your floor uses
@export_flags_3d_physics var ground_layer: int = 1

## Show click indicator (optional visual feedback)
@export var show_click_indicator: bool = true

@export_group("Keyboard Controls")
## Enable WASD/Arrow key movement
@export var keyboard_movement_enabled: bool = true
## Movement speed when using keyboard
@export var keyboard_move_speed: float = 3.0
## Enable camera toggle with C key
@export var camera_toggle_enabled: bool = true

@export_group("Character Collision")
## Enable character wall collision
@export var character_collision_enabled: bool = true
## Character collision radius
@export var character_collision_radius: float = 0.3
## Collision mask for walls
@export_flags_3d_physics var character_collision_mask: int = 1

@export_group("Camera Rig")
## The camera rig for multi-camera control
@export var camera_rig: CinematicCameraRig
## Auto-create camera rig if not assigned
@export var auto_create_camera_rig: bool = true

## Reference to spawned character
var _character: CinematicCharacter

## Packed scene for CinematicCharacter
var _character_scene: PackedScene

## Click indicator node
var _click_indicator: Node3D

## Study spots in the scene
var _study_spots: Array[Dictionary] = []

## Currently targeted study spot (if walking to one)
var _target_study_spot: Dictionary = {}

## Keyboard movement state
var _keyboard_moving: bool = false

## Current seated spot node (kept alive during session)
var _current_spot_node: Node3D = null

## Is player currently seated (blocks navigation)
var _is_player_seated: bool = false

## Track spawned NPC characters
var _npc_characters: Array[CinematicCharacter] = []

## Pre-fetched unique NPC skins for current spawn batch
var _npc_skins_batch: Array[Dictionary] = []
var _npc_skin_index: int = 0

## Entrance cinematic state
var _entrance_cinematic_playing: bool = false
var _original_move_speed: float = 0.0
var _entrance_camera: Camera3D = null


func _ready() -> void:
	_character_scene = preload("res://scenes/characters/cinematic_character.tscn")
	
	if auto_start:
		if play_entrance_cinematic:
			# Spawn at entrance for cinematic
			spawn_character(character_preset_name, entrance_position, entrance_rotation)
		else:
			spawn_character()
	
	# Spawn additional NPC characters
	if spawn_npcs:
		_spawn_npc_characters()
	
	# Setup study spots
	if study_spots_enabled:
		_setup_study_spots()
	
	# Setup camera rig
	_setup_camera_rig()
	
	# Auto-detect camera for raycasting if not set
	if not raycast_camera:
		raycast_camera = get_viewport().get_camera_3d()
	
	# Create click indicator
	if show_click_indicator:
		_create_click_indicator()
	
	# Connect to character arrival signal
	if _character:
		_character.arrived_at_destination.connect(_on_character_arrived)
	
	# Connect to focus session events to control player animation
	FocusSessionManager.session_started.connect(_on_focus_session_started)
	FocusSessionManager.session_ended.connect(_on_focus_session_ended)
	
	# Start entrance cinematic if enabled (deferred to allow scene to fully load)
	if play_entrance_cinematic and _character:
		call_deferred("_start_entrance_cinematic")


func _process(delta: float) -> void:
	if keyboard_movement_enabled and _character:
		_handle_keyboard_movement(delta)


func _handle_keyboard_movement(delta: float) -> void:
	## Handle WASD/Arrow key movement
	## Blocked when player is seated or during entrance cinematic
	if _is_player_seated or _entrance_cinematic_playing:
		return
	
	var input_dir := Vector2.ZERO
	
	# Get input direction
	if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
		input_dir.y -= 1
	if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
		input_dir.y += 1
	if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
		input_dir.x -= 1
	if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
		input_dir.x += 1
	
	if input_dir == Vector2.ZERO:
		# No input - stop and return to idle
		if _keyboard_moving:
			_keyboard_moving = false
			_character.transition_to_animation(idle_animation)
		return
	
	# Cancel any click-to-move in progress
	if _character.is_moving():
		_character.stop_movement()
	
	input_dir = input_dir.normalized()
	
	# Get camera-relative movement direction
	var move_dir := _get_camera_relative_direction(input_dir)
	
	# Calculate desired position
	var velocity := move_dir * keyboard_move_speed
	var desired_position := _character.global_position + velocity * delta
	
	# Check for wall collision
	if character_collision_enabled:
		desired_position = _check_character_collision(_character.global_position, desired_position)
	
	# Move character
	_character.global_position = desired_position
	
	# Rotate character to face movement direction
	if move_dir.length() > 0.1:
		var target_rotation := atan2(move_dir.x, move_dir.z)
		_character.rotation.y = lerp_angle(_character.rotation.y, target_rotation, 10.0 * delta)
	
	# Play walk animation if not already
	if not _keyboard_moving:
		_keyboard_moving = true
		_character.transition_to_animation(_character.walk_animation, true)


func _check_character_collision(from: Vector3, to: Vector3) -> Vector3:
	## Check if character can move to desired position, slide along walls if blocked
	var space_state := get_world_3d().direct_space_state
	if not space_state:
		return to
	
	# Cast from chest height
	var height_offset := Vector3.UP * 0.5
	var from_pos := from + height_offset
	var to_pos := to + height_offset
	
	var query := PhysicsRayQueryParameters3D.create(from_pos, to_pos)
	query.collision_mask = character_collision_mask
	query.collide_with_bodies = true
	query.collide_with_areas = false
	
	var result := space_state.intersect_ray(query)
	
	if result.is_empty():
		return to  # No collision
	
	# Hit a wall - try to slide along it
	var hit_normal: Vector3 = result.normal
	var move_vector := to - from
	
	# Project movement onto wall plane (slide)
	var slide_vector := move_vector - hit_normal * move_vector.dot(hit_normal)
	var slide_position := from + slide_vector
	
	# Check if slide position is valid
	var slide_query := PhysicsRayQueryParameters3D.create(from_pos, slide_position + height_offset)
	slide_query.collision_mask = character_collision_mask
	slide_query.collide_with_bodies = true
	slide_query.collide_with_areas = false
	
	var slide_result := space_state.intersect_ray(slide_query)
	
	if slide_result.is_empty():
		return slide_position  # Slide is clear
	
	# Can't move at all
	return from


func _get_camera_relative_direction(input: Vector2) -> Vector3:
	## Convert 2D input to 3D direction relative to camera
	var active_camera := camera_rig.get_active_camera() if camera_rig else raycast_camera
	if not active_camera:
		return Vector3(input.x, 0, input.y)
	
	# Get camera forward and right vectors (flattened to XZ plane)
	var cam_transform := active_camera.global_transform
	var cam_forward := -cam_transform.basis.z
	var cam_right := cam_transform.basis.x
	
	# Flatten to horizontal plane
	cam_forward.y = 0
	cam_forward = cam_forward.normalized()
	cam_right.y = 0
	cam_right = cam_right.normalized()
	
	# Combine input with camera directions
	return (cam_right * input.x + cam_forward * -input.y).normalized()


func _spawn_npc_characters() -> void:
	## Spawn NPC characters from config or use defaults
	var configs := npc_configs
	
	# Use default NPCs if no config provided
	if configs.is_empty():
		configs = _get_default_npc_configs()
	
	# Pre-fetch unique random NPC skins for the batch (no duplicates)
	_npc_skins_batch = NPCSkins.get_unique_random_skins(configs.size())
	_npc_skin_index = 0
	
	for config in configs:
		_spawn_single_npc(config)


func _get_default_npc_configs() -> Array[Dictionary]:
	## Default NPC configurations - NPCs sitting at study spots
	## Using actual chair positions from the library grid
	## Columns: [1.59, 0.82, -0.76, -1.54], Rows: [1.73, 3.25, 5.49, 7.02, 9.27, 10.79]
	## Even rows face 0°, odd rows face 180°
	## Note: preset_name is left empty to use random NPCSkins
	var configs: Array[Dictionary] = []
	
	# NPC sitting at front-left chair (row 0, col 3)
	configs.append({
		"position": Vector3(-1.54, 0, 1.73),
		"rotation": 0.0,  # Even row faces forward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC sitting at middle-right chair (row 2, col 0)
	configs.append({
		"position": Vector3(1.59, 0, 5.49),
		"rotation": 0.0,  # Even row faces forward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	# NPC standing near the reading nook
	configs.append({
		"position": Vector3(1.5, 0, 1.0),
		"rotation": 45.0,
		"animation": "BoredIdle_02"
	})
	
	# NPC sitting at middle chair (row 3, col 1)
	configs.append({
		"position": Vector3(0.82, 0, 7.02),
		"rotation": 180.0,  # Odd row faces backward
		"animation": "SITTING_USING_LAPTOP_02"
	})
	
	return configs


# =============================================================================
# Camera Rig
# =============================================================================

func _setup_camera_rig() -> void:
	## Setup the multi-camera rig
	if not camera_rig and auto_create_camera_rig:
		camera_rig = CinematicCameraRig.new()
		camera_rig.name = "CameraRig"
		camera_rig.overview_camera = raycast_camera if raycast_camera else get_viewport().get_camera_3d()
		add_child(camera_rig)
	
	if camera_rig and _character:
		camera_rig.set_target(_character)
		
		# Connect to camera change signals
		camera_rig.camera_changed.connect(_on_camera_changed)
	
	print("[LibraryCinematic] Camera rig initialized")


func _on_camera_changed(camera_name: String) -> void:
	print("[LibraryCinematic] Camera changed to: %s" % camera_name)
	
	# Update raycast camera to the active one
	if camera_rig:
		raycast_camera = camera_rig.get_active_camera()


# =============================================================================
# Entrance Cinematic
# =============================================================================

func _start_entrance_cinematic():
	## Begin the entrance cinematic sequence
	## Fixed camera on left watches player walk in, plays idle animation, then goes to overview
	if _entrance_cinematic_playing:
		return
	
	_entrance_cinematic_playing = true
	entrance_cinematic_started.emit()
	print("[LibraryCinematic] Starting entrance cinematic")
	
	# Store and set cinematic walk speed
	_original_move_speed = _character.move_speed
	_character.move_speed = entrance_walk_speed
	
	# Create fixed entrance camera on the left side
	_entrance_camera = Camera3D.new()
	_entrance_camera.name = "EntranceCamera"
	_entrance_camera.fov = 50.0
	add_child(_entrance_camera)
	
	# Position camera and look at the destination point (where player will walk to)
	_entrance_camera.global_position = entrance_camera_position
	_entrance_camera.look_at(entrance_destination + Vector3.UP * 1.0)  # Look at chest height
	_entrance_camera.current = true
	
	# Small delay to let everything settle
	await get_tree().create_timer(entrance_start_delay).timeout
	
	# Start walking to destination
	_character.move_to(entrance_destination)
	
	# Wait for character to arrive
	await _character.arrived_at_destination
	
	# Play arrival animation (e.g., BoredIdle_01)
	if not entrance_arrival_animation.is_empty():
		_character.transition_to_animation(entrance_arrival_animation)
		print("[LibraryCinematic] Playing arrival animation: %s" % entrance_arrival_animation)
		await get_tree().create_timer(entrance_animation_duration).timeout
	
	# Small pause before overview
	await get_tree().create_timer(entrance_end_delay).timeout
	
	# Clean up entrance camera
	if _entrance_camera:
		_entrance_camera.queue_free()
		_entrance_camera = null
	
	# Switch to overview camera
	if camera_rig:
		camera_rig.switch_to_overview(true)  # instant switch since we're coming from a custom camera
	
	# Return to idle animation
	_character.transition_to_animation(idle_animation)
	
	# Restore original move speed
	_character.move_speed = _original_move_speed
	
	_entrance_cinematic_playing = false
	entrance_cinematic_finished.emit()
	
	# Notify React Native
	if RNBridge:
		RNBridge.on_entrance_cinematic_finished()
	
	print("[LibraryCinematic] Entrance cinematic complete")


## Trigger entrance cinematic manually (can be called from RN or code)
func trigger_entrance_cinematic() -> void:
	if not _character:
		push_warning("[LibraryCinematic] Cannot play entrance cinematic - no character")
		return
	
	# Reset character position to entrance
	_character.position = entrance_position
	_character.rotation_degrees.y = entrance_rotation
	
	_start_entrance_cinematic()


## Check if entrance cinematic is currently playing
func is_entrance_cinematic_playing() -> bool:
	return _entrance_cinematic_playing


## Set visibility of all NPC study bubbles with animation
func _set_study_bubbles_visible(is_visible: bool) -> void:
	for npc in _npc_characters:
		var bubble := npc.get_node_or_null("StudyBubble") as NPCStudyBubble
		if bubble:
			if is_visible:
				bubble.animate_show()
			else:
				bubble.animate_hide()


## Check if currently in first person view
func is_first_person() -> bool:
	if camera_rig:
		return camera_rig.get_current_mode() == CinematicCameraRig.CameraMode.FIRST_PERSON
	return false


## Check if currently in seated (focus session) view
func is_seated() -> bool:
	if camera_rig:
		return camera_rig.get_current_mode() == CinematicCameraRig.CameraMode.SEATED
	return false


## Switch to overview camera
func switch_to_overview() -> void:
	if camera_rig:
		camera_rig.switch_to_overview()


## Switch to third person camera
func switch_to_third_person() -> void:
	if camera_rig:
		camera_rig.switch_to_third_person()


## Switch to first person camera
func switch_to_first_person() -> void:
	if camera_rig:
		camera_rig.switch_to_first_person()


## Switch to setup camera (front-facing for session setup)
func switch_to_setup() -> void:
	if camera_rig:
		camera_rig.switch_to_setup()


## Switch to seated camera (called when focus session actually starts)
func switch_to_seated() -> void:
	if camera_rig:
		camera_rig.switch_to_seated()


## Cycle through camera modes
func cycle_camera() -> void:
	if camera_rig:
		camera_rig.cycle_camera()


# =============================================================================
# Study Spots / Focus Session
# =============================================================================

func _setup_study_spots() -> void:
	## Setup study spots (chairs) where player can sit and start a focus session
	_study_spots = _get_default_study_spots()
	
	# Create visual indicators for study spots (optional debug)
	for spot in _study_spots:
		_create_study_spot_area(spot)
	
	print("[LibraryCinematic] Setup %d study spots" % _study_spots.size())


func _get_default_study_spots() -> Array[Dictionary]:
	## Define study spot positions in the library (based on Chair_2 children in Library.gltf)
	## 24 chairs arranged in a 4x6 grid
	## Right side chairs (X > 0) face left (-90°), Left side (X < 0) face right (90°)
	var spots: Array[Dictionary] = []
	
	# 4 columns (X positions)
	var columns := [1.59, 0.82, -0.76, -1.54]
	# 6 rows (Z positions)
	var rows := [1.73, 3.25, 5.49, 7.02, 9.27, 10.79]
	
	var chair_num := 1
	for row_idx in range(rows.size()):
		for col_idx in range(columns.size()):
			var x: float = columns[col_idx]
			var z: float = rows[row_idx]
			# Chairs face each other across tables (alternating by row)
			# Even rows (0, 2, 4) face forward, odd rows (1, 3, 5) face backward
			var rotation: float = 0.0 if row_idx % 2 == 0 else 180.0
			
			spots.append({
				"name": "Chair_%02d" % chair_num,
				"position": Vector3(x, 0, z),
				"rotation": rotation,
				"building_id": "library",
				"building_name": "Library"
			})
			chair_num += 1
	
	return spots


func _create_study_spot_area(spot: Dictionary) -> void:
	## Create an Area3D for the study spot to detect clicks
	var area := Area3D.new()
	area.name = spot.get("name", "StudySpot")
	area.position = spot.get("position", Vector3.ZERO)
	area.collision_layer = 2  # Layer 2 for interactables
	area.input_ray_pickable = true
	area.monitoring = false
	area.monitorable = false
	
	# Add collision shape
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(0.8, 1.0, 0.8)  # Chair-sized hitbox
	collision.shape = shape
	collision.position.y = 0.5
	area.add_child(collision)
	
	# Store spot data in metadata
	area.set_meta("study_spot_data", spot)
	
	# Connect input event
	area.input_event.connect(_on_study_spot_input.bind(area, spot))
	
	add_child(area)


func _on_study_spot_input(_camera: Camera3D, event: InputEvent, _position: Vector3, _normal: Vector3, _shape_idx: int, _area: Area3D, spot: Dictionary) -> void:
	## Handle tap/click on a study spot
	## Blocked when player is seated
	if _is_player_seated:
		return
	
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			_on_study_spot_tapped(spot)
	elif event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		if touch_event.pressed:
			_on_study_spot_tapped(spot)


func _on_study_spot_tapped(spot: Dictionary) -> void:
	## Player tapped on a study spot - walk to it
	if _is_player_seated:
		return
	
	if not _character:
		return
	
	print("[LibraryCinematic] Walking to study spot: %s" % spot.get("name", "Unknown"))
	
	# Store target spot so we know where we're going
	_target_study_spot = spot
	
	# Move character to the spot
	var target_pos: Vector3 = spot.get("position", Vector3.ZERO)
	_character.move_to(target_pos)
	
	# Show click indicator at the spot
	if _click_indicator:
		_show_click_indicator(target_pos)


func _on_character_arrived() -> void:
	## Called when character finishes walking
	if _target_study_spot.is_empty():
		return
	
	# Check if we arrived at a study spot
	var spot_pos: Vector3 = _target_study_spot.get("position", Vector3.ZERO)
	var distance := _character.position.distance_to(spot_pos)
	
	if distance <= study_spot_arrival_distance:
		_trigger_session_at_spot(_target_study_spot)
	
	_target_study_spot = {}


func _trigger_session_at_spot(spot: Dictionary) -> void:
	## Player arrived at study spot - trigger focus session setup
	print("[LibraryCinematic] Arrived at study spot: %s" % spot.get("name", "Unknown"))
	
	# Player is now seated - disable navigation
	_is_player_seated = true
	
	# Face the correct direction
	var spot_rotation: float = spot.get("rotation", 0.0)
	_character.rotation_degrees.y = spot_rotation
	
	# Play sit-down transition animation, then loop sitting idle
	_character.play_animation_once(sit_down_animation, sitting_animation)
	
	# Switch camera to setup view (front-facing, shows player's face for setup modal)
	if camera_rig:
		camera_rig.switch_to_setup()
	
	# Emit signal
	session_triggered.emit(spot.get("position", Vector3.ZERO))
	
	# Notify RNBridge (this will show the session modal in React Native)
	_notify_rn_player_seated(spot)


func _notify_rn_player_seated(spot: Dictionary) -> void:
	## Notify React Native that player is seated at a study spot
	var building_id: String = spot.get("building_id", "library")
	var building_name: String = spot.get("building_name", "Library")
	var spot_id: String = spot.get("name", "StudySpot")
	
	# Clean up previous spot node if any
	if _current_spot_node:
		_current_spot_node.queue_free()
		_current_spot_node = null
	
	# Call RNBridge if available
	if RNBridge:
		# Create a spot node for RNBridge - kept alive until session ends
		_current_spot_node = Node3D.new()
		_current_spot_node.name = spot_id
		_current_spot_node.set_meta("building_id", building_id)
		_current_spot_node.set_meta("building_name", building_name)
		_current_spot_node.position = spot.get("position", Vector3.ZERO)
		
		add_child(_current_spot_node)
		RNBridge.on_player_seated_at_spot(_current_spot_node)
	
	print("[LibraryCinematic] Notified RN: seated at %s in %s" % [spot_id, building_name])


## Start focus session (can be called from RN or directly)
func start_focus_session() -> void:
	if not _target_study_spot.is_empty() or FocusSessionManager.is_focusing():
		return
	
	# Find nearest study spot if not at one
	# For now, just start the session
	FocusSessionManager.start_session(self)
	print("[LibraryCinematic] Focus session started")


## End focus session and return to idle
func end_focus_session() -> void:
	print("[LibraryCinematic] Ending focus session")
	
	# Player is no longer seated - enable navigation
	_is_player_seated = false
	
	if FocusSessionManager.is_focusing():
		var coins := FocusSessionManager.end_session()
		print("[LibraryCinematic] Focus session ended, earned %d coins" % coins)
	
	# Clean up spot node
	if _current_spot_node:
		_current_spot_node.queue_free()
		_current_spot_node = null
	
	# Switch camera back to overview
	if camera_rig:
		camera_rig.switch_to_overview()
	
	# Return to idle animation
	if _character:
		_character.transition_to_animation(idle_animation)


## Called when focus session actually starts (timer begins)
func _on_focus_session_started(_spot: Node3D) -> void:
	print("[LibraryCinematic] Focus session started - playing studying animation")
	if _character and _is_player_seated:
		# Use the laptoplink model for the focus session laptop
		_character.laptop_model_path = "res://assets/environments/objects/laptoplink/laptoplink.glb"
		_character.transition_to_animation(studying_animation)
	
	# Show NPC study bubbles after camera transition completes
	_show_study_bubbles_delayed()


func _show_study_bubbles_delayed() -> void:
	# Wait for camera to switch to 3rd person view
	await get_tree().create_timer(1.2).timeout
	
	# Only show if still in a focus session
	if FocusSessionManager.is_focusing():
		_set_study_bubbles_visible(true)


## Called when focus session ends (timer stops)
func _on_focus_session_ended(_duration: int, _coins: int) -> void:
	print("[LibraryCinematic] Focus session ended - returning to sitting idle")
	if _character and _is_player_seated:
		_character.transition_to_animation(sitting_animation)
	
	# Hide NPC study bubbles when session ends
	_set_study_bubbles_visible(false)


func _spawn_single_npc(config: Dictionary) -> CinematicCharacter:
	var preset_name: String = config.get("preset_name", "")  # Empty = use NPCSkins
	var pos: Vector3 = config.get("position", Vector3.ZERO)
	var rot: float = config.get("rotation", 0.0)
	var anim: String = config.get("animation", idle_animation)
	var is_seated: bool = anim.to_lower().contains("sitting")
	
	var npc := _character_scene.instantiate() as CinematicCharacter
	var npc_index := _npc_characters.size() + 1
	npc.name = "NPC_%d" % npc_index if preset_name.is_empty() else "NPC_" + preset_name.capitalize()
	npc.default_animation = anim
	npc.auto_play = true
	npc.position = pos
	npc.rotation_degrees.y = rot
	
	add_child(npc)
	
	# Track NPC
	_npc_characters.append(npc)
	
	# Apply preset after character is fully initialized (need to wait for ModularCharacter)
	_apply_npc_preset_deferred(npc, preset_name)
	
	# Add study bubble for seated NPCs
	if is_seated:
		_add_study_bubble_deferred(npc)
	
	return npc


func _add_study_bubble_deferred(npc: CinematicCharacter) -> void:
	## Add a study timer bubble above the NPC after a short delay
	# Wait for character to be positioned
	await get_tree().create_timer(0.5).timeout
	
	var bubble := NPCStudyBubble.new()
	bubble.name = "StudyBubble"
	# Start hidden - only show during active focus session
	bubble.visible = FocusSessionManager.is_focusing()
	npc.add_child(bubble)
	print("[LibraryCinematic] Added study bubble to: %s" % npc.name)


func _apply_npc_preset_deferred(npc: CinematicCharacter, preset_name: String) -> void:
	# Wait for the character to be fully initialized
	# ModularCharacter needs time to load base model and setup
	for i in range(5):
		await get_tree().process_frame
	
	# Verify character is ready
	var modular := npc.get_modular_character()
	if not modular:
		push_warning("[LibraryCinematic] ModularCharacter not ready for: %s" % preset_name)
		return
	
	# If no preset name provided, use curated NPC skins (unique per batch)
	if preset_name.is_empty():
		var skin_data: Dictionary
		if _npc_skin_index < _npc_skins_batch.size():
			skin_data = _npc_skins_batch[_npc_skin_index]
			_npc_skin_index += 1
		else:
			# Fallback to random if batch exhausted
			skin_data = NPCSkins.get_random_skin()
		
		var skin_name: String = skin_data.get("name", "npc")
		npc.apply_preset_dict(skin_data, skin_name.capitalize().replace("_", " "))
		print("[LibraryCinematic] Applied NPC skin: %s" % skin_name)
	else:
		# apply_preset_dict/randomize_appearance auto-shows the character
		var data := CharacterPresets.get_preset(preset_name)
		if not data.is_empty():
			npc.apply_preset_dict(data, preset_name.capitalize())
			print("[LibraryCinematic] Applied NPC preset: %s" % preset_name)
		else:
			npc.randomize_appearance()
			print("[LibraryCinematic] Randomized NPC (preset not found): %s" % preset_name)
	
	# Wait a bit more for animation to start, then randomize offset so NPCs aren't in sync
	await get_tree().create_timer(0.2).timeout
	npc.randomize_animation_offset()


func _input(event: InputEvent) -> void:
	# Block all navigation during entrance cinematic
	if _entrance_cinematic_playing:
		return
	
	# Block all navigation when player is seated
	if _is_player_seated:
		# Any tap/click triggers confirm end popup
		if event is InputEventMouseButton:
			var mouse_event := event as InputEventMouseButton
			if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
				print("[LibraryCinematic] Tap while seated - showing confirm popup")
				RNBridge.on_session_tap_outside()
				get_viewport().set_input_as_handled()
		elif event is InputEventScreenTouch:
			var touch_event := event as InputEventScreenTouch
			if touch_event.pressed:
				print("[LibraryCinematic] Touch while seated - showing confirm popup")
				RNBridge.on_session_tap_outside()
				get_viewport().set_input_as_handled()
		return
	
	# Handle keyboard shortcuts
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo:
			match key_event.keycode:
				KEY_C:
					# Toggle camera mode
					if camera_toggle_enabled:
						cycle_camera()
					return
				KEY_G:
					# Replay entrance cinematic (for testing)
					if not _entrance_cinematic_playing:
						trigger_entrance_cinematic()
					return
	
	# Handle click to move
	if not click_to_move_enabled:
		return
	
	# Handle mouse click or touch
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			_handle_click(mouse_event.position)
	
	elif event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		if touch_event.pressed:
			_handle_click(touch_event.position)


func _handle_click(screen_position: Vector2) -> void:
	## Handle click to move - only called when NOT in a focus session
	if not _character:
		return
	
	# If in first person mode, clicking anywhere exits to third person
	if is_first_person():
		_exit_first_person()
		return
	
	# Get active camera for raycasting
	var active_camera := camera_rig.get_active_camera() if camera_rig else raycast_camera
	if not active_camera:
		return
	
	var world_position := _raycast_to_ground(screen_position)
	if world_position != Vector3.INF:
		# Move character to clicked position
		_character.move_to(world_position)
		tap_detected.emit(world_position)
		
		# Show click indicator
		if _click_indicator:
			_show_click_indicator(world_position)


func _exit_first_person() -> void:
	## Exit first person mode - switch to third person and stand up
	print("[LibraryCinematic] Exiting first person mode")
	
	# Switch camera to third person
	if camera_rig:
		camera_rig.switch_to_third_person()
	
	# Return to idle animation (stand up)
	if _character:
		_character.transition_to_animation(idle_animation)


func _raycast_to_ground(screen_position: Vector2) -> Vector3:
	## Cast a ray from camera through screen position to find ground
	var active_camera := camera_rig.get_active_camera() if camera_rig else raycast_camera
	if not active_camera:
		return Vector3.INF
	
	var from := active_camera.project_ray_origin(screen_position)
	var direction := active_camera.project_ray_normal(screen_position)
	var to := from + direction * raycast_distance
	
	# Perform raycast
	var space_state := get_world_3d().direct_space_state
	var query := PhysicsRayQueryParameters3D.create(from, to, ground_layer)
	var result := space_state.intersect_ray(query)
	
	if result:
		return result.position
	
	# Fallback: intersect with Y=0 plane if no collision
	if direction.y != 0:
		var t := -from.y / direction.y
		if t > 0:
			return from + direction * t
	
	return Vector3.INF


func _create_click_indicator() -> void:
	## Create a simple visual indicator for click position
	_click_indicator = Node3D.new()
	_click_indicator.name = "ClickIndicator"
	
	# Create a small cylinder as indicator
	var mesh_instance := MeshInstance3D.new()
	mesh_instance.name = "Mesh"
	var cylinder := CylinderMesh.new()
	cylinder.top_radius = 0.15
	cylinder.bottom_radius = 0.15
	cylinder.height = 0.05
	mesh_instance.mesh = cylinder
	
	# Create glowing material
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.2, 0.8, 1.0, 0.8)
	material.emission_enabled = true
	material.emission = Color(0.2, 0.8, 1.0)
	material.emission_energy_multiplier = 2.0
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh_instance.material_override = material
	
	_click_indicator.add_child(mesh_instance)
	_click_indicator.visible = false
	add_child(_click_indicator)


func _show_click_indicator(pos: Vector3) -> void:
	if not _click_indicator:
		return
	
	_click_indicator.position = pos + Vector3(0, 0.03, 0)  # Slightly above ground
	_click_indicator.scale = Vector3.ONE
	_click_indicator.visible = true
	
	# Get the mesh and material for alpha animation
	var mesh := _click_indicator.get_node("Mesh") as MeshInstance3D
	var material := mesh.material_override as StandardMaterial3D
	if material:
		material.albedo_color.a = 0.8
	
	# Animate scale and fade out
	var tween := create_tween()
	tween.tween_property(_click_indicator, "scale", Vector3(1.5, 1, 1.5), 0.3)
	tween.tween_interval(0.2)
	tween.tween_method(func(alpha: float):
		if material:
			material.albedo_color.a = alpha
	, 0.8, 0.0, 0.3)
	tween.tween_callback(func():
		_click_indicator.visible = false
		_click_indicator.scale = Vector3.ONE
	)


## Spawn a character with the configured preset
func spawn_character(preset_name: String = "", position: Vector3 = Vector3.INF, rotation_deg: float = INF) -> CinematicCharacter:
	# Use configured values if not overridden
	if preset_name.is_empty():
		preset_name = character_preset_name
	if position == Vector3.INF:
		position = character_spawn_position
	if rotation_deg == INF:
		rotation_deg = character_spawn_rotation
	
	# Remove existing character if any
	if _character:
		_character.queue_free()
		_character = null
	
	# Create new character
	_character = _character_scene.instantiate() as CinematicCharacter
	_character.name = "Character_" + preset_name.capitalize()
	_character.default_animation = idle_animation
	_character.auto_play = true
	
	# Position character
	_character.position = position
	_character.rotation_degrees.y = rotation_deg
	
	add_child(_character)
	
	# Connect to arrival signal for study spot detection
	_character.arrived_at_destination.connect(_on_character_arrived)
	
	# Apply preset after adding to tree (character needs to be ready)
	_apply_character_preset(preset_name)
	
	character_spawned.emit(_character)
	return _character


## Apply a preset to the current character
func _apply_character_preset(preset_name: String) -> void:
	if not _character:
		return
	
	# Wait for ModularCharacter to fully initialize
	for i in range(5):
		await get_tree().process_frame
	
	# apply_preset_dict/randomize_appearance auto-shows the character
	var preset_data := CharacterPresets.get_preset(preset_name)
	if not preset_data.is_empty():
		_character.apply_preset_dict(preset_data, preset_name.capitalize())
		print("[LibraryCinematic] Applied preset: %s" % preset_name)
	else:
		# Create random if preset not found
		push_warning("[LibraryCinematic] Preset '%s' not found, using random" % preset_name)
		_character.randomize_appearance()


## Spawn multiple characters at different positions
func spawn_characters(configs: Array[Dictionary]) -> Array[CinematicCharacter]:
	## Each config should have: preset_name, position, rotation (optional)
	var characters: Array[CinematicCharacter] = []
	
	for config in configs:
		var preset: String = config.get("preset_name", "student")
		var pos: Vector3 = config.get("position", Vector3.ZERO)
		var rot: float = config.get("rotation", 0.0)
		
		var char_instance := _character_scene.instantiate() as CinematicCharacter
		char_instance.name = "Character_" + preset.capitalize()
		char_instance.default_animation = idle_animation
		char_instance.auto_play = true
		char_instance.position = pos
		char_instance.rotation_degrees.y = rot
		
		add_child(char_instance)
		
		# Apply preset deferred and show after
		_apply_spawned_character_preset(char_instance, preset)
		
		characters.append(char_instance)
	
	return characters


func _apply_spawned_character_preset(char_instance: CinematicCharacter, preset_name: String) -> void:
	## Apply preset to a spawned character (auto-shows after)
	for i in range(5):
		await get_tree().process_frame
	
	# apply_preset_dict/randomize_appearance auto-shows the character
	var data := CharacterPresets.get_preset(preset_name)
	if not data.is_empty():
		char_instance.apply_preset_dict(data, preset_name.capitalize())
	else:
		char_instance.randomize_appearance()


## Get the main character
func get_character() -> CinematicCharacter:
	return _character


## Change character's animation
func play_animation(anim_name: String) -> void:
	if _character:
		_character.transition_to_animation(anim_name)


## Play celebration animation (fist pump) and return to reading
## Called when a focus session completes successfully
func play_celebration_animation() -> void:
	if _character and _is_player_seated:
		print("[LibraryCinematic] Playing celebration animation")
		_character.play_animation_once(celebration_animation, sitting_animation)


## Move character to position
func move_character_to(target: Vector3) -> void:
	if _character:
		_character.move_to(target)


## Stop character movement
func stop_character() -> void:
	if _character:
		_character.stop_movement()


## Play animation sequence on character
func play_animation_sequence(animations: Array[String], loop_last: bool = true) -> void:
	if _character:
		await _character.play_animation_sequence(animations, loop_last)


## Switch character preset at runtime
func switch_preset(preset_name: String) -> void:
	if _character:
		var preset_data := CharacterPresets.get_preset(preset_name)
		if not preset_data.is_empty():
			_character.apply_preset_dict(preset_data, preset_name.capitalize())


## Randomize character appearance
func randomize_character() -> void:
	if _character:
		_character.randomize_appearance()


## Get all characters in scene
func get_all_characters() -> Array[CinematicCharacter]:
	var characters: Array[CinematicCharacter] = []
	for child in get_children():
		if child is CinematicCharacter:
			characters.append(child)
	return characters
