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
	_current_seated_spot = null
	if _session_complete_callback.is_valid():
		_session_complete_callback.call(duration_seconds, coins_earned)
		print("[RNBridge] Callback invoked")
	else:
		print("[RNBridge] No callback registered")


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
		"is_focusing": FocusSessionManager.is_focusing(),
		"elapsed_seconds": FocusSessionManager.get_elapsed_seconds(),
		"formatted_time": FocusSessionManager.get_formatted_time()
	}


## End current session from RN (e.g., timer complete or user stops early)
func end_session() -> Dictionary:
	if not FocusSessionManager.is_focusing():
		return {"success": false, "reason": "no_active_session"}
	
	var duration := FocusSessionManager.get_elapsed_seconds()
	var coins := FocusSessionManager.end_session()
	return {
		"success": true,
		"duration": duration,
		"coins_earned": coins
	}


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
