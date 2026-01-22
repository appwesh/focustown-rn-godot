extends Node
## Bridge between React Native and Godot
## Handles communication for the focus timer app

signal interact_triggered

## Version string - update this when making changes to verify PCK is updated
const VERSION: String = "v2.0.3-spotid"

var _is_embedded: bool = false
var _version_label: Label = null

## Joystick input from React Native (normalized -1 to 1)
var joystick_input: Vector2 = Vector2.ZERO

## Callback from React Native for session completion
var _session_complete_callback: Callable

## Callback from React Native when player sits at a study spot
var _player_seated_callback: Callable

## Callback for position sync
var _player_position_callback: Callable

## Callback when user taps outside during a focus session (to show confirm end popup)
var _session_tap_outside_callback: Callable

## Callback for break events (tick, ended)
var _break_tick_callback: Callable
var _break_ended_callback: Callable

## Reference to the camera rig for camera control
var _camera_rig: CinematicCameraRig = null

## Position sync timer
var _position_sync_timer: Timer = null
var _position_sync_enabled: bool = false
var _last_sent_position: Vector3 = Vector3.ZERO
const POSITION_THRESHOLD: float = 0.1  # Only send if moved more than this

## Current study spot the player is seated at
var _current_seated_spot: Node3D = null


func _ready() -> void:
	# Check if we're running embedded in React Native
	var args := OS.get_cmdline_args()
	var display_driver_idx := args.find("--display-driver")
	var has_embedded_driver := display_driver_idx >= 0 and display_driver_idx + 1 < args.size() and args[display_driver_idx + 1] == "embedded"
	
	_is_embedded = OS.has_feature("embedded") or has_embedded_driver
	
	if _is_embedded:
		print("[RNBridge] Running in embedded mode (React Native)")
	else:
		print("[RNBridge] Running standalone (Godot Editor/Export)")
	
	print("[RNBridge] Version: ", VERSION)
	
	# Create version label UI
	_create_version_label()
	
	# Connect to session events
	FocusSessionManager.session_ended.connect(_on_session_ended)
	
	# Connect to break events
	FocusSessionManager.break_tick.connect(_on_break_tick)
	FocusSessionManager.break_ended.connect(_on_break_ended)


## Create a version label in the corner of the screen
func _create_version_label() -> void:
	# Create CanvasLayer for UI
	var canvas := CanvasLayer.new()
	canvas.layer = 100  # On top of everything
	add_child(canvas)
	
	# Create label
	_version_label = Label.new()
	_version_label.text = VERSION
	_version_label.add_theme_font_size_override("font_size", 32)
	_version_label.add_theme_color_override("font_color", Color(1, 0, 0, 1))  # Bright red
	_version_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 1))
	_version_label.add_theme_constant_override("shadow_offset_x", 2)
	_version_label.add_theme_constant_override("shadow_offset_y", 2)
	
	# Position in top-left corner (below safe area)
	_version_label.position = Vector2(20, 150)
	
	canvas.add_child(_version_label)
	_version_label.visible = false  # Hidden by default


## Toggle version label visibility (for screenshots, recordings, etc.)
func set_version_label_visible(visible: bool) -> void:
	if _version_label:
		_version_label.visible = visible


## Register callback from RN for session completion (following born docs pattern)
func set_session_callback(callback: Callable) -> void:
	_session_complete_callback = callback
	print("[RNBridge] Session callback registered")


## Register callback from RN when player sits at a study spot
func set_player_seated_callback(callback: Callable) -> void:
	_player_seated_callback = callback
	print("[RNBridge] Player seated callback registered")


## Register callback from RN for position sync
func set_player_position_callback(callback: Callable) -> void:
	_player_position_callback = callback
	print("[RNBridge] Player position callback registered")


## Register callback from RN for when user taps outside during session
## RN should show confirm end session popup when this is called
func set_session_tap_outside_callback(callback: Callable) -> void:
	_session_tap_outside_callback = callback
	print("[RNBridge] Session tap outside callback registered")


## Register callback from RN for break time updates
func set_break_tick_callback(callback: Callable) -> void:
	_break_tick_callback = callback
	print("[RNBridge] Break tick callback registered")


## Register callback from RN for when break ends
func set_break_ended_callback(callback: Callable) -> void:
	_break_ended_callback = callback
	print("[RNBridge] Break ended callback registered")


## Start position sync (sends player position to RN periodically)
func start_position_sync() -> void:
	if _position_sync_enabled:
		return
	
	_position_sync_enabled = true
	
	# Create timer if needed
	if not _position_sync_timer:
		_position_sync_timer = Timer.new()
		_position_sync_timer.wait_time = 0.2  # 5 times per second
		_position_sync_timer.timeout.connect(_on_position_sync_tick)
		add_child(_position_sync_timer)
	
	_position_sync_timer.start()
	print("[RNBridge] Position sync started")


## Stop position sync
func stop_position_sync() -> void:
	_position_sync_enabled = false
	if _position_sync_timer:
		_position_sync_timer.stop()
	print("[RNBridge] Position sync stopped")


## Position sync tick - sends current player position to RN (only if changed)
func _on_position_sync_tick() -> void:
	if not _player_position_callback.is_valid():
		return
	
	# Find the player node
	var players := get_tree().get_nodes_in_group("player")
	if players.size() == 0:
		return
	
	var player: Node3D = players[0]
	var pos := player.global_position
	
	# Only send if position has changed significantly
	if pos.distance_to(_last_sent_position) < POSITION_THRESHOLD:
		return
	
	_last_sent_position = pos
	_player_position_callback.call(pos.x, pos.y, pos.z)


## Called internally when player sits at a study spot
## Notifies RN to show the session setup modal
## Passes location info: building_id, building_name, spot_id
func on_player_seated_at_spot(spot: Node3D) -> void:
	_current_seated_spot = spot
	print("[RNBridge] Player seated at spot: ", spot.name)
	
	# Extract location info from spot node
	# Expected spot metadata: building_id, building_name in spot's metadata or parent
	var building_id := _get_building_id(spot)
	var building_name := _get_building_name(spot)
	var spot_id := _get_unique_spot_id(spot)
	
	print("[RNBridge] Location: ", building_id, " / ", building_name, " / ", spot_id)
	
	if _player_seated_callback.is_valid():
		_player_seated_callback.call(building_id, building_name, spot_id)
		print("[RNBridge] Player seated callback invoked with location")
	else:
		print("[RNBridge] No player seated callback registered")


## Get building ID from spot node or its parents
func _get_building_id(spot: Node3D) -> String:
	# Try spot metadata first
	if spot.has_meta("building_id"):
		return spot.get_meta("building_id")
	
	# Walk up parent tree to find building node
	var parent := spot.get_parent()
	while parent:
		if parent.has_meta("building_id"):
			return parent.get_meta("building_id")
		# Check if parent is named like a building
		if parent.name.to_lower().contains("cafe") or parent.name.to_lower().contains("library") or parent.name.to_lower().contains("bakery"):
			return parent.name.to_snake_case()
		parent = parent.get_parent() if parent.get_parent() != get_tree().root else null
	
	# Default fallback
	return "cafe"


## Get building display name from spot node or its parents
func _get_building_name(spot: Node3D) -> String:
	# Try spot metadata first
	if spot.has_meta("building_name"):
		return spot.get_meta("building_name")
	
	# Walk up parent tree to find building node
	var parent := spot.get_parent()
	while parent:
		if parent.has_meta("building_name"):
			return parent.get_meta("building_name")
		# Check if parent is named like a building and use formatted name
		if parent.name.to_lower().contains("cafe"):
			return "Café"
		if parent.name.to_lower().contains("library"):
			return "Library"
		if parent.name.to_lower().contains("bakery"):
			return "Bakery"
		parent = parent.get_parent() if parent.get_parent() != get_tree().root else null
	
	# Default fallback
	return "Café"


## Get a unique spot ID that includes the parent (e.g., "Bench1_StudySpot")
## This ensures each spot has a unique ID even if all spots are named "StudySpot"
func _get_unique_spot_id(spot: Node3D) -> String:
	var parent := spot.get_parent()
	if parent and parent.name != "StudySpots" and parent.name != "root":
		# Include parent name for uniqueness (e.g., "Bench1_StudySpot")
		return parent.name + "_" + spot.name
	# Fallback to just the spot name
	return spot.name


## Called from RN when user confirms session setup and starts the session
## Duration is controlled by RN timer, Godot just tracks state
func start_session_from_rn() -> void:
	if _current_seated_spot:
		print("[RNBridge] Starting session from RN")
		FocusSessionManager.start_session(_current_seated_spot)
		
		# Switch to third person camera now that session is starting
		_ensure_camera_rig()
		if _camera_rig:
			_camera_rig.switch_to_third_person()
	else:
		print("[RNBridge] Cannot start session - no seated spot")


## Called from RN when user cancels the session setup modal
## Player stands up and returns to idle
func cancel_session_setup() -> void:
	print("[RNBridge] Session setup cancelled")
	_current_seated_spot = null
	
	# Make player stand up
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var player: Player = players[0]
		player.stand_up()


## Called when session ends - calls the RN callback
func _on_session_ended(duration_seconds: int, coins_earned: int) -> void:
	print("[RNBridge] Session ended: ", duration_seconds, "s, ", coins_earned, " coins")
	# Note: Don't clear _current_seated_spot here - user might start a break or another session
	if _session_complete_callback.is_valid():
		_session_complete_callback.call(duration_seconds, coins_earned)
		print("[RNBridge] Callback invoked")
	else:
		print("[RNBridge] No callback registered")


## Called on each break tick - notifies RN of elapsed break time
func _on_break_tick(elapsed_seconds: int) -> void:
	if _break_tick_callback.is_valid():
		_break_tick_callback.call(elapsed_seconds)


## Called when break ends - notifies RN
func _on_break_ended(duration_seconds: int) -> void:
	print("[RNBridge] Break ended: ", duration_seconds, "s")
	_current_seated_spot = null
	if _break_ended_callback.is_valid():
		_break_ended_callback.call(duration_seconds)
		print("[RNBridge] Break ended callback invoked")


func is_embedded() -> bool:
	return _is_embedded


## Set joystick input from React Native
func set_joystick_input(x: float, y: float) -> void:
	joystick_input = Vector2(x, y)


## Get current joystick input
func get_joystick_input() -> Vector2:
	return joystick_input


## Trigger interact action from React Native
func trigger_interact() -> void:
	interact_triggered.emit()


## Get current session state for RN
func get_session_state() -> Dictionary:
	return {
		"state": FocusSessionManager.get_state_name(),
		"is_focusing": FocusSessionManager.is_focusing(),
		"is_on_break": FocusSessionManager.is_on_break(),
		"elapsed_seconds": FocusSessionManager.get_elapsed_seconds(),
		"formatted_time": FocusSessionManager.get_formatted_time(),
		"break_elapsed_seconds": FocusSessionManager.get_break_elapsed_seconds(),
		"formatted_break_time": FocusSessionManager.get_formatted_break_time()
	}


## End current session from RN (e.g., timer complete or user stops early)
func end_session() -> Dictionary:
	if not FocusSessionManager.is_focusing():
		return {"success": false, "reason": "no_active_session"}
	
	var duration := FocusSessionManager.get_elapsed_seconds()
	var coins := FocusSessionManager.end_session()
	
	# Switch to setup camera (front-facing) for complete/abandoned modal
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_setup()
	
	return {
		"success": true,
		"duration": duration,
		"coins_earned": coins
	}


# =============================================================================
# Break Control (called from RN)
# =============================================================================

## Start a break after ending a focus session
## Camera automatically switches to overview mode
func start_break() -> Dictionary:
	if FocusSessionManager.is_focusing():
		return {"success": false, "reason": "session_still_active"}
	
	FocusSessionManager.start_break()
	
	# Switch camera to overview (zoomed out) for break
	switch_to_overview_camera()
	
	print("[RNBridge] Break started, camera switched to overview")
	return {"success": true}


## End the current break
func end_break() -> Dictionary:
	if not FocusSessionManager.is_on_break():
		return {"success": false, "reason": "not_on_break"}
	
	var duration := FocusSessionManager.end_break()
	
	# Switch to setup camera (front-facing) for next session setup
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_setup()
	
	print("[RNBridge] Break ended, duration: ", duration, "s")
	return {
		"success": true,
		"duration": duration
	}


## Get break state for RN
func get_break_state() -> Dictionary:
	return {
		"is_on_break": FocusSessionManager.is_on_break(),
		"elapsed_seconds": FocusSessionManager.get_break_elapsed_seconds(),
		"formatted_time": FocusSessionManager.get_formatted_break_time()
	}


# =============================================================================
# Camera Control (called from RN)
# =============================================================================

## Toggle camera between third person and overview during focus session
## Called from RN when user presses camera toggle button
func toggle_session_camera() -> void:
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.toggle_session_camera()
		print("[RNBridge] Camera toggled")


## Switch to zoomed seated view
func switch_to_seated_camera() -> void:
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_seated()
		print("[RNBridge] Switched to seated camera")


## Switch to overview camera
func switch_to_overview_camera() -> void:
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_overview()
		print("[RNBridge] Switched to overview camera")


## Switch to setup camera (front-facing for modals)
func switch_to_setup_camera() -> void:
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_setup()
		print("[RNBridge] Switched to setup camera")


## Switch to third person camera
func switch_to_third_person_camera() -> void:
	_ensure_camera_rig()
	if _camera_rig:
		_camera_rig.switch_to_third_person()
		print("[RNBridge] Switched to third person camera")


## Get current camera mode
func get_camera_mode() -> String:
	_ensure_camera_rig()
	if _camera_rig:
		return _camera_rig.get_current_mode_name()
	return "unknown"


func _ensure_camera_rig() -> void:
	## Find the camera rig if not cached
	if _camera_rig:
		return
	
	# Search scene tree for camera rig
	var root := get_tree().current_scene
	if root:
		_camera_rig = _find_camera_rig_recursive(root)


func _find_camera_rig_recursive(node: Node) -> CinematicCameraRig:
	if node is CinematicCameraRig:
		return node
	for child in node.get_children():
		var found := _find_camera_rig_recursive(child)
		if found:
			return found
	return null


## Called internally when user taps outside during a focus session
## Notifies RN to show confirm end session popup
func on_session_tap_outside() -> void:
	print("[RNBridge] User tapped outside during session")
	if _session_tap_outside_callback.is_valid():
		_session_tap_outside_callback.call()
		print("[RNBridge] Session tap outside callback invoked")
	else:
		print("[RNBridge] No tap outside callback registered")


# =============================================================================
# Multiplayer - Remote Players
# =============================================================================

## Spawn a remote player
func spawn_remote_player(od_id: String, display_name: String, state: String, spot_id: String) -> void:
	print("[RNBridge] spawn_remote_player: ", od_id, " ", display_name, " ", state)
	if MultiplayerManager:
		var actual_spot_id := "" if spot_id.is_empty() else spot_id
		MultiplayerManager.spawn_remote_player(od_id, display_name, state, actual_spot_id)
	else:
		push_warning("[RNBridge] MultiplayerManager not available")


## Update a remote player's state
func update_remote_player_state(od_id: String, state: String, spot_id: String) -> void:
	print("[RNBridge] update_remote_player_state: ", od_id, " ", state)
	if MultiplayerManager:
		var actual_spot_id := "" if spot_id.is_empty() else spot_id
		MultiplayerManager.update_remote_player_state(od_id, state, actual_spot_id)
	else:
		push_warning("[RNBridge] MultiplayerManager not available")


## Update a remote player's position directly
func update_remote_player_position(od_id: String, x: float, y: float, z: float) -> void:
	if MultiplayerManager:
		MultiplayerManager.update_remote_player_position(od_id, Vector3(x, y, z))
	else:
		push_warning("[RNBridge] MultiplayerManager not available")


## Remove a remote player
func remove_remote_player(od_id: String) -> void:
	print("[RNBridge] remove_remote_player: ", od_id)
	if MultiplayerManager:
		MultiplayerManager.remove_remote_player(od_id)
	else:
		push_warning("[RNBridge] MultiplayerManager not available")


# =============================================================================
# Homescreen Character Showcase
# =============================================================================

## Reference to the HomeCharacterShowcase scene (if active)
var _home_showcase: HomeCharacterShowcase = null

## Stored user character data (persisted until applied)
var _user_character_data: Dictionary = {}

## Scene paths for switching
const SCENE_PATHS := {
	"library": "res://scenes/main/library_cinematic_with_character.tscn",
	"home_showcase": "res://scenes/main/home_character_showcase.tscn",
}


## Change the current scene
## scene_name can be: "library", "home_showcase"
func change_scene(scene_name: String) -> void:
	var scene_path: String = SCENE_PATHS.get(scene_name, "")
	if scene_path.is_empty():
		push_error("[RNBridge] Unknown scene: %s" % scene_name)
		return
	
	print("[RNBridge] Changing scene to: %s" % scene_name)
	
	# Clear cached references
	_home_showcase = null
	_camera_rig = null
	
	# Defer scene change to next frame to avoid crashes
	call_deferred("_do_change_scene", scene_path)


func _do_change_scene(scene_path: String) -> void:
	## Actually perform the scene change (called deferred)
	var error := get_tree().change_scene_to_file(scene_path)
	if error != OK:
		push_error("[RNBridge] Failed to change scene: %s (error %d)" % [scene_path, error])


## Register the HomeCharacterShowcase scene with RNBridge
## Called automatically by HomeCharacterShowcase._ready()
func register_home_showcase(showcase: HomeCharacterShowcase) -> void:
	_home_showcase = showcase
	print("[RNBridge] HomeCharacterShowcase registered")
	
	# Apply any pending user character data
	if not _user_character_data.is_empty():
		_home_showcase.set_user_character(_user_character_data)


## Set the user's character appearance from React Native
## skin_data should be a Dictionary with keys like: SkinTone, Face, EyeColor, Hair, etc.
## See CharacterPresets for the expected format
func set_user_character(skin_data: Dictionary) -> void:
	_user_character_data = skin_data
	print("[RNBridge] User character data received: ", skin_data.keys())
	
	if _home_showcase:
		_home_showcase.set_user_character(skin_data)
	else:
		print("[RNBridge] HomeCharacterShowcase not active, data stored for later")


## Set user character from individual values (called from RN since Dictionary.create doesn't work)
## Values of -1 are ignored (not set)
func set_user_character_values(
	skin_tone: int, face: int, eye_color: int, hair: int, hair_color: int,
	top: int, bottom: int, shoes: int, hat: int, glasses: int
) -> void:
	var skin_data := {}
	if skin_tone >= 0: skin_data["SkinTone"] = skin_tone
	if face >= 0: skin_data["Face"] = face
	if eye_color >= 0: skin_data["EyeColor"] = eye_color
	if hair >= 0: skin_data["Hair"] = hair
	if hair_color >= 0: skin_data["HairColor"] = hair_color
	if top >= 0: skin_data["Top"] = top
	if bottom >= 0: skin_data["Bottom"] = bottom
	if shoes >= 0: skin_data["Shoes"] = shoes
	if hat >= 0: skin_data["Hat"] = hat
	if glasses >= 0: skin_data["Glasses"] = glasses
	
	set_user_character(skin_data)


## Get the current user character data
func get_user_character() -> Dictionary:
	return _user_character_data


## Refresh the NPC characters with new random appearances
func refresh_showcase_npcs() -> void:
	if _home_showcase:
		_home_showcase.refresh_npcs()
		print("[RNBridge] Showcase NPCs refreshed")
	else:
		push_warning("[RNBridge] HomeCharacterShowcase not active")


## Set the user character's animation
func set_user_character_animation(anim_name: String) -> void:
	if _home_showcase:
		_home_showcase.set_user_animation(anim_name)
	else:
		push_warning("[RNBridge] HomeCharacterShowcase not active")
