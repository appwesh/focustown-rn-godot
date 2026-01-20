extends Node
## Manages focus/study sessions
## Handles session state, timing, and rewards

signal session_started(spot: Node3D)
signal session_ended(duration_seconds: int, coins_earned: int)
signal session_tick(elapsed_seconds: int)

enum SessionState { IDLE, FOCUSING }

var state: SessionState = SessionState.IDLE
var current_spot: Node3D = null
var session_start_time: int = 0
var elapsed_seconds: int = 0

## Coins per minute of focus
const COINS_PER_MINUTE := 10


func _ready() -> void:
	print("[FocusSession] Manager ready")


func _process(_delta: float) -> void:
	if state == SessionState.FOCUSING:
		var now := Time.get_ticks_msec()
		var new_elapsed := int((now - session_start_time) / 1000)
		if new_elapsed != elapsed_seconds:
			elapsed_seconds = new_elapsed
			session_tick.emit(elapsed_seconds)


func start_session(spot: Node3D) -> void:
	if state == SessionState.FOCUSING:
		return
	
	state = SessionState.FOCUSING
	current_spot = spot
	session_start_time = Time.get_ticks_msec()
	elapsed_seconds = 0
	
	print("[FocusSession] Started at ", spot.name)
	session_started.emit(spot)


func end_session() -> int:
	if state != SessionState.FOCUSING:
		return 0
	
	state = SessionState.IDLE
	var duration := elapsed_seconds
	var coins := calculate_rewards(duration)
	
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


func get_elapsed_seconds() -> int:
	return elapsed_seconds


func get_formatted_time() -> String:
	var mins := elapsed_seconds / 60
	var secs := elapsed_seconds % 60
	return "%02d:%02d" % [mins, secs]
