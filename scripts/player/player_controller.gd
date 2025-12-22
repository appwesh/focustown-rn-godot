extends CharacterBody3D
class_name Player

## Movement speed in units per second
@export var move_speed: float = 5.0
## How fast the player rotates to face movement direction
@export var rotation_speed: float = 10.0
## Gravity strength
@export var gravity: float = 20.0

var _target_rotation: float = 0.0
var _nearby_interactable: Interactable = null
var _interaction_prompt: Control = null

# Idle bobbing
var _bob_time: float = 0.0
@export var bob_speed: float = 3.0
@export var bob_amount: float = 0.05
var _base_y: float = 0.0
@onready var _model: Node3D = $Model


func _ready() -> void:
	# Find interaction prompt in the scene
	_interaction_prompt = get_tree().get_first_node_in_group("interaction_prompt")
	if _model:
		_base_y = _model.position.y


func _physics_process(delta: float) -> void:
	# Idle bobbing animation
	_bob_time += delta * bob_speed
	if _model:
		_model.position.y = _base_y + sin(_bob_time) * bob_amount
	
	# Don't move during dialog
	if DialogManager.is_dialog_active:
		velocity = Vector3.ZERO
		return
	
	# Get input direction
	var input_dir := Vector2.ZERO
	input_dir.x = Input.get_axis("move_left", "move_right")
	input_dir.y = Input.get_axis("move_up", "move_down")
	input_dir = input_dir.normalized()
	
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


func _unhandled_input(event: InputEvent) -> void:
	if DialogManager.is_dialog_active:
		return
	
	if event.is_action_pressed("interact") and _nearby_interactable:
		_nearby_interactable.interact()
		_hide_prompt()
		get_viewport().set_input_as_handled()


func set_nearby_interactable(interactable: Interactable) -> void:
	_nearby_interactable = interactable
	_show_prompt(interactable)


func clear_nearby_interactable(interactable: Interactable) -> void:
	if _nearby_interactable == interactable:
		_nearby_interactable = null
		_hide_prompt()


func _show_prompt(interactable: Interactable) -> void:
	if _interaction_prompt and _interaction_prompt.has_method("show_prompt"):
		var target_node: Node3D = interactable.get_parent()
		_interaction_prompt.show_prompt(target_node, "Press E")


func _hide_prompt() -> void:
	if _interaction_prompt and _interaction_prompt.has_method("hide_prompt"):
		_interaction_prompt.hide_prompt()
