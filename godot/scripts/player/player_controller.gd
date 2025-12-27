extends CharacterBody3D
class_name Player

## Movement speed in units per second
@export var move_speed: float = 5.0
## How fast the player rotates to face movement direction
@export var rotation_speed: float = 10.0
## Gravity strength
@export var gravity: float = 20.0

enum State { MOVING, SITTING }

var _state: State = State.MOVING
var _target_rotation: float = 0.0
var _nearby_study_spot: StudySpot = null
var _current_spot: StudySpot = null

# Idle bobbing
var _bob_time: float = 0.0
@export var bob_speed: float = 3.0
@export var bob_amount: float = 0.05
var _base_y: float = 0.0
@onready var _model: Node3D = $Model


func _ready() -> void:
	if _model:
		_base_y = _model.position.y
	
	# Connect to RNBridge interact signal
	RNBridge.interact_triggered.connect(_on_interact)
	
	# Connect to session end to stand up
	FocusSessionManager.session_ended.connect(_on_session_ended)


func _physics_process(delta: float) -> void:
	if _state == State.SITTING:
		# Don't move while sitting
		velocity = Vector3.ZERO
		return
	
	# Idle bobbing animation
	_bob_time += delta * bob_speed
	if _model:
		_model.position.y = _base_y + sin(_bob_time) * bob_amount
	
	# Get input direction
	var input_dir := _get_input_direction()
	
	# Convert to 3D movement (XZ plane)
	var direction := Vector3(input_dir.x, 0, input_dir.y)
	
	# Apply movement
	if direction.length() > 0.1:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed
		
		# Calculate target rotation to face movement direction
		_target_rotation = atan2(direction.x, direction.z)
	else:
		# Decelerate when no input
		velocity.x = move_toward(velocity.x, 0, move_speed * delta * 10)
		velocity.z = move_toward(velocity.z, 0, move_speed * delta * 10)
	
	# Apply gravity
	if not is_on_floor():
		velocity.y -= gravity * delta
	
	# Smoothly rotate towards movement direction
	rotation.y = lerp_angle(rotation.y, _target_rotation, rotation_speed * delta)
	
	move_and_slide()


func _get_input_direction() -> Vector2:
	var input_dir := Vector2.ZERO
	
	# Try RN joystick input first
	var rn_input := RNBridge.get_joystick_input()
	if rn_input.length() > 0.05:
		input_dir = rn_input
	else:
		# Fallback to keyboard input
		input_dir.x = Input.get_axis("move_left", "move_right")
		input_dir.y = Input.get_axis("move_up", "move_down")
	
	if input_dir.length() > 1.0:
		input_dir = input_dir.normalized()
	
	return input_dir


func _on_interact() -> void:
	print("[Player] Interact pressed! State: ", _state, " nearby_spot: ", _nearby_study_spot)
	if _state == State.SITTING:
		# End session when pressing interact while sitting
		print("[Player] Standing up...")
		stand_up()
	elif _nearby_study_spot:
		# Start session at nearby spot
		print("[Player] Interacting with study spot...")
		_nearby_study_spot.interact()
	else:
		print("[Player] No study spot nearby")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_on_interact()
		get_viewport().set_input_as_handled()


func set_nearby_study_spot(spot: StudySpot) -> void:
	_nearby_study_spot = spot


func clear_nearby_study_spot(spot: StudySpot) -> void:
	if _nearby_study_spot == spot:
		_nearby_study_spot = null


func sit_at_spot(spot: StudySpot) -> void:
	_state = State.SITTING
	_current_spot = spot
	
	# Move to sit position
	global_position = spot.get_sit_position()
	rotation.y = spot.get_sit_rotation()
	
	# Stop bobbing
	if _model:
		_model.position.y = _base_y


func stand_up() -> void:
	if _state != State.SITTING:
		return
	
	_state = State.MOVING
	_current_spot = null
	
	# End the session
	FocusSessionManager.end_session()


func _on_session_ended(_duration: int, _coins: int) -> void:
	# Make sure we stand up when session ends
	_state = State.MOVING
	_current_spot = null
