extends Node
## Bridge between React Native and Godot
## Handles communication for the focus timer app

signal interact_triggered

var _is_embedded: bool = false

## Joystick input from React Native (normalized -1 to 1)
var joystick_input: Vector2 = Vector2.ZERO

## Callback from React Native for session completion
var _session_complete_callback: Callable

## Callback from React Native when player sits at a study spot
var _player_seated_callback: Callable

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
	
	# Connect to session events
	FocusSessionManager.session_ended.connect(_on_session_ended)


## Register callback from RN for session completion (following born docs pattern)
func set_session_callback(callback: Callable) -> void:
	_session_complete_callback = callback
	print("[RNBridge] Session callback registered")


## Register callback from RN when player sits at a study spot
func set_player_seated_callback(callback: Callable) -> void:
	_player_seated_callback = callback
	print("[RNBridge] Player seated callback registered")


## Called internally when player sits at a study spot
## Notifies RN to show the session setup modal
func on_player_seated_at_spot(spot: Node3D) -> void:
	_current_seated_spot = spot
	print("[RNBridge] Player seated at spot: ", spot.name)
	if _player_seated_callback.is_valid():
		_player_seated_callback.call()
		print("[RNBridge] Player seated callback invoked")
	else:
		print("[RNBridge] No player seated callback registered")


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
