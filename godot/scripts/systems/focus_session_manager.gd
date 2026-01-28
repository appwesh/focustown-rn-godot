extends Node
## Manages focus/study sessions and breaks
## Handles session state, timing, and rewards

signal session_started(spot: Node3D)
signal session_ended(duration_seconds: int, coins_earned: int)
signal session_tick(elapsed_seconds: int)

signal break_started()
signal break_ended(duration_seconds: int)
signal break_tick(elapsed_seconds: int)

enum SessionState { IDLE, FOCUSING, ON_BREAK }

var state: SessionState = SessionState.IDLE
var current_spot: Node3D = null
var session_start_time: int = 0
var elapsed_seconds: int = 0

## Break tracking
var break_start_time: int = 0
var break_elapsed_seconds: int = 0

## Coins per minute of focus
const COINS_PER_MINUTE := 10


func _ready() -> void:
	# Disable processing by default - only enable when session is active
	set_process(false)
	print("[FocusSession] Manager ready")


func _process(_delta: float) -> void:
	# Only called when state != IDLE (processing enabled in start_session/start_break)
	if state == SessionState.FOCUSING:
		var now := Time.get_ticks_msec()
		var new_elapsed := int((now - session_start_time) / 1000)
		if new_elapsed != elapsed_seconds:
			elapsed_seconds = new_elapsed
			session_tick.emit(elapsed_seconds)
	elif state == SessionState.ON_BREAK:
		var now := Time.get_ticks_msec()
		var new_elapsed := int((now - break_start_time) / 1000)
		if new_elapsed != break_elapsed_seconds:
			break_elapsed_seconds = new_elapsed
			break_tick.emit(break_elapsed_seconds)


func start_session(spot: Node3D) -> void:
	if state == SessionState.FOCUSING:
		return
	
	state = SessionState.FOCUSING
	current_spot = spot
	session_start_time = Time.get_ticks_msec()
	elapsed_seconds = 0
	
	# Enable processing for timer updates
	set_process(true)
	
	print("[FocusSession] Started at ", spot.name)
	session_started.emit(spot)


func end_session() -> int:
	if state != SessionState.FOCUSING:
		return 0
	
	state = SessionState.IDLE
	var duration := elapsed_seconds
	var coins := calculate_rewards(duration)
	
	# Disable processing when idle (no timer to update)
	set_process(false)
	
	print("[FocusSession] Ended. Duration: ", duration, "s, Coins: ", coins)
	session_ended.emit(duration, coins)
	
	current_spot = null
	elapsed_seconds = 0
	return coins


func calculate_rewards(duration_seconds: int) -> int:
	# 10 coins per minute, minimum 1 coin if > 10 seconds
	if duration_seconds < 10:
		return 0
	var minutes := duration_seconds / 60.0
	return max(1, int(minutes * COINS_PER_MINUTE))


func is_focusing() -> bool:
	return state == SessionState.FOCUSING


func is_on_break() -> bool:
	return state == SessionState.ON_BREAK


func get_elapsed_seconds() -> int:
	return elapsed_seconds


func get_formatted_time() -> String:
	var mins := elapsed_seconds / 60
	var secs := elapsed_seconds % 60
	return "%02d:%02d" % [mins, secs]


# =============================================================================
# Break Management
# =============================================================================

## Start a break (called after focus session ends)
func start_break() -> void:
	if state == SessionState.FOCUSING:
		return  # Must end session first
	
	state = SessionState.ON_BREAK
	break_start_time = Time.get_ticks_msec()
	break_elapsed_seconds = 0
	
	# Enable processing for break timer
	set_process(true)
	
	print("[FocusSession] Break started")
	break_started.emit()


## End the current break
func end_break() -> int:
	if state != SessionState.ON_BREAK:
		return 0
	
	state = SessionState.IDLE
	var duration := break_elapsed_seconds
	
	# Disable processing when idle
	set_process(false)
	
	print("[FocusSession] Break ended. Duration: ", duration, "s")
	break_ended.emit(duration)
	
	break_elapsed_seconds = 0
	return duration


func get_break_elapsed_seconds() -> int:
	return break_elapsed_seconds


func get_formatted_break_time() -> String:
	var mins := break_elapsed_seconds / 60
	var secs := break_elapsed_seconds % 60
	return "%02d:%02d" % [mins, secs]


## Get current state as string (for RN)
func get_state_name() -> String:
	match state:
		SessionState.IDLE:
			return "idle"
		SessionState.FOCUSING:
			return "focusing"
		SessionState.ON_BREAK:
			return "on_break"
	return "unknown"
