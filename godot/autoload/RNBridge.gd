extends Node
## Bridge between React Native and Godot
## Handles communication for the focus timer app

signal interact_triggered

var _is_embedded: bool = false

## Joystick input from React Native (normalized -1 to 1)
var joystick_input: Vector2 = Vector2.ZERO

## Callback from React Native for session completion
var _session_complete_callback: Callable


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


## Called when session ends - calls the RN callback
func _on_session_ended(duration_seconds: int, coins_earned: int) -> void:
	print("[RNBridge] Session ended: ", duration_seconds, "s, ", coins_earned, " coins")
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


## End current session from RN (e.g., when app goes to background)
func end_session() -> Dictionary:
	if not FocusSessionManager.is_focusing():
		return {"success": false, "reason": "no_active_session"}
	
	var coins := FocusSessionManager.end_session()
	return {
		"success": true,
		"duration": FocusSessionManager.get_elapsed_seconds(),
		"coins_earned": coins
	}
